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

export function LocketWidgetSheet({
  open,
  onClose,
  items = [],
  users = {},
  meUid = null,
  streakCount = 0,
  onNotify,
}) {
  const [previewMode, setPreviewMode] = useState('live'); // 'live' | 'card'
  const [pinStep, setPinStep] = useState(null); // null | 'pinned' | 'manual-guide' | 'updated'
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
    if (latestMoment) {
      syncMomentToNativeWidget(latestMoment);
    }
    if (inApk) {
      const res = requestPinNativeWidget('friends');
      triggerNativeWidgetRefresh();
      if (res.ok) {
        setPinStep('pinned');
        onNotify?.('Đã mở bảng thêm tiện ích Locket ra Màn hình nền!');
      } else {
        setPinStep('manual-guide');
      }
      return;
    }
    setPinStep('manual-guide');
  };

  const handleSyncNow = () => {
    saveAndSyncWidgetConfig({
      borderStyle: widgetCfg.borderStyle,
      showStreak: widgetCfg.showStreak,
      streakCount: displayStreak,
    });
    if (latestMoment) syncMomentToNativeWidget(latestMoment);
    triggerNativeWidgetRefresh();
    setPinStep('updated');
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tiện ích màn hình nền Locket"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.74)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '92dvh',
          overflowY: 'auto',
          background: '#1c1c1f',
          color: '#ffffff',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          padding: '12px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
          boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '4.5px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.24)',
            marginBottom: '12px',
          }}
        />

        {/* Header */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Quay lại"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '19px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            <span>Tiện ích Locket</span>
          </button>

          {latestMoment && (
            <button
              type="button"
              onClick={() => setPreviewMode((m) => (m === 'card' ? 'live' : 'card'))}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                color: '#e5e7eb',
                fontSize: '12px',
                fontWeight: 600,
                padding: '5px 11px',
                borderRadius: '999px',
                cursor: 'pointer',
              }}
            >
              {previewMode === 'card' ? 'Xem ảnh live' : 'Xem thẻ mặc định'}
            </button>
          )}
        </div>

        {/* Live Preview Stage with Border & Streak Badge */}
        <div
          onClick={() => latestMoment && setPreviewMode((m) => (m === 'card' ? 'live' : 'card'))}
          style={{
            width: '100%',
            padding: '20px 14px',
            background: '#26262a',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '14px',
            cursor: latestMoment ? 'pointer' : 'default',
            userSelect: 'none',
          }}
        >
          {previewMode === 'live' && latestMoment?.imageUrl ? (
            <div
              style={{
                width: '184px',
                height: '184px',
                borderRadius: '30px',
                padding: widgetCfg.borderStyle === 'none' ? '0px' : '4.5px',
                background: activeBorder.cssBorder,
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.55)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: widgetCfg.borderStyle === 'none' ? '30px' : '26px',
                  overflow: 'hidden',
                  position: 'relative',
                  background: '#141416',
                }}
              >
                <img
                  src={latestMoment.imageUrl}
                  alt={latestMoment.authorName || 'Locket'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />

                {/* Top-Left Streak Pill */}
                {widgetCfg.showStreak && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '9px',
                      left: '9px',
                      background: 'rgba(28, 17, 6, 0.82)',
                      border: '1px solid rgba(246, 196, 83, 0.78)',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      color: '#ffe27a',
                    }}
                  >
                    🔥 {displayStreak > 0 ? displayStreak : 1}
                  </div>
                )}

                {/* Caption Pill */}
                {latestMoment.caption && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '36px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      maxWidth: '86%',
                      background: 'rgba(18, 19, 22, 0.72)',
                      border: '1px solid rgba(255,255,255,0.16)',
                      borderRadius: '999px',
                      padding: '3px 9px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {latestMoment.caption}
                  </div>
                )}

                {/* Author Pill */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '9px',
                    left: '9px',
                    background: 'rgba(18, 19, 22, 0.72)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    borderRadius: '999px',
                    padding: '3px 8px 3px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    maxWidth: '80%',
                  }}
                >
                  {latestMoment.authorAvatar && (
                    <img
                      src={latestMoment.authorAvatar}
                      alt=""
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {latestMoment.authorName}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: '164px',
                height: '164px',
                borderRadius: '28px',
                background: 'linear-gradient(180deg, #242427 0%, #151517 100%)',
                border: '3px solid #f5b400',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.48)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '62px',
                  height: '62px',
                  borderRadius: '50%',
                  background: '#48484c',
                  border: '2.6px solid #f5b400',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                  <path d="M12 20.4s-7.6-4.45-7.6-10.15A4.35 4.35 0 0 1 12 7.3a4.35 4.35 0 0 1 7.6 2.95c0 5.7-7.6 10.15-7.6 10.15z" />
                </svg>
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff' }}>Your Friends</div>
            </div>
          )}
        </div>

        {/* Border Style Picker */}
        <div style={{ width: '100%', marginBottom: '12px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#a1a1aa', marginBottom: '8px' }}>
            Viền tiện ích (Locket Gold)
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {WIDGET_BORDER_STYLES.map((b) => {
              const active = widgetCfg.borderStyle === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBorderSelect(b.id)}
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 11px',
                    borderRadius: '999px',
                    border: active ? '1.5px solid #f6c453' : '1px solid rgba(255,255,255,0.14)',
                    background: active ? 'rgba(246,196,83,0.18)' : 'rgba(255,255,255,0.06)',
                    color: active ? '#ffe27a' : '#e4e4e7',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background: b.id === 'none' ? 'rgba(255,255,255,0.12)' : b.cssBorder,
                      border: b.id === 'none' ? '1px dashed #9ca3af' : 'none',
                    }}
                  />
                  {b.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Show Streak Toggle */}
        <button
          type="button"
          onClick={handleToggleStreak}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '11px 14px',
            marginBottom: '14px',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>🔥 Hiện chuỗi ngày trên tiện ích</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              {displayStreak > 0 ? `Chuỗi hiện tại của bạn: 🔥 ${displayStreak} ngày` : 'Tự động đồng bộ chuỗi Locket hàng ngày'}
            </div>
          </div>
          <span
            style={{
              width: '44px',
              height: '25px',
              borderRadius: '999px',
              background: widgetCfg.showStreak ? '#f6c453' : 'rgba(255,255,255,0.2)',
              position: 'relative',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2.5px',
                left: widgetCfg.showStreak ? '21px' : '2.5px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.15s',
              }}
            />
          </span>
        </button>

        {pinStep === 'pinned' && (
          <div
            style={{
              width: '100%',
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#a7f3d0',
              borderRadius: '14px',
              padding: '10px 12px',
              fontSize: '13px',
              marginBottom: '12px',
              textAlign: 'center',
            }}
          >
            ✅ Đã gửi yêu cầu thêm tiện ích ra Màn hình nền! Hãy nhấn <strong>Thêm</strong> trên máy.
          </div>
        )}

        {pinStep === 'updated' && (
          <div
            style={{
              width: '100%',
              background: 'rgba(246, 196, 83, 0.15)',
              border: '1px solid rgba(246, 196, 83, 0.4)',
              color: '#ffe27a',
              borderRadius: '14px',
              padding: '10px 12px',
              fontSize: '13px',
              marginBottom: '12px',
              textAlign: 'center',
            }}
          >
            ✨ Đã cập nhật viền & chuỗi 🔥 lên tiện ích Màn hình chính!
          </div>
        )}

        {pinStep === 'manual-guide' && (
          <div
            style={{
              width: '100%',
              background: 'rgba(59, 130, 246, 0.13)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: '#dbeafe',
              borderRadius: '14px',
              padding: '11px 13px',
              fontSize: '12.5px',
              lineHeight: 1.45,
              marginBottom: '12px',
            }}
          >
            {inApk
              ? 'Nhấn giữ Màn hình chính → Tiện ích (Widgets) → chọn Locket (Your Friends).'
              : 'Hãy tải và cài file Locket-Photobooth.apk để thêm Widget có viền & chuỗi ra màn hình chính Android.'}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          {inApk && (
            <button
              type="button"
              onClick={handleSyncNow}
              style={{
                flex: 1,
                height: '48px',
                borderRadius: '999px',
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cập nhật ngay
            </button>
          )}
          <button
            type="button"
            onClick={handleAddWidget}
            style={{
              flex: 1.4,
              height: '48px',
              borderRadius: '999px',
              border: 'none',
              background: '#1b6ef3',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(27, 110, 243, 0.35)',
            }}
          >
            Thêm vào Màn hình nền
          </button>
        </div>

        {!inApk && (
          <a
            href={getApkDownloadUrl()}
            download="Locket-Photobooth.apk"
            style={{
              marginTop: '10px',
              color: '#93c5fd',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ⬇ Tải Locket-Photobooth.apk (Android + Widget)
          </a>
        )}
      </div>
    </div>,
    document.body
  );
}
