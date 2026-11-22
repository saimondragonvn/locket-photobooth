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

/**
 * Interactive "Chèn chữ sau chủ thể" (Text Behind Subject) Editor Modal
 * - Runs on-device AI segmentation via MediaPipe Selfie Segmenter
 * - Live 60fps 3-layer drag-and-drop canvas preview (Background -> Text -> Subject Cutout)
 * - Exports crisp 1280x1280 JPEG File ready to upload to Locket
 */
export function DepthTextEditor({ open, imageUrl, onClose, onApply }) {
  const [config, setConfig] = useState(DEFAULT_DEPTH_TEXT_CONFIG);
  const [tab, setTab] = useState('text'); // 'text' | 'style' | 'mask'
  const [aiStatus, setAiStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [aiProgress, setAiProgress] = useState(0);
  const [aiMessage, setAiMessage] = useState('');
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

  // Load image & trigger automatic AI subject segmentation when opened
  useEffect(() => {
    if (!open || !imageUrl) return;
    let cancelled = false;

    setAiStatus('loading');
    setAiProgress(10);
    setAiMessage('Đang chuẩn bị ảnh...');
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
        const mask = await segmentSubjectMask(img, (pct, msg) => {
          if (cancelled) return;
          setAiProgress(pct);
          if (msg) setAiMessage(msg);
        });
        if (cancelled) return;
        maskRef.current = mask;
        setAiStatus('ready');
        setAiProgress(100);
        setAiMessage('Đã tách chủ thể · Kéo chữ trực tiếp trên ảnh');
        setMaskReadySeq((s) => s + 1);
      } catch (err) {
        if (cancelled) return;
        setAiStatus('error');
        setAiMessage(err?.message || 'Không tách được chủ thể, vẫn có thể chèn chữ');
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setAiStatus('error');
        setAiMessage('Không tải được ảnh xem trước');
      }
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [open, imageUrl]);

  // Rebuild cached foreground cutout ONLY when mask or edge matting params change
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

  // Ultra-fast 60fps composite render whenever text/style/cutout updates
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

  // Cleanup offscreen cutout on close
  useEffect(() => {
    if (open) return;
    if (cutoutRef.current) {
      cutoutRef.current.width = 0;
      cutoutRef.current.height = 0;
      cutoutRef.current = null;
    }
  }, [open]);

  const handleRetrySegment = useCallback(async () => {
    if (!imageRef.current) return;
    setAiStatus('loading');
    setAiProgress(15);
    setAiMessage('Đang tách lại chủ thể...');
    try {
      const mask = await segmentSubjectMask(imageRef.current, (pct, msg) => {
        setAiProgress(pct);
        if (msg) setAiMessage(msg);
      });
      maskRef.current = mask;
      setAiStatus('ready');
      setAiMessage('Đã tách chủ thể · Kéo chữ trực tiếp trên ảnh');
      setMaskReadySeq((s) => s + 1);
    } catch (err) {
      setAiStatus('error');
      setAiMessage(err?.message || 'Lỗi tách chủ thể');
    }
  }, []);

  // Pointer drag directly on preview canvas to position text behind subject smoothly
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
    } catch (err) {
      setAiStatus('error');
      setAiMessage(err?.message || 'Không thể lưu ảnh');
    } finally {
      setBaking(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !baking) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, baking, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="lk-depth-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Chèn chữ sau chủ thể"
      onClick={() => !baking && onClose?.()}
    >
      <div className="lk-depth-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="lk-depth-head">
          <button type="button" className="lk-depth-cancel" onClick={onClose} disabled={baking}>
            ✕ Thoát
          </button>
          <div className="lk-depth-title">Chữ sau chủ thể</div>
          <button
            type="button"
            className="lk-depth-apply"
            onClick={handleApply}
            disabled={baking || !imageRef.current}
          >
            {baking ? 'Đang lưu...' : '✓ Xong'}
          </button>
        </div>

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

          <div className={`lk-depth-status ${aiStatus}`}>
            {aiStatus === 'loading' && <span className="lk-depth-spin" />}
            <span>
              {aiStatus === 'loading'
                ? `${aiMessage} (${aiProgress}%)`
                : aiStatus === 'ready'
                  ? '✓ Đã tách chủ thể · Kéo chữ trên ảnh'
                  : aiMessage}
            </span>
            {aiStatus === 'error' && (
              <button type="button" onClick={handleRetrySegment}>
                Thử lại
              </button>
            )}
          </div>

          <button
            type="button"
            className={`lk-depth-layer-pill ${config.behindSubject ? 'on' : ''}`}
            onClick={() => updateConfig({ behindSubject: !config.behindSubject })}
            title="Bật/tắt tách chủ thể phía trước chữ"
          >
            {config.behindSubject ? '✨ Chữ sau chủ thể' : 'T Chữ phía trước'}
          </button>
        </div>

        <div className="lk-depth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'text'}
            className={`lk-depth-tab ${tab === 'text' ? 'on' : ''}`}
            onClick={() => setTab('text')}
          >
            Chữ & Mẫu
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'style'}
            className={`lk-depth-tab ${tab === 'style' ? 'on' : ''}`}
            onClick={() => setTab('style')}
          >
            Màu & Cỡ
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'mask'}
            className={`lk-depth-tab ${tab === 'mask' ? 'on' : ''}`}
            onClick={() => setTab('mask')}
          >
            Tách nền AI
          </button>
        </div>

        <div className="lk-depth-controls">
          {tab === 'text' && (
            <>
              <div className="lk-depth-input-row">
                <textarea
                  rows={2}
                  className="lk-depth-textarea"
                  value={config.text}
                  onChange={(e) => updateConfig({ text: e.target.value })}
                  placeholder="Nhập chữ (ví dụ: TOGETHER)..."
                  maxLength={60}
                />
                <button
                  type="button"
                  className={`lk-depth-mini-btn ${config.uppercase ? 'on' : ''}`}
                  onClick={() => updateConfig({ uppercase: !config.uppercase })}
                  title="Chữ in hoa"
                >
                  AA
                </button>
              </div>

              <div className="lk-depth-label">Mẫu nhanh</div>
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

              <div className="lk-depth-label">Phông chữ</div>
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
              <div className="lk-depth-label">Màu sắc & Gradient</div>
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
                      title={sw.label}
                      className={`lk-depth-swatch ${active ? 'on' : ''}`}
                      style={{ background: bg }}
                      onClick={() => updateConfig({ swatchId: sw.id, customColor: '', hollow: false })}
                    />
                  );
                })}
                <label className="lk-depth-swatch lk-depth-color-pick" title="Tự chọn màu">
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
                <span>Giãn chữ</span>
                <input
                  type="range"
                  min={-0.04}
                  max={0.22}
                  step={0.01}
                  value={config.letterSpacing}
                  onChange={(e) => updateConfig({ letterSpacing: parseFloat(e.target.value) })}
                />
                <b>{Math.round(config.letterSpacing * 100)}</b>
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
                <span>Viền chữ</span>
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
                  Chữ rỗng viền
                </button>
                <button
                  type="button"
                  className="lk-depth-chip"
                  onClick={() => updateConfig({ x: 0.5, y: 0.36, rotation: 0 })}
                >
                  Căn giữa lại
                </button>
              </div>
            </>
          )}

          {tab === 'mask' && (
            <>
              <div className="lk-depth-slider">
                <span>Ngưỡng tách</span>
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
                <span>Tối nền sau</span>
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
                <span>Làm mờ nền</span>
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
                  Đảo vùng tách
                </button>
                <button type="button" className="lk-depth-chip" onClick={handleRetrySegment}>
                  Tách lại AI
                </button>
              </div>
            </>
          )}
        </div>

        <div className="lk-depth-foot">
          <button type="button" className="lk-depth-foot-cancel" onClick={onClose} disabled={baking}>
            Huỷ
          </button>
          <button
            type="button"
            className="lk-depth-foot-apply"
            onClick={handleApply}
            disabled={baking || !imageRef.current}
          >
            {baking ? 'Đang ghép ảnh...' : 'Áp dụng & Tiếp tục đăng'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
