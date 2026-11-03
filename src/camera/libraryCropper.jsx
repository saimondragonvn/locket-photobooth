import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Interactive 1:1 Locket Library Photo Cropper & Aspect-Ratio Framer
 * - Supports arbitrary aspect-ratio photos (9:16, 3:4, 16:9, 4:3, 1:1) from phone/PC gallery.
 * - Continuous zoom from `minZoom` (smaller than Fit) -> `fitZoom` ("Vừa khung" 100% full image)
 *   -> `1.0` ("Lấp đầy" 1:1 cover) -> `3.5x` close-up zoom.
 * - Supports 1-finger / mouse drag pan, 2-finger pinch-to-zoom, mouse wheel zoom,
 *   90-degree rotation, blurred-ambient vs solid-black letterbox backdrop, and zoom slider.
 * - Uses normalized square coordinates (`[-1..1]`) so live preview and baked 1440x1440 JPEG
 *   output have 100% pixel-identical framing.
 */

export const MAX_CROP_ZOOM = 3.5;

export function getRotatedDimensions(width, height, rotation = 0) {
  const quarter = ((Math.round(rotation / 90) % 4) + 4) % 4;
  return quarter % 2 === 1 ? { rw: height, rh: width, quarter } : { rw: width, rh: height, quarter };
}

export function getFitZoom(width, height, rotation = 0) {
  const { rw, rh } = getRotatedDimensions(width, height, rotation);
  if (!rw || !rh) return 1;
  return Math.min(rw, rh) / Math.max(rw, rh);
}

export function getMinZoom(width, height, rotation = 0) {
  const fit = getFitZoom(width, height, rotation);
  return Math.min(0.5, +(fit * 0.92).toFixed(3));
}

export function clampLibraryTransform(source, next) {
  if (!source?.width || !source?.height) return next;
  const rotation = ((Math.round((next.rotation || 0) / 90) % 4) + 4) % 4 * 90;
  const { rw, rh } = getRotatedDimensions(source.width, source.height, rotation);
  const minSide = Math.min(rw, rh);
  const minZ = getMinZoom(source.width, source.height, rotation);
  const zoom = Math.min(MAX_CROP_ZOOM, Math.max(minZ, Number(next.zoom) || 1));

  const drawnW = (rw / minSide) * zoom;
  const drawnH = (rh / minSide) * zoom;

  const limitX = Math.abs(drawnW - 1) / 2;
  const limitY = Math.abs(drawnH - 1) / 2;

  const panX = Math.min(limitX, Math.max(-limitX, Number(next.panX) || 0));
  const panY = Math.min(limitY, Math.max(-limitY, Number(next.panY) || 0));

  return {
    zoom,
    panX,
    panY,
    rotation,
    bgMode: next.bgMode === 'black' ? 'black' : 'blur',
  };
}

/**
 * Loads an uploaded image File into a drawable ImageBitmap (or HTMLImageElement fallback)
 * respecting EXIF orientation, plus a pre-blurred tiny backdrop canvas for instant 60fps letterbox rendering.
 */
