/**
 * Depth Text Engine ("Chèn chữ sau chủ thể" — Text Behind Subject)
 *
 * 3-Layer High-Speed Compositor:
 *   Layer 1: Original Photo (+ optional background dim / subtle blur behind subject)
 *   Layer 2: Bold Customizable Typography (font, gradient/color, stroke, shadow, rotation, spacing)
 *   Layer 3: Cached AI-Segmented Foreground Subject Cutout (alpha-matted via MediaPipe Selfie Segmenter)
 *
 * Performance Architecture:
 * - Uses off-main-thread `beautyAiWorker.js` (`selfie_segmenter.tflite`, ~250KB, cached permanently)
 *   with automatic main-thread `ImageSegmenter` fallback if OffscreenCanvas is unsupported.
 * - Pre-bakes the foreground alpha cutout canvas ONLY when segmentation settings (`threshold`, `feather`,
 *   `edgeShift`, `invert`) change — so dragging, scaling, recoloring, or typing text runs at 60fps (<2ms/frame).
 */

import {
  isBeautyWorkerSupported,
  loadBeautyModelInWorker,
  detectStillInWorker,
} from './beautyOptimizer.js';

export const DEPTH_TEXT_FONTS = [
  {
    id: 'impact',
    name: 'TOGETHER',
    family: '"Anton", Impact, "Arial Black", sans-serif',
    weight: 900,
    scaleX: 0.92,
  },
  {
    id: 'bebas',
    name: 'Poster',
    family: '"Bebas Neue", Impact, "Arial Narrow", sans-serif',
    weight: 800,
    scaleX: 1.0,
  },
  {
    id: 'modern',
    name: 'Hiện đại',
    family: 'Inter, system-ui, -apple-system, sans-serif',
    weight: 900,
    scaleX: 1.0,
  },
  {
    id: 'serif',
    name: 'Tạp chí',
    family: '"Playfair Display", Georgia, serif',
    weight: 700,
    italic: true,
    scaleX: 1.0,
  },
  {
    id: 'script',
    name: 'Viết tay',
    family: '"Dancing Script", cursive',
    weight: 700,
    scaleX: 1.0,
  },
  {
    id: 'mono',
    name: 'Máy chữ',
    family: '"Courier New", Courier, monospace',
    weight: 800,
    scaleX: 1.0,
  },
];

export const DEPTH_TEXT_SWATCHES = [
  { id: 'white', label: 'Trắng', type: 'solid', color: '#ffffff' },
  { id: 'cream', label: 'Kem ấm', type: 'solid', color: '#fff3d6' },
  { id: 'gold', label: 'Vàng', type: 'gradient', colors: ['#fff3b0', '#f6c453', '#e08b2c'] },
  { id: 'sunset', label: 'Hoàng hôn', type: 'gradient', colors: ['#ffdf7e', '#ff7b7b', '#d9468f'] },
  { id: 'sakura', label: 'Y2K Hồng', type: 'gradient', colors: ['#ffffff', '#ffb8dc', '#ff62ad'] },
  { id: 'cyber', label: 'Neon', type: 'gradient', colors: ['#5cf8ff', '#a78bfa', '#ff4dd2'] },
  { id: 'ocean', label: 'Biển xanh', type: 'gradient', colors: ['#e0ffff', '#56d1f7', '#2563eb'] },
  { id: 'chrome', label: 'Bạc Chrome', type: 'gradient', colors: ['#ffffff', '#cbd5e1', '#64748b'] },
  { id: 'lime', label: 'Chanh', type: 'solid', color: '#d9f99d' },
  { id: 'crimson', label: 'Đỏ rượu', type: 'solid', color: '#ff4d5a' },
  { id: 'black', label: 'Đen', type: 'solid', color: '#111111' },
];

