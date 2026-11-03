/**
 * Dedicated Off-Main-Thread MediaPipe AI Web Worker (`beautyAiWorker.js`)
 * Runs 100% of WASM compilation, TFLite XNNPACK / OffscreenCanvas WebGL inference,
 * FaceLandmarker (478 landmarks), ImageSegmenter (person mask), and temporal EMA smoothing
 * on a separate OS CPU thread so the UI Main Thread stays at a locked 60 FPS with 0ms freeze.
 */

// Ensure MediaPipe's internal `Bh(url)` loader reliably falls through to `self.import(url)`
// across Blink, WebKit (iOS Safari), and Gecko inside an ES Module Web Worker.
let cachedWasmModuleFactory = null;

self.importScripts = () => {
  throw new TypeError('ES Module Worker delegates WASM script loading to self.import');
};

self.import = async (scriptUrl) => {
  if (cachedWasmModuleFactory) {
    self.ModuleFactory = cachedWasmModuleFactory;
    return;
  }
  const resolvedUrl =
    typeof scriptUrl === 'string' && scriptUrl.startsWith('/')
      ? `${self.location.origin}${scriptUrl}`
      : String(scriptUrl);
  const resp = await fetch(resolvedUrl);
  if (!resp.ok) {
    throw new Error(`Không tải được bộ khởi chạy AI WASM (${resp.status})`);
  }
  const code = await resp.text();
  const mod = { exports: {} };
  const evaluator = new Function(
    'module',
    'exports',
    'self',
    `${code}\n;return typeof ModuleFactory !== 'undefined' ? ModuleFactory : module.exports;`
  );
  const factory = evaluator(mod, mod.exports, self);
  if (typeof factory !== 'function') {
    throw new Error('Không khởi tạo được ModuleFactory cho MediaPipe WASM');
  }
  cachedWasmModuleFactory = factory;
  self.ModuleFactory = factory;
};

import { getMediaPipeVision } from '../vendor/mediapipeTasksVision.js';

const MODEL_SPECS = {
  face: {
    path: '/mediapipe/models/face_landmarker.task',
    bytes: 3758596,
  },
  seg: {
    path: '/mediapipe/models/selfie_segmenter.tflite',
    bytes: 249537,
  },
};

const detectors = {
  face: null,
  seg: null,
};
const loadPromises = {
  face: null,
  seg: null,
};

let filesetPromise = null;
let initMutex = Promise.resolve();
let lastWorkerTs = 0;

function nextWorkerTimestamp(jumpMs = 2) {
  const now = Math.floor(performance.now());
  lastWorkerTs = Math.max(lastWorkerTs + Math.max(1, Math.floor(jumpMs)), now);
  return lastWorkerTs;
}

let softBuf = null;
let softW = 0;
let softH = 0;
let softFresh = true;

const workerCanvasPool = new Map();

function downscaleInWorker(bitmap, targetMaxSide, key = 'default') {
  const sw = bitmap?.width || 0;
  const sh = bitmap?.height || 0;
  if (!sw || !sh) return null;
  if (Math.max(sw, sh) <= targetMaxSide) return bitmap;

  const scale = Math.min(1, targetMaxSide / Math.max(sw, sh));
  const dw = Math.max(32, Math.round(sw * scale) & ~1);
  const dh = Math.max(32, Math.round(sh * scale) & ~1);

  let entry = workerCanvasPool.get(key);
  if (!entry) {
    const canvas = new OffscreenCanvas(dw, dh);
    const ctx = canvas.getContext('2d', { alpha: false });
    entry = { canvas, ctx };
    workerCanvasPool.set(key, entry);
  }
  if (entry.canvas.width !== dw) entry.canvas.width = dw;
  if (entry.canvas.height !== dh) entry.canvas.height = dh;

  entry.ctx.imageSmoothingEnabled = true;
  entry.ctx.imageSmoothingQuality = 'low';
  entry.ctx.drawImage(bitmap, 0, 0, dw, dh);
  return entry.canvas;
}

function resetTemporalMask() {
  softFresh = true;
}

function extractMaskOutput(confidenceMask, useTemporal) {
  const raw = confidenceMask.getAsFloat32Array();
  const w = confidenceMask.width;
  const h = confidenceMask.height;
  const len = raw.length;
  const out = new Uint8Array(len);

  if (!useTemporal) {
    for (let i = 0; i < len; i++) {
      out[i] = (raw[i] * 255 + 0.5) | 0;
    }
    return { width: w, height: h, data: out };
  }

  if (!softBuf || softW !== w || softH !== h || softBuf.length !== len) {
    softBuf = new Float32Array(len);
    softW = w;
    softH = h;
    softFresh = true;
  }

  if (softFresh) {
    for (let i = 0; i < len; i++) {
      const v = raw[i];
      softBuf[i] = v;
      out[i] = (v * 255 + 0.5) | 0;
    }
    softFresh = false;
  } else {
    const alpha = 0.58;
    for (let i = 0; i < len; i++) {
      const s = softBuf[i] + (raw[i] - softBuf[i]) * alpha;
      softBuf[i] = s;
      out[i] = (s * 255 + 0.5) | 0;
    }
  }

  return { width: w, height: h, data: out };
}

function compactLandmarks(faceLandmarks) {
  if (!Array.isArray(faceLandmarks) || !faceLandmarks.length) return [];
  return faceLandmarks.map((face) =>
    face.map((pt) => ({
      x: pt.x,
      y: pt.y,
      z: pt.z || 0,
    }))
  );
}