export async function loadLibraryImageSource(file) {
  let drawable = null;
  let width = 0;
  let height = 0;

  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      drawable = bmp;
      width = bmp.width;
      height = bmp.height;
    } catch {
      drawable = null;
    }
  }

  if (!drawable) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      // Copy onto an owned canvas so revoking temp URL stays safe
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      drawable = c;
      width = c.width;
      height = c.height;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Pre-build a soft blurred 96x96 backdrop canvas so 60fps drag/pinch never pays per-frame CSS blur cost
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = 96;
  blurCanvas.height = 96;
  const bctx = blurCanvas.getContext('2d', { alpha: false });
  bctx.fillStyle = '#111';
  bctx.fillRect(0, 0, 96, 96);
  const coverScale = 96 / Math.min(width, height);
  const bw = width * coverScale * 1.12;
  const bh = height * coverScale * 1.12;
  if ('filter' in bctx) {
    bctx.filter = 'blur(10px) brightness(0.62) saturate(1.15)';
  }
  bctx.drawImage(drawable, (96 - bw) / 2, (96 - bh) / 2, bw, bh);
  bctx.filter = 'none';
  if (!('filter' in bctx)) {
    bctx.fillStyle = 'rgba(0,0,0,0.45)';
    bctx.fillRect(0, 0, 96, 96);
  }

  const fitZoom = getFitZoom(width, height, 0);
  const isRectangular = Math.abs(width - height) / Math.max(width, height) > 0.04;

  // Default to "Vừa khung" (fitZoom) for rectangular gallery photos so nothing is cut off initially,
  // while letting the user switch to "Lấp đầy" (1.0x) or zoom/pan freely!
  const initialTransform = clampLibraryTransform(
    { width, height },
    {
      zoom: isRectangular ? fitZoom : 1,
      panX: 0,
      panY: 0,
      rotation: 0,
      bgMode: 'blur',
    }
  );

  return {
    source: {
      file,
      name: file.name || 'locket-photo.jpg',
      drawable,
      blurCanvas,
      width,
      height,
      dispose: () => {
        if (drawable && typeof drawable.close === 'function') {
          try {
            drawable.close();
          } catch {
            // ignore
          }
        }
      },
    },
    initialTransform,
  };
}

/**
 * Draws the exact 1:1 square output onto `ctx` of size `side x side`.
 */
export function drawCroppedSquareToContext(ctx, side, source, rawTransform) {
  if (!ctx || !source?.drawable) return;
  const t = clampLibraryTransform(source, rawTransform || {});
  const { rw, rh, quarter } = getRotatedDimensions(source.width, source.height, t.rotation);
  const minSide = Math.min(rw, rh);
  const drawnW = (rw / minSide) * t.zoom;
  const drawnH = (rh / minSide) * t.zoom;
  const hasMargins = drawnW < 0.998 || drawnH < 0.998;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Background fill (blurred ambient backdrop or pure black)
  if (hasMargins && t.bgMode === 'blur' && source.blurCanvas) {
    ctx.translate(side / 2, side / 2);
    ctx.rotate((quarter * Math.PI) / 2);
    ctx.drawImage(source.blurCanvas, -side / 2, -side / 2, side, side);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  } else {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, side, side);
  }

  // 2. Foreground photo with normalized pan + rotation + zoom
  const centerX = side / 2 + t.panX * side;
  const centerY = side / 2 + t.panY * side;
  const baseScale = (side / minSide) * t.zoom;
  const drawRawW = source.width * baseScale;
  const drawRawH = source.height * baseScale;

  ctx.translate(centerX, centerY);
  if (quarter !== 0) {
    ctx.rotate((quarter * Math.PI) / 2);
  }
  ctx.drawImage(source.drawable, -drawRawW / 2, -drawRawH / 2, drawRawW, drawRawH);
  ctx.restore();
}

/**
 * Bakes the framed 1:1 square into a high-resolution JPEG File ready for Locket upload/download.
 */
