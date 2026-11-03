/**
 * Smart Locket Camera Engine (Mobile + Desktop Zero-FPS-Drop Edition)
 * - Mobile (iOS Safari, Android Chrome, iPadOS):
 *   - 4-tier getUserMedia cascade that preserves `facingMode` ("user" <-> "environment"),
 *     never lets a denied/missing microphone block camera startup, and auto-recovers from
 *     Android/iOS camera HAL switch delays (`NotReadableError`).
 *   - Enforces `playsinline`, `webkit-playsinline`, and `muted` before `play()`.
 * - Desktop / Laptop:
 *   - Defaults to front camera ("user") and filters out Windows 11 Phone Link / Virtual cameras.
 *   - Caps UVC webcam preview at 1280px @ 30fps to prevent USB 2.0 10fps YUY2 fallback.
 * - Hold-to-record video:
 *   - Uses 1080x1080 `{ alpha: false }` canvas + rAF deduplicated by `videoEl.currentTime`
 *     + H.264 Level 4.0 (`avc1.42E028`) hardware encoding at 4.5 Mbps.
 */

export function isMobileCameraDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  // iPadOS 13+ or mobile "Request Desktop Site"
  if (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua)) return true;
  return false;
}

export const IS_MOBILE_CAMERA = isMobileCameraDevice();

export const DEFAULT_FACING_MODE = 'user';
export const TARGET_FPS = 30;
export const RECORD_MAX_SIDE = 1080;
export const OPTIMAL_VIDEO_BPS = 4_500_000;
export const OPTIMAL_AUDIO_BPS = 128_000;

const FPS_CONSTRAINT = { ideal: TARGET_FPS };

const VIRTUAL_OR_PHONE_CAM_RE =
  /phone\s*link|li[êe]n\s*k[ếe]t|link\s*to\s*windows|windows\s*virtual|virtual\s*camera|obs\s*virtual|droidcam|iriun|epoccam|vcam|manycam|snap\s*camera/i;

export function isVirtualOrPhoneCamera(label = '') {
  return VIRTUAL_OR_PHONE_CAM_RE.test(label);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RAW_AUDIO_CONSTRAINTS = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

async function listVideoInputs() {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
  } catch {
    return [];
  }
}

function isPermissionDenied(err) {
  return err?.name === 'NotAllowedError' || err?.name === 'SecurityError' || err?.name === 'PermissionDeniedError';
}

function isHardwareBusy(err) {
  return err?.name === 'NotReadableError' || err?.name === 'TrackStartError' || err?.name === 'AbortError';
}

export const TRANSPARENT_VIDEO_POSTER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Attaches a live MediaStream to a <video> element with full iOS Safari & Android WebView attributes.
 */
export function attachStreamToVideo(videoEl, stream) {
  if (!videoEl) return;
  videoEl.poster = TRANSPARENT_VIDEO_POSTER;
  videoEl.setAttribute('poster', TRANSPARENT_VIDEO_POSTER);
  videoEl.muted = true;
  videoEl.defaultMuted = true;
  videoEl.playsInline = true;
  videoEl.autoplay = true;
  videoEl. controls = false;
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('webkit-playsinline', '');
  videoEl.setAttribute('muted', '');
  videoEl.srcObject = stream;
  if (typeof videoEl.play === 'function') {
    videoEl.play().catch(() => {});
  }
}

export function detachStreamFromVideo(videoEl) {
  if (!videoEl) return;
  try {
    videoEl.poster = TRANSPARENT_VIDEO_POSTER;
    videoEl.setAttribute('poster', TRANSPARENT_VIDEO_POSTER);
    videoEl.pause?.();
    videoEl.srcObject = null;
  } catch {
    // ignore
  }
}

async function requestDesktopStreamWithFallback(videoConstraints) {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: RAW_AUDIO_CONSTRAINTS,
    });
  } catch {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
    } catch (videoOnlyErr) {
      if (isPermissionDenied(videoOnlyErr)) {
        throw videoOnlyErr;
      }
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }
  }
}

