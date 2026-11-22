import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  WIDGET_BORDER_STYLES,
  isRunningInAndroidApk,
  pickLatestWidgetMoment,
  getSavedWidgetMoment,
  getWidgetConfig,
  saveAndSyncWidgetConfig,
  syncMomentToNativeWidget,
  requestPinNativeWidget,
  triggerNativeWidgetRefresh,
  getApkDownloadUrl,
} from '../../services/nativeWidgetBridge.js';

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/**
 * Lowkey Minimalist Dark Widget Configuration Sheet
 */
export function LocketWidgetSheet({
  open,
  onClose,
  items = [],
  users = {},
  meUid = null,
  streakCount = 0,
  onNotify,
}) {
  const [pinStep, setPinStep] = useState(null); // null | 'pinned' | 'manual' | 'synced'
  const [widgetCfg, setWidgetCfg] = useState(getWidgetConfig);
  const inApk = isRunningInAndroidApk();

  const latestMoment = useMemo(() => {
    const picked = pickLatestWidgetMoment(items, users, meUid, 'friends', streakCount);
    const saved = getSavedWidgetMoment();
    const base = picked || saved;
    if (!base) return null;
    return {
      ...base,
      streakCount: streakCount || base.streakCount || widgetCfg.streakCount || 0,
    };
  }, [items, users, meUid, streakCount, widgetCfg.streakCount]);

  useEffect(() => {
    if (!open) return;
    setWidgetCfg(getWidgetConfig());
    setPinStep(null);
  }, [open]);

  if (!open) return null;

  const activeBorder =
    WIDGET_BORDER_STYLES.find((b) => b.id === widgetCfg.borderStyle) || WIDGET_BORDER_STYLES[0];
  const displayStreak = Math.max(streakCount || 0, latestMoment?.streakCount || 0);

  const handleBorderSelect = (borderId) => {
    const updated = saveAndSyncWidgetConfig({
      borderStyle: borderId,
      streakCount: displayStreak,
    });
    setWidgetCfg(updated);
    if (latestMoment) syncMomentToNativeWidget(latestMoment);
  };

  const handleToggleStreak = () => {
    const updated = saveAndSyncWidgetConfig({
      showStreak: !widgetCfg.showStreak,
      streakCount: displayStreak,
    });
    setWidgetCfg(updated);
    if (latestMoment) syncMomentToNativeWidget(latestMoment);
  };

  const handleAddWidget = () => {
    saveAndSyncWidgetConfig({
      borderStyle: widgetCfg.borderStyle,
      showStreak: widgetCfg.showStreak,
      streakCount: displayStreak,
    });
    if (latestMoment) syncMomentToNativeWidget(latestMoment);
    if (inApk) {
      const res = requestPinNativeWidget('friends');
      triggerNativeWidgetRefresh();
      setPinStep(res.ok ? 'pinned' : 'manual');
      if (res.ok) onNotify?.('Đã gửi yêu cầu ghim tiện ích');
      return;
    }
    setPinStep('manual');
  };

  const handleSyncNow = () => {
    saveAndSyncWidgetConfig({
      borderStyle: widgetCfg.borderStyle,
      showStreak: widgetCfg.showStreak,
      streakCount: displayStreak,
    });
    if (latestMoment) syncMomentToNativeWidget(latestMoment);
    triggerNativeWidgetRefresh();
    setPinStep('synced');
  };

  return createPortal(
    <div className="lk-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Tiện ích" onClick={onClose}>
      <div className="lk-sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="lk-sheet-handle" />
        <div className="lk-sheet-head">
          <h3>Tiện ích</h3>
          <button type="button" className="lk-sheet-close" onClick={onClose} aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        {/* Centered Compact Widget Preview */}
        <div className="lk-wdg-stage">
          {latestMoment?.imageUrl ? (
            <div
              className="lk-wdg-frame"
              style={{
                padding: widgetCfg.borderStyle === 'none' ? '0px' : '4px',
                background: activeBorder.cssBorder,
              }}
            >
              <div
                className="lk-wdg-inner"
                style={{ borderRadius: widgetCfg.borderStyle === 'none' ? '26px' : '22px' }}
              >
                <img src={latestMoment.imageUrl} alt={latestMoment.authorName || 'Locket'} />
                {widgetCfg.showStreak && (
                  <span className="lk-wdg-streak">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#f6c453" aria-hidden="true">
                      <path d="M12.8 2.4c.4 3.4-2.1 5.2-3.4 7.3-1 1.6-.9 3.6.3 4.8-.1-1.3.7-2.4 1.6-3.1.2 2.4 2.4 3.5 2.4 5.7 0 1.8-1.4 3.4-3.3 3.7 3.8.5 7.6-2.4 7.6-6.9 0-4.8-3.2-8.7-5.2-11.5z" />
                    </svg>
                    {displayStreak > 0 ? displayStreak : 1}
                  </span>
                )}
                <span className="lk-wdg-author">{latestMoment.authorName}</span>
              </div>
            </div>
          ) : (
            <div className="lk-wdg-empty">
              <div className="lk-wdg-heart-ring">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#f4f4f5" aria-hidden="true">
                  <path d="M12 20.4s-7.6-4.45-7.6-10.15A4.35 4.35 0 0 1 12 7.3a4.35 4.35 0 0 1 7.6 2.95c0 5.7-7.6 10.15-7.6 10.15z" />
                </svg>
              </div>
              <span>Your Friends</span>
            </div>
          )}
        </div>

        {/* Border Swatch Dots */}
        <div className="lk-wdg-row">
          <span className="lk-wdg-label">Viền</span>
          <div className="lk-wdg-dots">
            {WIDGET_BORDER_STYLES.map((b) => {
              const active = widgetCfg.borderStyle === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  aria-label={b.name}
                  title={b.name}
                  className={`lk-wdg-dot ${active ? 'on' : ''}`}
                  style={{
                    background: b.id === 'none' ? 'transparent' : b.cssBorder,
                    borderStyle: b.id === 'none' ? 'dashed' : 'solid',
                  }}
                  onClick={() => handleBorderSelect(b.id)}
                />
              );
            })}
          </div>
        </div>

        {/* Streak Toggle */}
        <button type="button" className="lk-wdg-toggle" role="switch" aria-checked={widgetCfg.showStreak} onClick={handleToggleStreak}>
          <span>Hiện chuỗi</span>
          <span className={`lk-switch ${widgetCfg.showStreak ? 'on' : ''}`} aria-hidden="true" />
        </button>

        {pinStep && (
          <div className="lk-sheet-notice">
            {pinStep === 'pinned'
              ? 'Xác nhận Thêm trên màn hình điện thoại.'
              : pinStep === 'synced'
                ? 'Đã cập nhật tiện ích.'
                : inApk
                  ? 'Nhấn giữ Màn hình chính → Tiện ích → Locket.'
                  : 'Cài bản APK Android để ghim tiện ích.'}
          </div>
        )}

        {/* Action Row */}
        <div className="lk-wdg-actions">
          {inApk && (
            <button type="button" className="lk-sheet-secondary" onClick={handleSyncNow}>
              Cập nhật
            </button>
          )}
          <button type="button" className="lk-sheet-primary" onClick={handleAddWidget}>
            Thêm ra màn hình chính
          </button>
        </div>

        {!inApk && (
          <a href={getApkDownloadUrl()} download="Locket-Photobooth.apk" className="lk-wdg-apk">
            Tải APK Android
          </a>
        )}
      </div>
    </div>,
    document.body
  );
}
