import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  APP_ICON_OPTIONS,
  getActiveAppIcon,
  setNativeAppIcon,
  isRunningInAndroidApk,
} from '../../services/nativeWidgetBridge.js';

/**
 * Native Android App Icon Switcher Sheet (Locket Gold feature)
 * Lets users switch the actual Android Home Screen Launcher icon across 6 styles.
 */
export function AppIconPickerSheet({ open, onClose }) {
  const [selected, setSelected] = useState(getActiveAppIcon);
  const [notice, setNotice] = useState('');
  const inApk = isRunningInAndroidApk();

  useEffect(() => {
    if (open) {
      setSelected(getActiveAppIcon());
      setNotice('');
    }
  }, [open]);

  if (!open) return null;

  const handlePick = (iconId) => {
    setSelected(iconId);
    const res = setNativeAppIcon(iconId);
    if (res.native && res.ok) {
      setNotice('✅ Đã đổi biểu tượng ứng dụng! Màn hình chính sẽ tự cập nhật sau vài giây.');
    } else if (!res.native) {
      setNotice('💡 Đã lưu lựa chọn! Cài đặt bản Android APK để đổi biểu tượng thật ngoài Màn hình chính.');
    } else {
      setNotice('⚠️ Không đổi được biểu tượng trên dòng máy này.');
    }
  };

  return createPortal(
    <div className="lk-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Đổi biểu tượng ứng dụng" onClick={onClose}>
      <div className="lk-sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="lk-sheet-handle" />
        <div className="lk-sheet-head">
          <h3>Đổi biểu tượng ứng dụng</h3>
          <button type="button" className="lk-sheet-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        <p className="lk-sheet-sub">
          {inApk
            ? 'Chọn biểu tượng Locket bạn thích để hiển thị ngoài Màn hình chính điện thoại.'
            : 'Xem trước 6 biểu tượng Locket Gold (hỗ trợ đổi thật trên ứng dụng Android APK).'}
        </p>

        <div className="lk-icon-grid">
          {APP_ICON_OPTIONS.map((ic) => {
            const active = selected === ic.id;
            return (
              <button
                key={ic.id}
                type="button"
                className={`lk-icon-card ${active ? 'on' : ''}`}
                onClick={() => handlePick(ic.id)}
              >
                <div
                  className="lk-icon-tile"
                  style={{
                    background: ic.bg,
                    boxShadow: `inset 0 0 0 2.5px ${ic.ring}, 0 8px 18px rgba(0,0,0,0.4)`,
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill={ic.heart} aria-hidden="true">
                    <path d="M12 20.4s-7.6-4.45-7.6-10.15A4.35 4.35 0 0 1 12 7.3a4.35 4.35 0 0 1 7.6 2.95c0 5.7-7.6 10.15-7.6 10.15z" />
                  </svg>
                  {active && <span className="lk-icon-check">✓</span>}
                </div>
                <span className="lk-icon-name">{ic.name}</span>
                <span className="lk-icon-desc">{ic.desc}</span>
              </button>
            );
          })}
        </div>

        {notice && <div className="lk-sheet-notice">{notice}</div>}

        <button type="button" className="lk-sheet-primary" onClick={onClose}>
          Xong
        </button>
      </div>
    </div>,
    document.body
  );
}