async function openMobileCameraStream({ mode, isFlip, idealSize }) {
  if (isFlip) {
    // Allow mobile camera HAL to release previous sensor cleanly before opening the opposite lens
    await delay(65);
  }
  const mobileSize = Math.min(idealSize || 1280, 1280);
  const attempts = [
    // Tier 1: Ideal facingMode + HD size + audio (for hold-to-record video with sound)
    {
      video: {
        facingMode: { ideal: mode },
        width: { ideal: mobileSize },
        height: { ideal: mobileSize },
      },
      audio: RAW_AUDIO_CONSTRAINTS,
      hasAudio: true,
    },
    // Tier 2: Video-only with ideal size (succeeds even when microphone permission is denied!)
    {
      video: {
        facingMode: { ideal: mode },
        width: { ideal: mobileSize },
        height: { ideal: mobileSize },
      },
      audio: false,
      hasAudio: false,
    },
    // Tier 3: Pure facingMode without resolution constraints (for strict mobile camera drivers)
    {
      video: { facingMode: mode },
      audio: false,
      hasAudio: false,
    },
    // Tier 4: Any available camera sensor
    {
      video: true,
      audio: false,
      hasAudio: false,
    },
  ];

  let lastErr = null;
  for (const attempt of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: attempt.video,
        audio: attempt.audio,
      });
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings?.() || {};
      const effectiveMode =
        settings.facingMode === 'environment'
          ? 'environment'
          : settings.facingMode === 'user'
            ? 'user'
            : mode;
      return {
        stream,
        deviceId: settings.deviceId || null,
        effectiveMode,
      };
    } catch (err) {
      lastErr = err;
      // If a video-only request was explicitly denied by the user, stop immediately
      if (!attempt.hasAudio && isPermissionDenied(err)) {
        throw err;
      }
      // If Android/iOS camera HAL is still releasing previous camera, pause briefly before next tier
      if (isHardwareBusy(err)) {
        await delay(160);
      }
    }
  }
  throw lastErr || new Error('Không mở được camera trên thiết bị này');
}

export async function openLocketCameraStream({
  mode = DEFAULT_FACING_MODE,
  isFlip = false,
  idealSize = 1280,
  currentDeviceId = null,
}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error('Camera requires HTTPS secure context');
    err.name = 'InsecureContextError';
    throw err;
  }

  // Branch 1: Mobile / Tablet devices use 4-tier native front/rear facingMode cascade
  if (isMobileCameraDevice()) {
    return await openMobileCameraStream({ mode, isFlip, idealSize });
  }

  // Branch 2: Desktop / Laptop smart physical webcam selection (capped at 1280 for locked 30fps UVC)
  const desktopSize = Math.min(idealSize || 1280, 1280);
  const inputs = await listVideoInputs();
  const hasLabels = inputs.some((d) => Boolean(d.label));
  const physicalCams = inputs.filter((d) => d.label && !isVirtualOrPhoneCamera(d.label));
  const candidatePool = physicalCams.length > 0 ? physicalCams : inputs;

  let chosenDeviceId = null;
  let effectiveMode = mode;

  if (hasLabels && candidatePool.length > 0) {
    if (isFlip && candidatePool.length > 1) {
      const currentIdx = candidatePool.findIndex((d) => d.deviceId === currentDeviceId);
      const nextCam = candidatePool[(currentIdx + 1) % candidatePool.length];
      chosenDeviceId = nextCam.deviceId;
      effectiveMode = /back|rear|environment|world/i.test(nextCam.label || '') ? 'environment' : mode;
    } else {
      const kept = candidatePool.find((d) => d.deviceId === currentDeviceId) || candidatePool[0];
      chosenDeviceId = kept.deviceId;
      effectiveMode = mode;
    }
  }

  const desktopVideo = chosenDeviceId
    ? {
        deviceId: { exact: chosenDeviceId },
        width: { ideal: desktopSize },
        height: { ideal: desktopSize },
        frameRate: FPS_CONSTRAINT,
      }
    : {
        facingMode: { ideal: 'user' },
        width: { ideal: desktopSize },
        height: { ideal: desktopSize },
        frameRate: FPS_CONSTRAINT,
      };

  let stream = await requestDesktopStreamWithFallback(desktopVideo);
  let track = stream.getVideoTracks()[0];

  // Post-permission guard: swap away from Windows Phone Link / Virtual camera if selected first
  if (track && isVirtualOrPhoneCamera(track.label || '')) {
    const freshInputs = await listVideoInputs();
    const realCam = freshInputs.find((d) => !isVirtualOrPhoneCamera(d.label || ''));
    if (realCam) {
      stream.getTracks().forEach((t) => t.stop());
      stream = await requestDesktopStreamWithFallback({
        deviceId: { exact: realCam.deviceId },
        width: { ideal: desktopSize },
        height: { ideal: desktopSize },
        frameRate: FPS_CONSTRAINT,
      });
      track = stream.getVideoTracks()[0];
      chosenDeviceId = realCam.deviceId;
    }
  }

  return {
    stream,
    deviceId: track?.getSettings?.()?.deviceId || chosenDeviceId || null,
    effectiveMode,
  };
}