export const DEPTH_TEXT_PRESETS = [
  {
    id: 'together',
    name: 'TOGETHER',
    patch: {
      text: 'TOGETHER',
      fontId: 'impact',
      fontSize: 0.25,
      x: 0.5,
      y: 0.36,
      rotation: 0,
      letterSpacing: 0.02,
      swatchId: 'white',
      customColor: '#ffffff',
      opacity: 0.96,
      strokeWidth: 0,
      shadowBlur: 0.25,
      uppercase: true,
      bgDim: 0.08,
    },
  },
  {
    id: 'sunset',
    name: 'Hoàng hôn',
    patch: {
      text: 'GOLDEN\nHOUR',
      fontId: 'bebas',
      fontSize: 0.24,
      x: 0.5,
      y: 0.34,
      rotation: 0,
      letterSpacing: 0.05,
      swatchId: 'sunset',
      opacity: 0.95,
      strokeWidth: 0,
      shadowBlur: 0.35,
      uppercase: true,
      bgDim: 0.14,
    },
  },
  {
    id: 'vogue',
    name: 'Tạp chí',
    patch: {
      text: 'VOGUE',
      fontId: 'serif',
      fontSize: 0.26,
      x: 0.5,
      y: 0.24,
      rotation: 0,
      letterSpacing: 0.08,
      swatchId: 'cream',
      opacity: 0.94,
      strokeWidth: 0,
      shadowBlur: 0.2,
      uppercase: true,
      bgDim: 0.06,
    },
  },
  {
    id: 'neon',
    name: 'Neon Viền',
    patch: {
      text: 'VIBES',
      fontId: 'modern',
      fontSize: 0.27,
      x: 0.5,
      y: 0.42,
      rotation: -4,
      letterSpacing: 0.04,
      swatchId: 'cyber',
      opacity: 0.98,
      strokeWidth: 0.028,
      strokeColor: '#ffffff',
      shadowBlur: 0.55,
      uppercase: true,
      bgDim: 0.22,
    },
  },
  {
    id: 'y2k',
    name: 'Y2K Hồng',
    patch: {
      text: 'Dreamy',
      fontId: 'script',
      fontSize: 0.27,
      x: 0.5,
      y: 0.33,
      rotation: -6,
      letterSpacing: 0.01,
      swatchId: 'sakura',
      opacity: 0.96,
      strokeWidth: 0.018,
      strokeColor: '#ffffff',
      shadowBlur: 0.32,
      uppercase: false,
      bgDim: 0.05,
    },
  },
  {
    id: 'outline',
    name: 'Chữ Rỗng',
    patch: {
      text: 'MOMENT',
      fontId: 'impact',
      fontSize: 0.25,
      x: 0.5,
      y: 0.38,
      rotation: 0,
      letterSpacing: 0.04,
      swatchId: 'white',
      opacity: 0.92,
      hollow: true,
      strokeWidth: 0.032,
      strokeColor: '#ffffff',
      shadowBlur: 0.22,
      uppercase: true,
      bgDim: 0.1,
    },
  },
];

export const DEFAULT_DEPTH_TEXT_CONFIG = {
  text: 'TOGETHER',
  fontId: 'impact',
  fontSize: 0.25,
  x: 0.5,
  y: 0.36,
  rotation: 0,
  letterSpacing: 0.02,
  lineHeight: 0.94,
  swatchId: 'white',
  customColor: '',
  opacity: 0.96,
  hollow: false,
  strokeWidth: 0,
  strokeColor: '#111111',
  shadowBlur: 0.25,
  uppercase: true,
  behindSubject: true,
  threshold: 0.48,
  feather: 0.12,
  edgeShift: 0,
  invertMask: false,
  bgDim: 0.08,
  bgBlur: 0,
};

let fallbackSegmenterPromise = null;

