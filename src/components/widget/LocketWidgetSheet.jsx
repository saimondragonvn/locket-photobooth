import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  isRunningInAndroidApk,
  pickLatestWidgetMoment,
  getSavedWidgetMoment,
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
  onNotify,
}) {
  const [previewMode, setPreviewMode] = useState('card'); // 'card' | 'live'
  const [pinStep, setPinStep] = useState(null); // null | 'pinned' | 'manual-guide'
  const inApk = isRunningInAndroidApk();

  const latestMoment = useMemo(() => {
    const picked = pickLatestWidgetMoment(items, users, meUid, 'friends');
    return picked || getSavedWidgetMoment();
  }, [items, users, meUid]);

  if (!open) return null;

  const handleAddWidget = () => {
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
    // On Web/Mobile Browser: show manual guide + direct APK download
    setPinStep('manual-guide');
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
        background: 'rgba(0, 0, 0, 0.72)',
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
          background: '#1e1e20',
          color: '#ffffff',
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          padding: '12px 22px 28px',
          boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          animation: 'locketWidgetSheetUp 220ms cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
      >
        {/* Top Grab Handle */}
        <div
          style={{
            width: '42px',
            height: '4.5px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.24)',
            marginBottom: '14px',
          }}
        />

        {/* Header Row: Back Arrow + Locket */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Quay lại"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 4px',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            <span>Locket</span>
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
              {previewMode === 'card' ? 'Xem ảnh trực tiếp' : 'Xem thẻ Your Friends'}
            </button>
          )}
        </div>

        {/* Center Title & Subtitle matching Android Widget Picker */}
        <div
          style={{
            fontSize: '21px',
            fontWeight: 600,
            color: '#f3f4f6',
            marginTop: '4px',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          Locket
        </div>
        <div
          style={{
            fontSize: '15px',
            color: '#9ca3af',
            textAlign: 'center',
            lineHeight: 1.4,
            marginBottom: '22px',
            maxWidth: '340px',
          }}
        >
          Live pics from your friends, on your home screen
        </div>

        {/* Large Dark Rounded Preview Stage */}
        <div
          onClick={() => latestMoment && setPreviewMode((m) => (m === 'card' ? 'live' : 'card'))}
          title={latestMoment ? 'Chạm để chuyển chế độ xem trước tiện ích' : undefined}
          style={{
            width: '100%',
            aspectRatio: '1.08 / 1',
            maxHeight: '320px',
            background: '#2b2b2e',
            borderRadius: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '22px',
            position: 'relative',
            cursor: latestMoment ? 'pointer' : 'default',
            userSelect: 'none',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
        >
          {previewMode === 'live' && latestMoment?.imageUrl ? (
            /* Live Friend Photo Widget Preview (matches top-right widget on user's home screen) */
            <div
              style={{
                width: '176px',
                height: '176px',
                borderRadius: '28px',
                overflow: 'hidden',
                position: 'relative',
                border: '2.5px solid rgba(165, 180, 252, 0.45)',
                boxShadow: '0 14px 34px rgba(0, 0, 0, 0.5)',
                background: '#141416',
              }}
            >
              <img
                src={latestMoment.imageUrl}
                alt={latestMoment.authorName || 'Locket'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 'auto 0 0 0',
                  padding: '22px 10px 9px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                }}
              >
                {latestMoment.authorAvatar ? (
                  <img
                    src={latestMoment.authorAvatar}
                    alt=""
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid #f6c453',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: '#f6c453',
                      color: '#1c1c1e',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {(latestMoment.authorName || 'B')[0]?.toUpperCase()}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#ffffff',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {latestMoment.authorName}
                </span>
              </div>
            </div>
          ) : (
            /* Exact "Your Friends" Gold-Ring Heart Widget Tile from Screenshot */
            <div
              style={{
                width: '158px',
                height: '158px',
                borderRadius: '26px',
                background: 'linear-gradient(180deg, #242427 0%, #151517 100%)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '14px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#48484c',
                  border: '2.6px solid #f5b400',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(245, 180, 0, 0.22)',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
                  <path d="M12 20.4s-7.6-4.45-7.6-10.15A4.35 4.35 0 0 1 12 7.3a4.35 4.35 0 0 1 7.6 2.95c0 5.7-7.6 10.15-7.6 10.15z" />
                </svg>
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.2px',
                }}
              >
                Your Friends
              </div>
            </div>
          )}
        </div>

        {/* Status / Instruction Banner when user taps "Thêm vào Màn hình nền" */}
        {pinStep === 'pinned' && (
          <div
            style={{
              width: '100%',
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#a7f3d0',
              borderRadius: '16px',
              padding: '12px 14px',
              fontSize: '13.5px',
              lineHeight: 1.45,
              marginBottom: '14px',
              textAlign: 'center',
            }}
          >
            ✅ Đã gửi yêu cầu thêm tiện ích <strong>Locket (Your Friends)</strong> ra Màn hình nền! Hãy nhấn xác nhận <strong>Thêm</strong> trên thông báo của điện thoại.
          </div>
        )}

        {pinStep === 'manual-guide' && (
          <div
            style={{
              width: '100%',
              background: 'rgba(59, 130, 246, 0.13)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: '#dbeafe',
              borderRadius: '16px',
              padding: '13px 15px',
              fontSize: '13px',
              lineHeight: 1.5,
              marginBottom: '14px',
            }}
          >
            {inApk ? (
              <>
                <strong>📱 Cách ghim tiện ích trên dòng máy của bạn:</strong>
                <div style={{ marginTop: '4px', color: '#bfdbfe' }}>
                  1. Ra <strong>Màn hình chính</strong> điện thoại, nhấn giữ vào khoảng trống.<br />
                  2. Chọn <strong>Tiện ích (Widgets)</strong> → tìm <strong>Locket</strong>.<br />
                  3. Chọn thẻ <strong>Your Friends</strong> và bấm <strong>Thêm vào Màn hình nền</strong>.
                </div>
              </>
            ) : (
              <>
                <strong>📲 Cài đặt ứng dụng APK để có Widget màn hình nền:</strong>
                <div style={{ marginTop: '4px', color: '#bfdbfe' }}>
                  Trình duyệt web không thể tự ghim Widget hệ thống Android. Hãy tải và cài file <strong>Locket-Photobooth.apk</strong> bên dưới, sau đó mở app hoặc nhấn giữ Màn hình nền → <strong>Tiện ích (Widgets)</strong> → <strong>Locket (Your Friends)</strong>!
                </div>
              </>
            )}
          </div>
        )}

        {/* Primary Blue Pill Button: "Thêm vào Màn hình nền" (Exact match to screenshot) */}
        <button
          type="button"
          onClick={handleAddWidget}
          style={{
            width: '100%',
            maxWidth: '330px',
            height: '52px',
            borderRadius: '999px',
            border: 'none',
            background: '#1b6ef3',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 22px rgba(27, 110, 243, 0.38)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>Thêm vào Màn hình nền</span>
        </button>

        {/* Direct APK Download Link when accessed from Web Browser */}
        {!inApk && (
          <a
            href={getApkDownloadUrl()}
            download="Locket-Photobooth.apk"
            style={{
              marginTop: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              color: '#93c5fd',
              fontSize: '13.5px',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '999px',
              background: 'rgba(59, 130, 246, 0.12)',
            }}
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
              <path d="M12 3v12m0 0-4-4m4 4 4-4" />
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            <span>Tải trực tiếp Locket-Photobooth.apk (Android + Widget)</span>
          </a>
        )}
      </div>
    </div>,
    document.body
  );
}