function isLiveVideoReady(videoEl) {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth || !videoEl.videoHeight) {
    return false;
  }
  const stream = videoEl.srcObject;
  if (stream && typeof stream.getVideoTracks === 'function') {
    const tracks = stream.getVideoTracks();
    if (tracks.length > 0 && !tracks.some((t) => t.readyState === 'live')) {
      return false;
    }
  }
  return true;
}

function hasNonBlackPixels(ctx, side) {
  if (!ctx || side <= 0) return false;
  try {
    const pts = [
      [side >> 1, side >> 1],
      [side >> 2, side >> 2],
      [(side * 3) >> 2, side >> 2],
      [side >> 2, (side * 3) >> 2],
      [(side * 3) >> 2, (side * 3) >> 2],
    ];
    for (const [px, py] of pts) {
      const data = ctx.getImageData(px, py, 1, 1).data;
      if (data[0] > 0 || data[1] > 0 || data[2] > 0) {
        return true;
      }
    }
    return false;
  } catch {
    return true;
  }
}

function clampZoomFactor(zoom) {
  const z = Number(zoom);
  if (!Number.isFinite(z) || z <= 1) return 1;
  return Math.min(5, Math.max(1, z));
}

function drawSourceSquareToCanvas(canvas, source, srcW, srcH, mirror = false, zoom = 1) {
  const side = Math.min(srcW, srcH);
  const z = clampZoomFactor(zoom);
  const cropSide = side / z;
  const sx = (srcW - cropSide) / 2;
  const sy = (srcH - cropSide) / 2;
  if (canvas.width !== side || canvas.height !== side) {
    canvas.width = side;
    canvas.height = side;
  }
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (mirror) {
    ctx.translate(side, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, cropSide, cropSide, 0, 0, side, side);
  ctx.restore();
  return ctx;
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(parts[1] || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Captures the exact 1:1 center-cropped square visible inside the Locket viewfinder,
 * mirroring horizontally when shooting in selfie ("user") mode, applying zoom (1x-5x),
 * and flushing GPU readback immediately while the camera MediaStreamTrack is still live.
 */
export function drawSquareFrameToCanvas(videoEl, mirror = false, zoom = 1) {
  if (!isLiveVideoReady(videoEl)) return null;
  const canvas = document.createElement('canvas');
  const ctx = drawSourceSquareToCanvas(
    canvas,
    videoEl,
    videoEl.videoWidth,
    videoEl.videoHeight,
    mirror,
    zoom
  );
  // Touch 1x1 pixel to force immediate GPU VideoFrame -> 2D Canvas rasterization flush
  hasNonBlackPixels(ctx, canvas.width);
  return canvas;
}

/**
 * Mobile-safe async single-shot 1:1 JPEG capture:
 * 1. Verifies the camera video track is live (`readyState === 'live'`).
 * 2. Draws and synchronously flushes the GPU VideoFrame into an RGBA 2D canvas BEFORE stopping tracks.
 * 3. Falls back to `createImageBitmap(videoEl)` / `ImageCapture.grabFrame()` / 1-frame warmup wait
 *    if a mobile hardware decoder produced an unlatched black frame on direct `drawImage(videoEl)`.
 * 4. Completes `toBlob('image/jpeg')` while the camera stream is still active so zero-copy mobile
 *    video buffers are never invalidated mid-encode.
 */
export async function captureSquarePhotoBlob(
  videoEl,
  { mirror = false, quality = 0.92, zoom = 1 } = {}
) {
  if (!isLiveVideoReady(videoEl)) return null;

  const canvas = document.createElement('canvas');
  let ctx = drawSourceSquareToCanvas(
    canvas,
    videoEl,
    videoEl.videoWidth,
    videoEl.videoHeight,
    mirror,
    zoom
  );

  // Fallback Tier A: `createImageBitmap(videoEl)` for mobile zero-copy decoders that miss direct 2D drawImage
  if (!hasNonBlackPixels(ctx, canvas.width) && typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(videoEl);
      ctx = drawSourceSquareToCanvas(canvas, bmp, bmp.width, bmp.height, mirror, zoom);
      bmp.close?.();
    } catch {
      // continue to next tier
    }
  }

  // Fallback Tier B: `ImageCapture.grabFrame()` on the active video track
  if (!hasNonBlackPixels(ctx, canvas.width) && typeof ImageCapture === 'function') {
    try {
      const track = videoEl.srcObject?.getVideoTracks?.()?.[0];
      if (track && track.readyState === 'live') {
        const ic = new ImageCapture(track);
        const frameBmp = await ic.grabFrame();
        ctx = drawSourceSquareToCanvas(
          canvas,
          frameBmp,
          frameBmp.width,
          frameBmp.height,
          mirror,
          zoom
        );
        frameBmp.close?.();
      }
    } catch {
      // continue to next tier
    }
  }

  // Fallback Tier C: Wait one decoded camera frame (~45ms) if sensor just opened
  if (!hasNonBlackPixels(ctx, canvas.width) && isLiveVideoReady(videoEl)) {
    await delay(45);
    if (isLiveVideoReady(videoEl)) {
      ctx = drawSourceSquareToCanvas(
        canvas,
        videoEl,
        videoEl.videoWidth,
        videoEl.videoHeight,
        mirror,
        zoom
      );
      hasNonBlackPixels(ctx, canvas.width);
    }
  }

  let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) {
    try {
      blob = dataUrlToBlob(canvas.toDataURL('image/jpeg', quality));
    } catch {
      blob = null;
    }
  }

  canvas.width = 0;
  canvas.height = 0;
  if (!blob || blob.size === 0) return null;
  return new File([blob], 'locket-photo.jpg', { type: 'image/jpeg' });
}

export function pickOptimalRecorderOptions(stream) {
  const hasAudio = Boolean(stream?.getAudioTracks?.().length);
  const candidates = hasAudio
    ? [
        'video/mp4;codecs=avc1.42E028,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ]
    : [
        'video/mp4;codecs=avc1.42E028',
        'video/mp4',
        'video/webm;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];

  const mimeType =
    (typeof MediaRecorder !== 'undefined' &&
      candidates.find((m) => MediaRecorder.isTypeSupported(m))) ||
    '';

  return {
    mimeType,
    options: {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: OPTIMAL_VIDEO_BPS,
      ...(hasAudio ? { audioBitsPerSecond: OPTIMAL_AUDIO_BPS } : {}),
    },
  };
}

export function createMirroredSquareVideoTrack(
  sourceEl,
  { mirror = true, maxSide = RECORD_MAX_SIDE, fps = TARGET_FPS, zoomGetter = null } = {}
) {
  const vw0 = sourceEl?.videoWidth || sourceEl?.width || 0;
  const vh0 = sourceEl?.videoHeight || sourceEl?.height || 0;
  if (!vw0 || !vh0) return null;

  const outSide = Math.min(Math.min(vw0, vh0), maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = outSide;
  canvas.height = outSide;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  if (mirror) {
    ctx.setTransform(-1, 0, 0, 1, outSide, 0);
  }

  const [finalTrack] = canvas.captureStream(fps).getVideoTracks();
  const maxGapMs = Math.max(40, Math.round(1000 / fps) + 6);
  let handle = 0;
  let active = true;
  let lastVideoTime = -1;
  let lastDrawAt = 0;
  const stats = {
    frames: 0,
    startedAt: performance.now(),
    outSide,
    mirror,
    mode: 'raf-dedup',
  };

  const draw = (now) => {
    const vw = sourceEl.videoWidth || sourceEl.width || 0;
    const vh = sourceEl.videoHeight || sourceEl.height || 0;
    if (!vw || !vh) return;
    const side = Math.min(vw, vh);
    const z = clampZoomFactor(typeof zoomGetter === 'function' ? zoomGetter() : 1);
    const cropSide = side / z;
    const sx = (vw - cropSide) / 2;
    const sy = (vh - cropSide) / 2;
    ctx.drawImage(sourceEl, sx, sy, cropSide, cropSide, 0, 0, outSide, outSide);
    if (typeof sourceEl.currentTime === 'number') {
      lastVideoTime = sourceEl.currentTime;
    }
    lastDrawAt = now;
    stats.frames += 1;
  };

  const pump = (now) => {
    if (!active) return;
    const t = typeof now === 'number' ? now : performance.now();
    const isVideo = typeof sourceEl.currentTime === 'number';
    const curTime = isVideo ? sourceEl.currentTime : -1;
    if (!isVideo || curTime !== lastVideoTime || t - lastDrawAt >= maxGapMs) {
      draw(t);
    }
    handle = requestAnimationFrame(pump);
  };
  draw(performance.now());
  handle = requestAnimationFrame(pump);

  const getStats = () => {
    const seconds = (performance.now() - stats.startedAt) / 1000;
    return { ...stats, seconds, fps: seconds > 0 ? stats.frames / seconds : 0 };
  };
  if (typeof window !== 'undefined') window.__locketRecStats = getStats;

  return {
    track: finalTrack,
    getStats,
    stop: () => {
      active = false;
      cancelAnimationFrame(handle);
      finalTrack.stop();
    },
  };
}