export async function bakeCroppedSquareFile(source, transform, maxSide = 1440) {
  if (!source?.drawable) return source?.file || null;
  const nativeMax = Math.max(source.width, source.height);
  const outSide = Math.min(maxSide, Math.max(720, nativeMax));
  const canvas = document.createElement('canvas');
  canvas.width = outSide;
  canvas.height = outSide;
  const ctx = canvas.getContext('2d', { alpha: false });
  drawCroppedSquareToContext(ctx, outSide, source, transform);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.94));
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) return source.file;
  const baseName = (source.name || 'photo').replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}-square.jpg`, { type: 'image/jpeg' });
}

const PILL_BTN_STYLE = {
  alignItems: 'center',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  background: 'rgba(0, 0, 0, 0.56)',
  border: '1px solid rgba(255, 255, 255, 0.16)',
  borderRadius: '999px',
  color: '#fff',
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: '12.5px',
  fontWeight: 700,
  gap: '5px',
  height: '34px',
  padding: '0 11px',
  userSelect: 'none',
  WebkitUserSelect: 'none',
};

const ICON_CIRCLE_STYLE = {
  ...PILL_BTN_STYLE,
  justifyContent: 'center',
  padding: 0,
  width: '34px',
};

export function LibraryCropOverlay({
  source,
  transform,
  onChange,
  filterStyle,
  hideCanvas = false,
  disabled = false,
}) {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const [sliderOpen, setSliderOpen] = useState(true);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const fitZoom = useMemo(
    () => (source ? getFitZoom(source.width, source.height, transform.rotation) : 1),
    [source, transform.rotation]
  );
  const minZoom = useMemo(
    () => (source ? getMinZoom(source.width, source.height, transform.rotation) : 0.5),
    [source, transform.rotation]
  );

  const { rw, rh } = useMemo(
    () => (source ? getRotatedDimensions(source.width, source.height, transform.rotation) : { rw: 1, rh: 1 }),
    [source, transform.rotation]
  );
  const minSide = Math.min(rw, rh) || 1;
  const hasMargins = (rw / minSide) * transform.zoom < 0.995 || (rh / minSide) * transform.zoom < 0.995;
  const isAtFit = Math.abs(transform.zoom - fitZoom) < 0.025;
  const isRectangular = Math.abs(rw - rh) / Math.max(rw, rh) > 0.03;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage || !source) return;
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const side = Math.max(240, Math.round(rect.width * dpr));
    if (canvas.width !== side || canvas.height !== side) {
      canvas.width = side;
      canvas.height = side;
    }
    const ctx = canvas.getContext('2d', { alpha: false });
    drawCroppedSquareToContext(ctx, side, source, transformRef.current);
  }, [source]);

  useEffect(() => {
    redraw();
  }, [source, transform, redraw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [redraw]);

  // Unified Mouse Drag + Wheel + 1-Finger Pan + 2-Finger Pinch-to-Zoom
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || disabled || !source) return;

    let mouseStart = null;
    let touchState = null;

    const isInteractiveChild = (target) =>
      Boolean(target?.closest?.('button, input, label, [data-crop-ui="1"]'));

    const applyNext = (updater) => {
      const cur = transformRef.current;
      const next = clampLibraryTransform(source, updater(cur));
      transformRef.current = next;
      redraw();
      onChange(next);
    };

    const onWheel = (e) => {
      if (isInteractiveChild(e.target)) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0016);
      applyNext((cur) => ({ ...cur, zoom: cur.zoom * factor }));
    };

    const onMouseDown = (e) => {
      if (e.button !== 0 || isInteractiveChild(e.target)) return;
      e.preventDefault();
      const rect = stage.getBoundingClientRect();
      mouseStart = {
        x: e.clientX,
        y: e.clientY,
        panX: transformRef.current.panX,
        panY: transformRef.current.panY,
        side: Math.max(1, rect.width),
      };
    };

    const onMouseMove = (e) => {
      if (!mouseStart) return;
      const dx = (e.clientX - mouseStart.x) / mouseStart.side;
      const dy = (e.clientY - mouseStart.y) / mouseStart.side;
      applyNext((cur) => ({
        ...cur,
        panX: mouseStart.panX + dx,
        panY: mouseStart.panY + dy,
      }));
    };

    const onMouseUp = () => {
      mouseStart = null;
    };

    const getTouchMetrics = (touches) => {
      if (touches.length === 1) {
        return { cx: touches[0].clientX, cy: touches[0].clientY, dist: 0 };
      }
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      return {
        cx: (touches[0].clientX + touches[1].clientX) / 2,
        cy: (touches[0].clientY + touches[1].clientY) / 2,
        dist: Math.hypot(dx, dy),
      };
    };

    const onTouchStart = (e) => {
      if (isInteractiveChild(e.target)) return;
      if (e.touches.length >= 1 && e.touches.length <= 2) {
        const rect = stage.getBoundingClientRect();
        const m = getTouchMetrics(e.touches);
        touchState = {
          count: e.touches.length,
          cx: m.cx,
          cy: m.cy,
          dist: m.dist || 1,
          zoom: transformRef.current.zoom,
          panX: transformRef.current.panX,
          panY: transformRef.current.panY,
          side: Math.max(1, rect.width),
        };
      }
    };

    const onTouchMove = (e) => {
      if (!touchState) return;
      if (e.cancelable) e.preventDefault();
      if (e.touches.length !== touchState.count) {
        const rect = stage.getBoundingClientRect();
        const m = getTouchMetrics(e.touches);
        touchState = {
          count: e.touches.length,
          cx: m.cx,
          cy: m.cy,
          dist: m.dist || 1,
          zoom: transformRef.current.zoom,
          panX: transformRef.current.panX,
          panY: transformRef.current.panY,
          side: Math.max(1, rect.width),
        };
        return;
      }
      const m = getTouchMetrics(e.touches);
      const dx = (m.cx - touchState.cx) / touchState.side;
      const dy = (m.cy - touchState.cy) / touchState.side;
      const nextZoom =
        e.touches.length === 2 && touchState.dist > 8
          ? touchState.zoom * (m.dist / touchState.dist)
          : touchState.zoom;

      applyNext((cur) => ({
        ...cur,
        zoom: nextZoom,
        panX: touchState.panX + dx,
        panY: touchState.panY + dy,
      }));
    };

    const onTouchEnd = (e) => {
      if (e.touches.length === 0) {
        touchState = null;
      } else if (e.touches.length === 1) {
        const rect = stage.getBoundingClientRect();
        const m = getTouchMetrics(e.touches);
        touchState = {
          count: 1,
          cx: m.cx,
          cy: m.cy,
          dist: 1,
          zoom: transformRef.current.zoom,
          panX: transformRef.current.panX,
          panY: transformRef.current.panY,
          side: Math.max(1, rect.width),
        };
      }
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    stage.addEventListener('touchstart', onTouchStart, { passive: true });
    stage.addEventListener('touchmove', onTouchMove, { passive: false });
    stage.addEventListener('touchend', onTouchEnd);
    stage.addEventListener('touchcancel', onTouchEnd);

    return () => {
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      stage.removeEventListener('touchstart', onTouchStart);
      stage.removeEventListener('touchmove', onTouchMove);
      stage.removeEventListener('touchend', onTouchEnd);
      stage.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [source, disabled, onChange, redraw]);

  const toggleFitFill = () => {
    const targetZoom = isRectangular ? (isAtFit ? 1 : fitZoom) : transform.zoom === 1 ? 0.75 : 1;
    onChange(
      clampLibraryTransform(source, {
        ...transform,
        zoom: targetZoom,
        panX: 0,
        panY: 0,
      })
    );
  };

  const rotate90 = () => {
    const nextRot = (transform.rotation + 90) % 360;
    const nextFit = getFitZoom(source.width, source.height, nextRot);
    onChange(
      clampLibraryTransform(source, {
        ...transform,
        rotation: nextRot,
        zoom: isAtFit ? nextFit : transform.zoom,
        panX: 0,
        panY: 0,
      })
    );
  };

  const toggleBg = () => {
    onChange(
      clampLibraryTransform(source, {
        ...transform,
        bgMode: transform.bgMode === 'blur' ? 'black' : 'blur',
      })
    );
  };

  const setZoomValue = (z) => {
    onChange(
      clampLibraryTransform(source, {
        ...transform,
        zoom: z,
      })
    );
  };

  return (
    <>
      <div
        ref={stageRef}
        data-testid="library-crop-stage"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          cursor: disabled ? 'default' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            opacity: hideCanvas ? 0 : 1,
            ...(filterStyle || {}),
          }}
        />
      </div>

      {/* Top-Left Quick Framing Controls: Fit/Fill + Rotate 90 + Blurred/Dark Backdrop */}
      <div
        data-crop-ui="1"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap',
          maxWidth: 'calc(100% - 88px)',
        }}
      >
        <button
          type="button"
          onClick={toggleFitFill}
          disabled={disabled}
          aria-label={isAtFit ? 'Lấp đầy khung Locket' : 'Thu vừa khung Locket'}
          style={{
            ...PILL_BTN_STYLE,
            borderColor: 'rgba(246, 196, 83, 0.55)',
            color: '#ffd871',
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isAtFit ? (
              <>
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </>
            ) : (
              <>
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </>
            )}
          </svg>
          <span>{isAtFit ? 'Lấp đầy' : 'Vừa khung'}</span>
        </button>

        <button
          type="button"
          onClick={rotate90}
          disabled={disabled}
          aria-label="Xoay ảnh 90 độ"
          title="Xoay ảnh 90°"
          style={ICON_CIRCLE_STYLE}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>

        {hasMargins && (
          <button
            type="button"
            onClick={toggleBg}
            disabled={disabled}
            aria-label="Đổi màu nền viền ảnh"
            style={PILL_BTN_STYLE}
          >
            <span>{transform.bgMode === 'blur' ? 'Nền mờ' : 'Nền đen'}</span>
          </button>
        )}
      </div>

      {/* Top-Right (slot 2 below Filter): Toggle Zoom Slider Bar */}
      <button
        type="button"
        data-crop-ui="1"
        onClick={() => setSliderOpen((v) => !v)}
        disabled={disabled}
        aria-label="Thanh chỉnh kích thước ảnh"
        aria-pressed={sliderOpen}
        style={{
          ...ICON_CIRCLE_STYLE,
          position: 'absolute',
          top: '64px',
          right: '20px',
          width: '36px',
          height: '36px',
          zIndex: 3,
          color: sliderOpen ? 'var(--cam-accent, var(--accent, #f6c453))' : '#fff',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2v14a2 2 0 0 0 2 2h14" />
          <path d="M18 22V8a2 2 0 0 0-2-2H2" />
        </svg>
      </button>

      {/* Compact Floating Zoom Slider (sits cleanly above caption-pill) */}
      {sliderOpen && (
        <div
          data-crop-ui="1"
          style={{
            position: 'absolute',
            bottom: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: 'min(84%, 290px)',
            padding: '6px 12px',
            borderRadius: '999px',
            background: 'rgba(0, 0, 0, 0.58)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: '#fff',
          }}
        >
          <button
            type="button"
            onClick={() => setZoomValue(transform.zoom - 0.12)}
            disabled={disabled}
            aria-label="Thu nhỏ ảnh"
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 800,
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            −
          </button>
          <input
            type="range"
            aria-label="Mức phóng to thu nhỏ ảnh"
            min={minZoom}
            max={MAX_CROP_ZOOM}
            step={0.01}
            value={transform.zoom}
            disabled={disabled}
            onChange={(e) => setZoomValue(parseFloat(e.target.value))}
            style={{
              flex: 1,
              accentColor: '#f6c453',
              cursor: 'pointer',
              height: '20px',
              margin: 0,
            }}
          />
          <button
            type="button"
            onClick={() => setZoomValue(transform.zoom + 0.12)}
            disabled={disabled}
            aria-label="Phóng to ảnh"
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 800,
              lineHeight: 1,
              padding: '0 2px',
            }}
          >
            +
          </button>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              minWidth: '34px',
              textAlign: 'right',
              color: '#ffd871',
            }}
          >
            {transform.zoom.toFixed(2).replace(/\.00$/, '.0')}×
          </span>
        </div>
      )}
    </>
  );
}
