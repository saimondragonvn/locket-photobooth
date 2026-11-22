import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_DEPTH_TEXT_CONFIG,
  DEPTH_TEXT_FONTS,
  DEPTH_TEXT_PRESETS,
  DEPTH_TEXT_SWATCHES,
  bakeDepthTextFile,
  buildForegroundCutoutCanvas,
  ensureDepthFontsLoaded,
  renderDepthTextComposite,
  segmentSubjectMask,
} from '../../camera/depthTextEngine.js';

const PREVIEW_CANVAS_SIZE = 720;

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const LayersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 12 12 17 22 12" />
    <polyline points="2 17 12 22 22 17" />
  </svg>
);

/**
 * Basic Lowkey Minimalist Dark "Chữ nền" (Text Behind Subject) Editor
 * - Portaled to document.body (z-index 9999) with full safe-area clearance
 * - 100% unobstructed square photo canvas (zero noisy status/badge overlays once ready)
 * - Single crisp top header (Close | Title + Layer toggle | Xong)
 */
export function DepthTextEditor({ open, imageUrl, onClose, onApply }) {
  const [config, setConfig] = useState(DEFAULT_DEPTH_TEXT_CONFIG);
  const [tab, setTab] = useState('text'); // 'text' | 'style' | 'mask'
  const [aiStatus, setAiStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [baking, setBaking] = useState(false);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const maskRef = useRef(null);
  const cutoutRef = useRef(null);
  const dragRef = useRef(null);
  const rafRef = useRef(0);

  const [imageReadySeq, setImageReadySeq] = useState(0);
  const [maskReadySeq, setMaskReadySeq] = useState(0);

  const updateConfig = useCallback((patch) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (!open || !imageUrl) return;
    let cancelled = false;

    setAiStatus('loading');
    maskRef.current = null;
    cutoutRef.current = null;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      if (cancelled) return;
      imageRef.current = img;
      setImageReadySeq((s) => s + 1);
      await ensureDepthFontsLoaded();
      if (cancelled) return;

      try {
        const mask = await segmentSubjectMask(img);
        if (cancelled) return;
        maskRef.current = mask;
        setAiStatus('ready');
        setMaskReadySeq((s) => s + 1);
      } catch {
        if (!cancelled) setAiStatus('error');
      }
    };
    img.onerror = () => {
      if (!cancelled) setAiStatus('error');
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [open, imageUrl]);

  useEffect(() => {
    if (!open || !imageRef.current || !maskRef.current) return;
    const prevCutout = cutoutRef.current;
    cutoutRef.current = buildForegroundCutoutCanvas(
      imageRef.current,
      maskRef.current,
      {
        threshold: config.threshold,
        feather: config.feather,
        edgeShift: config.edgeShift,
        invertMask: config.invertMask,
      },
      PREVIEW_CANVAS_SIZE
    );
    if (prevCutout) {
      prevCutout.width = 0;
      prevCutout.height = 0;
    }
    setMaskReadySeq((s) => s + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageReadySeq, config.threshold, config.feather, config.edgeShift, config.invertMask, aiStatus]);

  useEffect(() => {
    if (!open || !canvasRef.current || !imageRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (canvasRef.current && imageRef.current) {
        renderDepthTextComposite(canvasRef.current, imageRef.current, cutoutRef.current, config);
      }
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, config, imageReadySeq, maskReadySeq]);

  useEffect(() => {
    if (open) return;
    if (cutoutRef.current) {
      cutoutRef.current.width = 0;
      cutoutRef.current.height = 0;
      cutoutRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !baking) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, baking, onClose]);

  const handleRetrySegment = useCallback(async () => {
    if (!imageRef.current) return;
    setAiStatus('loading');
    try {
      const mask = await segmentSubjectMask(imageRef.current);
      maskRef.current = mask;
      setAiStatus('ready');
      setMaskReadySeq((s) => s + 1);
    } catch {
      setAiStatus('error');
    }
  }, []);

  const onPointerDown = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: config.x,
      startY: config.y,
      w: rect.width || 1,
      h: rect.height || 1,
    };
  };

  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const { startClientX, startClientY, startX, startY, w, h } = dragRef.current;
    const nx = Math.max(0.05, Math.min(0.95, startX + (e.clientX - startClientX) / w));
    const ny = Math.max(0.06, Math.min(0.94, startY + (e.clientY - startClientY) / h));
    setConfig((prev) => ({ ...prev, x: nx, y: ny }));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleApply = async () => {
    if (!imageRef.current || baking) return;
    setBaking(true);
    try {
      const file = await bakeDepthTextFile(imageRef.current, maskRef.current, config, 1280);
      onApply?.(file);
    } catch {
      setAiStatus('error');
    } finally {
      setBaking(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="lk-depth-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Chữ sau chủ thể"
      onClick={() => !baking && onClose?.()}
    >
      <div className="lk-depth-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Single Minimal Top Bar */}
        <header className="lk-depth-head">
          <button
            type="button"
            className="lk-depth-icon-action"
            onClick={onClose}
            disabled={baking}
            aria-label="Đóng"
          >
            <CloseIcon />
          </button>

          <button
            type="button"
            className={`lk-depth-depth-btn ${config.behindSubject ? 'on' : ''}`}
            onClick={() => updateConfig({ behindSubject: !config.behindSubject })}
            aria-pressed={config.behindSubject}
          >
            <LayersIcon />
            <span>{config.behindSubject ? 'Sau chủ thể' : 'Phía trước'}</span>
          </button>

          <button
            type="button"
            className="lk-depth-apply"
            onClick={handleApply}
            disabled={baking || !imageRef.current}
          >
            {baking ? '...' : 'Xong'}
          </button>
        </header>

        {/* 100% Unobstructed Square Photo Canvas */}
        <div className="lk-depth-stage">
          <canvas
            ref={canvasRef}
            width={PREVIEW_CANVAS_SIZE}
            height={PREVIEW_CANVAS_SIZE}
            className="lk-depth-canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {aiStatus === 'loading' && (
            <div className="lk-depth-loading" aria-live="polite">
              <span className="lk-depth-spin" />
              <span>Đang tách nền</span>
            </div>
          )}
          {aiStatus === 'error' && (
            <button type="button" className="lk-depth-loading error" onClick={handleRetrySegment}>
              Thử tách lại
            </button>
          )}
        </div>

        {/* Minimal Segmented Tabs */}
        <div className="lk-depth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'text'}
            className={`lk-depth-tab ${tab === 'text' ? 'on' : ''}`}
            onClick={() => setTab('text')}
          >
            Chữ
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'style'}
            className={`lk-depth-tab ${tab === 'style' ? 'on' : ''}`}
            onClick={() => setTab('style')}
          >
            Kiểu
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'mask'}
            className={`lk-depth-tab ${tab === 'mask' ? 'on' : ''}`}
            onClick={() => setTab('mask')}
          >
            Tách nền
          </button>
        </div>

        {/* Clean Controls Area */}
        <div className="lk-depth-controls">
          {tab === 'text' && (
            <>
              <div className="lk-depth-input-row">
                <input
                  type="text"
                  className="lk-depth-input"
                  value={config.text}
                  onChange={(e) => updateConfig({ text: e.target.value })}
                  placeholder="Nhập chữ..."
                  maxLength={48}
                />
                <button
                  type="button"
                  className={`lk-depth-mini-btn ${config.uppercase ? 'on' : ''}`}
                  onClick={() => updateConfig({ uppercase: !config.uppercase })}
                  aria-label="In hoa"
                  aria-pressed={config.uppercase}
                >
                  AA
                </button>
              </div>

              <div className="lk-depth-scroll-row">
                {DEPTH_TEXT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="lk-depth-chip"
                    onClick={() =>
                      updateConfig({
                        ...p.patch,
                        text: config.text.trim() ? config.text : p.patch.text,
                        hollow: Boolean(p.patch.hollow),
                        customColor: '',
                      })
                    }
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="lk-depth-scroll-row">
                {DEPTH_TEXT_FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`lk-depth-chip ${config.fontId === f.id ? 'on' : ''}`}
                    style={{ fontFamily: f.family }}
                    onClick={() => updateConfig({ fontId: f.id })}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'style' && (
            <>
              <div className="lk-depth-swatches">
                {DEPTH_TEXT_SWATCHES.map((sw) => {
                  const bg =
                    sw.type === 'gradient'
                      ? `linear-gradient(135deg, ${sw.colors.join(', ')})`
                      : sw.color;
                  const active = !config.customColor && config.swatchId === sw.id;
                  return (
                    <button
                      key={sw.id}
                      type="button"
                      aria-label={sw.label}
                      className={`lk-depth-swatch ${active ? 'on' : ''}`}
                      style={{ background: bg }}
                      onClick={() => updateConfig({ swatchId: sw.id, customColor: '', hollow: false })}
                    />
                  );
                })}
                <label className="lk-depth-swatch lk-depth-color-pick" aria-label="Màu tuỳ chọn">
                  <input
                    type="color"
                    value={config.customColor || '#ffffff'}
                    onChange={(e) => updateConfig({ customColor: e.target.value, hollow: false })}
                  />
                  <span>+</span>
                </label>
              </div>

              <div className="lk-depth-slider">
                <span>Cỡ chữ</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.46}
                  step={0.005}
                  value={config.fontSize}
                  onChange={(e) => updateConfig({ fontSize: parseFloat(e.target.value) })}
                />
                <b>{Math.round(config.fontSize * 400)}</b>
              </div>

              <div className="lk-depth-slider">
                <span>Xoay</span>
                <input
                  type="range"
                  min={-35}
                  max={35}
                  step={1}
                  value={config.rotation}
                  onChange={(e) => updateConfig({ rotation: parseInt(e.target.value, 10) })}
                />
                <b>{config.rotation}°</b>
              </div>

              <div className="lk-depth-slider">
                <span>Độ mờ</span>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.02}
                  value={config.opacity}
                  onChange={(e) => updateConfig({ opacity: parseFloat(e.target.value) })}
                />
                <b>{Math.round(config.opacity * 100)}%</b>
              </div>

              <div className="lk-depth-slider">
                <span>Viền</span>
                <input
                  type="range"
                  min={0}
                  max={0.05}
                  step={0.002}
                  value={config.strokeWidth}
                  onChange={(e) => updateConfig({ strokeWidth: parseFloat(e.target.value) })}
                />
                <b>{Math.round(config.strokeWidth * 1000)}</b>
              </div>

              <div className="lk-depth-toggle-row">
                <button
                  type="button"
                  className={`lk-depth-chip ${config.hollow ? 'on' : ''}`}
                  onClick={() =>
                    updateConfig({
                      hollow: !config.hollow,
                      strokeWidth: !config.hollow ? Math.max(0.028, config.strokeWidth) : config.strokeWidth,
                      strokeColor: !config.hollow ? '#ffffff' : config.strokeColor,
                    })
                  }
                >
                  Viền rỗng
                </button>
                <button
                  type="button"
                  className="lk-depth-chip"
                  onClick={() => updateConfig({ x: 0.5, y: 0.36, rotation: 0 })}
                >
                  Căn giữa
                </button>
              </div>
            </>
          )}

          {tab === 'mask' && (
            <>
              <div className="lk-depth-slider">
                <span>Ngưỡng</span>
                <input
                  type="range"
                  min={0.18}
                  max={0.85}
                  step={0.02}
                  value={config.threshold}
                  onChange={(e) => updateConfig({ threshold: parseFloat(e.target.value) })}
                />
                <b>{Math.round(config.threshold * 100)}%</b>
              </div>

              <div className="lk-depth-slider">
                <span>Mềm viền</span>
                <input
                  type="range"
                  min={0.02}
                  max={0.35}
                  step={0.01}
                  value={config.feather}
                  onChange={(e) => updateConfig({ feather: parseFloat(e.target.value) })}
                />
                <b>{Math.round(config.feather * 100)}</b>
              </div>

              <div className="lk-depth-slider">
                <span>Tối nền</span>
                <input
                  type="range"
                  min={0}
                  max={0.55}
                  step={0.02}
                  value={config.bgDim}
                  onChange={(e) => updateConfig({ bgDim: parseFloat(e.target.value) })}
                />
                <b>{Math.round(config.bgDim * 100)}%</b>
              </div>

              <div className="lk-depth-slider">
                <span>Mờ nền</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.bgBlur}
                  onChange={(e) => updateConfig({ bgBlur: parseFloat(e.target.value) })}
                />
                <b>{Math.round(config.bgBlur * 100)}%</b>
              </div>

              <div className="lk-depth-toggle-row">
                <button
                  type="button"
                  className={`lk-depth-chip ${config.invertMask ? 'on' : ''}`}
                  onClick={() => updateConfig({ invertMask: !config.invertMask })}
                >
                  Đảo vùng
                </button>
                <button type="button" className="lk-depth-chip" onClick={handleRetrySegment}>
                  Tách lại
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