async function segmentOnMainThreadFallback(imageSource, onProgress) {
  if (!fallbackSegmenterPromise) {
    fallbackSegmenterPromise = (async () => {
      onProgress?.(15, 'Đang tải AI tách chủ thể...');
      const { getMediaPipeVision } = await import('../vendor/mediapipeTasksVision.js');
      const vision = await getMediaPipeVision();
      const fileset = await vision.FilesetResolver.forVisionTasks('/mediapipe/wasm');
      onProgress?.(60, 'Khởi tạo mô hình tách nền...');
      const opts = {
        baseOptions: {
          modelAssetPath: '/mediapipe/models/selfie_segmenter.tflite',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      };
      try {
        return await vision.ImageSegmenter.createFromOptions(fileset, opts);
      } catch {
        opts.baseOptions.delegate = 'CPU';
        return await vision.ImageSegmenter.createFromOptions(fileset, opts);
      }
    })().catch((err) => {
      fallbackSegmenterPromise = null;
      throw err;
    });
  }
  const seg = await fallbackSegmenterPromise;
  onProgress?.(85, 'Đang phân tích chủ thể...');
  const maxSide = 384;
  const sw = imageSource.naturalWidth || imageSource.width || 512;
  const sh = imageSource.naturalHeight || imageSource.height || 512;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const dw = Math.max(64, Math.round(sw * scale));
  const dh = Math.max(64, Math.round(sh * scale));
  const c = document.createElement('canvas');
  c.width = dw;
  c.height = dh;
  c.getContext('2d').drawImage(imageSource, 0, 0, dw, dh);

  return new Promise((resolve, reject) => {
    try {
      seg.segment(c, (res) => {
        const cm = res?.confidenceMasks?.[0];
        if (!cm) {
          reject(new Error('Không nhận diện được chủ thể trong ảnh'));
          return;
        }
        const raw = cm.getAsFloat32Array();
        const data = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          data[i] = (Math.max(0, Math.min(1, raw[i])) * 255 + 0.5) | 0;
        }
        onProgress?.(100, 'Đã tách chủ thể');
        resolve({ width: cm.width, height: cm.height, data });
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Runs on-device MediaPipe Selfie Segmenter on a still image (square or rectangular).
 * Returns `{ width, height, data: Uint8Array }` confidence mask (0..255).
 */
export async function segmentSubjectMask(imageSource, onProgress) {
  if (!imageSource) throw new Error('Không có ảnh đầu vào');

  // Prefer the dedicated background Worker so UI stays silky smooth
  if (isBeautyWorkerSupported()) {
    try {
      onProgress?.(18, 'Đang tải AI tách chủ thể...');
      await loadBeautyModelInWorker('seg', (pct) => {
        onProgress?.(Math.min(72, Math.max(20, Math.round(pct * 0.72))), 'Đang tải mô hình AI...');
      });
      onProgress?.(82, 'Đang tách chủ thể...');
      const res = await detectStillInWorker(imageSource, 'seg');
      if (res?.seg?.data && res.seg.width && res.seg.height) {
        onProgress?.(100, 'Đã tách chủ thể');
        return res.seg;
      }
    } catch {
      // Fall through cleanly to main-thread fallback
    }
  }

  return segmentOnMainThreadFallback(imageSource, onProgress);
}

/**
 * Applies a lightweight separable 3x3 box blur to the confidence mask to remove pixel staircases.
 */
function smoothMaskData(src, w, h) {
  const tmp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);
  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const l = x > 0 ? src[row + x - 1] : src[row + x];
      const c = src[row + x];
      const r = x + 1 < w ? src[row + x + 1] : src[row + x];
      tmp[row + x] = ((l + c * 2 + r) >> 2);
    }
  }
  // Vertical pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    const up = y > 0 ? (y - 1) * w : row;
    const dn = y + 1 < h ? (y + 1) * w : row;
    for (let x = 0; x < w; x++) {
      out[row + x] = ((tmp[up + x] + tmp[row + x] * 2 + tmp[dn + x]) >> 2);
    }
  }
  return out;
}

/**
 * Builds a pre-matted square RGBA cutout canvas of ONLY the foreground subject.
 * Cached and rebuilt only when mask tuning controls change.
 */
export function buildForegroundCutoutCanvas(imageSource, mask, opts = {}, outSize = 720) {
  if (!imageSource || !mask?.data) return null;

  const threshold = Number.isFinite(opts.threshold) ? opts.threshold : 0.48;
  const feather = Math.max(0.015, Number.isFinite(opts.feather) ? opts.feather : 0.12);
  const edgeShift = Number.isFinite(opts.edgeShift) ? opts.edgeShift : 0;
  const invert = Boolean(opts.invertMask);

  // 1. Build alpha mask canvas at mask native resolution with smoothstep edge matting
  const mw = mask.width;
  const mh = mask.height;
  const smoothed = smoothMaskData(mask.data, mw, mh);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = mw;
  maskCanvas.height = mh;
  const mctx = maskCanvas.getContext('2d');
  const imgData = mctx.createImageData(mw, mh);
  const pixels = imgData.data;

  const effT = Math.max(0.04, Math.min(0.96, threshold - edgeShift));
  const lo = effT - feather;
  const hi = effT + feather;
  const span = Math.max(0.001, hi - lo);

  for (let i = 0; i < smoothed.length; i++) {
    let conf = smoothed[i] / 255;
    if (invert) conf = 1 - conf;
    let a = (conf - lo) / span;
    if (a <= 0) a = 0;
    else if (a >= 1) a = 1;
    else a = a * a * (3 - 2 * a); // smoothstep

    const p = i * 4;
    pixels[p] = 255;
    pixels[p + 1] = 255;
    pixels[p + 2] = 255;
    pixels[p + 3] = (a * 255 + 0.5) | 0;
  }
  mctx.putImageData(imgData, 0, 0);

  // 2. Square center-crop the photo & apply the upscaled bilinear-smoothed alpha mask
  const sw = imageSource.naturalWidth || imageSource.width || outSize;
  const sh = imageSource.naturalHeight || imageSource.height || outSize;
  const cropSide = Math.min(sw, sh);
  const sx = (sw - cropSide) / 2;
  const sy = (sh - cropSide) / 2;

  const maskCropSide = Math.min(mw, mh);
  const msx = (mw - maskCropSide) / 2;
  const msy = (mh - maskCropSide) / 2;

  const cutout = document.createElement('canvas');
  cutout.width = outSize;
  cutout.height = outSize;
  const ctx = cutout.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw alpha mask first, then `source-in` original photo for clean premultiplied edges
  ctx.drawImage(maskCanvas, msx, msy, maskCropSide, maskCropSide, 0, 0, outSize, outSize);
  ctx.globalCompositeOperation = 'source-in';
  ctx.drawImage(imageSource, sx, sy, cropSide, cropSide, 0, 0, outSize, outSize);
  ctx.globalCompositeOperation = 'source-over';

  maskCanvas.width = 0;
  maskCanvas.height = 0;
  return cutout;
}

/**
 * Draws spaced typography accurately across browsers (even where ctx.letterSpacing is unsupported).
 */
function drawSpacedTextLine(ctx, text, cx, cy, trackingPx, doFill, doStroke) {
  if (!trackingPx || Math.abs(trackingPx) < 0.25) {
    if (doStroke) ctx.strokeText(text, cx, cy);
    if (doFill) ctx.fillText(text, cx, cy);
    return;
  }
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalWidth =
    widths.reduce((acc, w) => acc + w, 0) + trackingPx * Math.max(0, chars.length - 1);
  let cursor = cx - totalWidth / 2;

  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i++) {
    if (doStroke) ctx.strokeText(chars[i], cursor, cy);
    if (doFill) ctx.fillText(chars[i], cursor, cy);
    cursor += widths[i] + trackingPx;
  }
  ctx.textAlign = prevAlign;
}

/**
 * Ensures requested display fonts are loaded for crisp canvas rendering.
 */
export async function ensureDepthFontsLoaded() {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  await Promise.allSettled(
    DEPTH_TEXT_FONTS.map((f) =>
      document.fonts.load(`${f.italic ? 'italic ' : ''}${f.weight} 48px ${f.family}`, 'TOGETHER')
    )
  );
}

/**
 * Renders the complete 3-layer composite onto `targetCanvas` in <2ms for live 60fps editing.
 */
export function renderDepthTextComposite(targetCanvas, imageSource, cutoutCanvas, config = DEFAULT_DEPTH_TEXT_CONFIG) {
  if (!targetCanvas || !imageSource) return;
  const size = targetCanvas.width || 720;
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) return;

  const sw = imageSource.naturalWidth || imageSource.width || size;
  const sh = imageSource.naturalHeight || imageSource.height || size;
  const cropSide = Math.min(sw, sh);
  const sx = (sw - cropSide) / 2;
  const sy = (sh - cropSide) / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // --- LAYER 1: Background photo (+ optional blur/dim behind subject) ---
  ctx.save();
  const blurPx = (Number(config.bgBlur) || 0) * (size / 720) * 14;
  if (blurPx > 0.3 && 'filter' in ctx) {
    ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
    const pad = blurPx * 1.4;
    ctx.drawImage(imageSource, sx, sy, cropSide, cropSide, -pad, -pad, size + pad * 2, size + pad * 2);
    ctx.filter = 'none';
  } else {
    ctx.drawImage(imageSource, sx, sy, cropSide, cropSide, 0, 0, size, size);
  }
  if (config.bgDim > 0.005) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.65, config.bgDim)})`;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();

  // --- LAYER 2: Typography (placed behind subject, or in front if user toggles off) ---
  const rawText = String(config.text || '');
  const displayText = config.uppercase ? rawText.toUpperCase() : rawText;
  const lines = displayText.split('\n').filter((l) => l.trim().length > 0);

  if (lines.length > 0) {
    const fontMeta = DEPTH_TEXT_FONTS.find((f) => f.id === config.fontId) || DEPTH_TEXT_FONTS[0];
    const fontPx = Math.max(18, Math.round(size * (config.fontSize || 0.24)));
    const lineHeightPx = fontPx * (config.lineHeight || 0.94);
    const trackingPx = fontPx * (config.letterSpacing || 0);
    const tx = size * (Number.isFinite(config.x) ? config.x : 0.5);
    const ty = size * (Number.isFinite(config.y) ? config.y : 0.36);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(((config.rotation || 0) * Math.PI) / 180);
    if (fontMeta.scaleX && fontMeta.scaleX !== 1) {
      ctx.scale(fontMeta.scaleX, 1);
    }

    ctx.font = `${fontMeta.italic ? 'italic ' : ''}${fontMeta.weight} ${fontPx}px ${fontMeta.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = Math.max(0.05, Math.min(1, config.opacity ?? 0.96));

    // Resolve fill style (custom color or swatch solid/gradient)
    const totalBlockH = lineHeightPx * lines.length;
    const swatch = DEPTH_TEXT_SWATCHES.find((s) => s.id === config.swatchId) || DEPTH_TEXT_SWATCHES[0];
    let fillStyle = config.customColor || swatch.color || '#ffffff';
    if (!config.customColor && swatch.type === 'gradient' && Array.isArray(swatch.colors)) {
      const grad = ctx.createLinearGradient(0, -totalBlockH * 0.55, 0, totalBlockH * 0.55);
      const stops = swatch.colors;
      stops.forEach((col, i) => grad.addColorStop(i / Math.max(1, stops.length - 1), col));
      fillStyle = grad;
    }

    if (config.shadowBlur > 0.01) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
      ctx.shadowBlur = fontPx * config.shadowBlur * 0.5;
      ctx.shadowOffsetY = fontPx * 0.03;
    }

    const doFill = !config.hollow;
    const strokePx = fontPx * (config.strokeWidth || 0);
    const doStroke = strokePx >= 0.8;

    ctx.fillStyle = fillStyle;
    if (doStroke) {
      ctx.strokeStyle = config.strokeColor || '#ffffff';
      ctx.lineWidth = strokePx;
    }

    const startY = -((lines.length - 1) * lineHeightPx) / 2;
    for (let i = 0; i < lines.length; i++) {
      drawSpacedTextLine(ctx, lines[i], 0, startY + i * lineHeightPx, trackingPx, doFill, doStroke);
    }

    ctx.restore();
  }

  // --- LAYER 3: AI Foreground Subject Cutout (pops cleanly in front of the text!) ---
  if (config.behindSubject && cutoutCanvas) {
    ctx.save();
    ctx.drawImage(cutoutCanvas, 0, 0, size, size);
    ctx.restore();
  }
}

/**
 * Bakes the final HD 1280x1280 JPEG File ready to preview & upload directly to Locket.
 */
export async function bakeDepthTextFile(imageSource, mask, config, outputSize = 1280) {
  await ensureDepthFontsLoaded();
  const hdCutout =
    config.behindSubject && mask
      ? buildForegroundCutoutCanvas(imageSource, mask, config, outputSize)
      : null;

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  renderDepthTextComposite(canvas, imageSource, hdCutout, config);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.94));
  canvas.width = 0;
  canvas.height = 0;
  if (hdCutout) {
    hdCutout.width = 0;
    hdCutout.height = 0;
  }
  if (!blob) throw new Error('Không thể xuất ảnh ghép chữ');
  return new File([blob], `locket-depth-text-${Date.now()}.jpg`, { type: 'image/jpeg' });
}
