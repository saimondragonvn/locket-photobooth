import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  APP_ICON_OPTIONS,
  getActiveAppIcon,
  setNativeAppIcon,
} from '../../services/nativeWidgetBridge.js';

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/**
 * Lowkey Minimalist Dark App Icon Switcher Sheet
 */
export function AppIconPickerSheet({ open, onClose }) {
  const [selected, setSelected] = useState(getActiveAppIcon);
  const [notice, setNotice] = useState('');

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
      setNotice('Đã đổi biểu tượng ứng dụng.');
    } else if (!res.native) {
      setNotice('Đã lưu (hỗ trợ đổi icon thật trên APK Android).');
    } else {
      setNotice('Thiết bị không hỗ trợ đổi icon tự động.');
    }
  };

  return createPortal(
    <div className="lk-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Biểu tượng ứng dụng" onClick={onClose}>
      <div className="lk-sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="lk-sheet-handle" />
        <div className="lk-sheet-head">
          <h3>Biểu tượng ứng dụng</h3>
          <button type="button" className="lk-sheet-close" onClick={onClose} aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

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
                    boxShadow: `inset 0 0 0 2px ${ic.ring}`,
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill={ic.heart} aria-hidden="true">
                    <path d="M12 20.4s-7.6-4.45-7.6-10.15A4.35 4.35 0 0 1 12 7.3a4.35 4.35 0 0 1 7.6 2.95c0 5.7-7.6 10.15-7.6 10.15z" />
                  </svg>
                  {active && (
                    <span className="lk-icon-check">
                      <CheckIcon />
                    </span>
                  )}
                </div>
                <span className="lk-icon-name">{ic.name}</span>
              </button>
            );
          })}
        </div>

        {notice && <div className="lk-sheet-notice">{notice}</div>}
      </div>
    </div>,
    document.body
  );
}