async function fetchModelWithProgress(kind) {
  const spec = MODEL_SPECS[kind];
  const url = `${self.location.origin}${spec.path}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Không tải được mô hình (${resp.status})`);
  }
  const total = Number(resp.headers.get('content-length')) || spec.bytes;
  if (!resp.body || !resp.body.getReader) {
    const buf = new Uint8Array(await resp.arrayBuffer());
    self.postMessage({ type: 'progress', kind, loaded: buf.length, total: buf.length });
    return buf;
  }

  const reader = resp.body.getReader();
  const chunks = [];
  let loaded = 0;
  let lastProgressPost = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    const now = performance.now();
    if (now - lastProgressPost >= 45 || loaded >= total) {
      lastProgressPost = now;
      self.postMessage({ type: 'progress', kind, loaded, total });
    }
  }

  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function serializeInit(fn) {
  const next = initMutex.then(fn, fn);
  initMutex = next.catch(() => {});
  return next;
}

async function createDetectorWithFallback(TaskClass, fileset, modelBuffer, options) {
  return serializeInit(async () => {
    try {
      return await TaskClass.createFromOptions(fileset, {
        ...options,
        baseOptions: {
          modelAssetBuffer: modelBuffer,
          delegate: 'GPU',
        },
      });
    } catch {
      return await TaskClass.createFromOptions(fileset, {
        ...options,
        baseOptions: {
          modelAssetBuffer: modelBuffer,
          delegate: 'CPU',
        },
      });
    }
  });
}

function ensureDetector(kind, maxFaces = 1) {
  if (detectors[kind]) return Promise.resolve(detectors[kind]);
  if (loadPromises[kind]) return loadPromises[kind];

  loadPromises[kind] = (async () => {
    const vision = getMediaPipeVision();
    const wasmBase = `${self.location.origin}/mediapipe/wasm`;

    const [fileset, modelBuffer] = await Promise.all([
      (filesetPromise ||= vision.FilesetResolver.forVisionTasks(wasmBase).catch((err) => {
        filesetPromise = null;
        throw err;
      })),
      fetchModelWithProgress(kind),
    ]);

    const instance =
      kind === 'face'
        ? await createDetectorWithFallback(vision.FaceLandmarker, fileset, modelBuffer, {
            runningMode: 'VIDEO',
            numFaces: Math.max(1, maxFaces | 0),
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          })
        : await createDetectorWithFallback(vision.ImageSegmenter, fileset, modelBuffer, {
            runningMode: 'VIDEO',
            outputCategoryMask: false,
            outputConfidenceMasks: true,
          });

    detectors[kind] = instance;
    return instance;
  })().catch((err) => {
    loadPromises[kind] = null;
    throw err;
  });

  return loadPromises[kind];
}

self.addEventListener('message', async (ev) => {
  const msg = ev.data || {};
  const { id, type } = msg;

  if (type === 'resetLiveMask') {
    resetTemporalMask();
    return;
  }

  try {
    if (type === 'load') {
      await ensureDetector(msg.kind, msg.maxFaces || 1);
      self.postMessage({ id, ok: true, kind: msg.kind });
      return;
    }

    if (type === 'detectLive') {
      const { bitmap, runFace, runSeg, targetSide = 256 } = msg;
      try {
        let faces = null;
        let seg = null;
        let ranFace = false;
        let ranSeg = false;
        const transfer = [];
        const inputSource = bitmap ? downscaleInWorker(bitmap, targetSide, 'live') : null;

        if (runFace && detectors.face && inputSource) {
          const det = detectors.face.detectForVideo(inputSource, nextWorkerTimestamp(2));
          faces = compactLandmarks(det?.faceLandmarks);
          ranFace = true;
        }

        if (runSeg && detectors.seg && inputSource) {
          detectors.seg.segmentForVideo(inputSource, nextWorkerTimestamp(2), (res) => {
            const cm = res?.confidenceMasks?.[0];
            if (cm) {
              seg = extractMaskOutput(cm, true);
              ranSeg = true;
            }
          });
          if (seg?.data?.buffer) {
            transfer.push(seg.data.buffer);
          }
        }

        self.postMessage({ id, ok: true, faces, seg, ranFace, ranSeg }, transfer);
      } finally {
        try {
          bitmap?.close?.();
        } catch {
          // ignore close errors
        }
      }
      return;
    }

    if (type === 'detectStill') {
      const { bitmap, kind, targetSide = 512 } = msg;
      try {
        await ensureDetector(kind, msg.maxFaces || 1);
        let faces = null;
        let seg = null;
        const transfer = [];
        const inputSource = bitmap ? downscaleInWorker(bitmap, targetSide, `still-${kind}`) : null;

        if (kind === 'face' && detectors.face && inputSource) {
          let det = detectors.face.detectForVideo(inputSource, nextWorkerTimestamp(1500));
          if (!det?.faceLandmarks?.length) {
            det = detectors.face.detectForVideo(inputSource, nextWorkerTimestamp(60));
          }
          faces = compactLandmarks(det?.faceLandmarks);
        } else if (kind === 'seg' && detectors.seg && inputSource) {
          detectors.seg.segmentForVideo(inputSource, nextWorkerTimestamp(1500), (res) => {
            const cm = res?.confidenceMasks?.[0];
            if (cm) {
              seg = extractMaskOutput(cm, false);
            }
          });
          if (seg?.data?.buffer) {
            transfer.push(seg.data.buffer);
          }
        }

        self.postMessage({ id, ok: true, faces, seg }, transfer);
      } finally {
        try {
          bitmap?.close?.();
        } catch {
          // ignore close errors
        }
      }
      return;
    }

    if (id) {
      self.postMessage({ id, ok: false, error: `Unknown worker command: ${type}` });
    }
  } catch (err) {
    if (id) {
      self.postMessage({
        id,
        ok: false,
        error: err?.message || String(err),
      });
    }
  }
});
