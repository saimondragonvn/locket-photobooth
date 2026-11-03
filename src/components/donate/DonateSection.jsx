import React, { useMemo, useRef, useState } from 'react';
import { registerModules, requireModule } from '../../runtime/moduleRegistry.js';

const BANK_CODE = 'MB';
const BANK_NAME = 'MB Bank';
const ACCOUNT_NUMBER = '2901200923';
const ACCOUNT_HOLDER = 'PHAN GIA HOAI';
const DEFAULT_NOTE = 'Ung ho Locket';
const AMOUNT_OPTIONS = [0, 10_000, 20_000, 50_000, 100_000];

const STYLES = {
  donate: 'Donate_donate__2XPqk',
  sheet: 'Donate_sheet__AFqB4',
  head: 'Donate_head__CZ8YS',
  'head-close': 'Donate_head-close__DExXb',
  grabber: 'Donate_grabber__y8h77',
  title: 'Donate_title__hKw1P',
  subtitle: 'Donate_subtitle__69FgV',
  card: 'Donate_card__haW-X',
  'qr-box': 'Donate_qr-box__-xhou',
  qr: 'Donate_qr__AQvUB',
  amounts: 'Donate_amounts__U8ej1',
  amount: 'Donate_amount__4B0hy',
  on: 'Donate_on__IrTAP',
  info: 'Donate_info__l-p8W',
  'info-row': 'Donate_info-row__LdvQq',
  'content-row': 'Donate_content-row__H8Dfs',
  code: 'Donate_code__xgHx3',
  copy: 'Donate_copy__M2rgi',
  note: 'Donate_note__s756q',
  'save-qr': 'Donate_save-qr__srP71',
};

function cx(...parts) {
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    if (typeof p === 'string') {
      out.push(STYLES[p] || p);
    } else if (typeof p === 'object') {
      for (const [k, v] of Object.entries(p)) {
        if (v) out.push(STYLES[k] || k);
      }
    }
  }
  return out.join(' ');
}

function formatVnd(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

function formatChipLabel(amount) {
  if (!amount) return 'Tuỳ tâm';
  return amount >= 1000 ? `${amount / 1000}K` : String(amount);
}

function buildVietQrUrl(amount) {
  const params = new URLSearchParams({
    accountName: ACCOUNT_HOLDER,
    addInfo: DEFAULT_NOTE,
  });
  if (amount > 0) {
    params.set('amount', String(amount));
  }
  return `https://img.vietqr.io/image/${BANK_CODE}-${ACCOUNT_NUMBER}-compact2.png?${params.toString()}`;
}

function CopyIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="12" height="12" rx="2.5" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </svg>
  );
}

export default function DonateSection({ onClose, suggestAmount = 0 }) {
  const [amount, setAmount] = useState(AMOUNT_OPTIONS.includes(suggestAmount) ? suggestAmount : 0);
  const touchStartYRef = useRef(null);

  const qrUrl = useMemo(() => buildVietQrUrl(amount), [amount]);

  const showToast = (msg, kind = 'success') => {
    try {
      const toastMod = requireModule(3401);
      const cfgMod = requireModule(1016);
      const fn = toastMod?.oR?.[kind] || toastMod?.oR?.info;
      fn?.(msg, cfgMod?.A?.toastSettings);
    } catch {
      // ignore if toast container not mounted
    }
  };

  const copyText = async (value, successMsg) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMsg, 'success');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast(successMsg, 'success');
      } catch {
        showToast(value, 'info');
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const saveQrImage = async () => {
    try {
      const mediaMod = requireModule(6506);
      const resp = await fetch(qrUrl);
      const blob = await resp.blob();
      mediaMod.H(blob, `vietqr-mbbank-${ACCOUNT_NUMBER}${amount ? `-${amount}` : ''}.png`);
      showToast('Đã lưu ảnh mã QR', 'success');
    } catch {
      window.open(qrUrl, '_blank', 'noopener,noreferrer');
    }
  };

  let CloseButton = null;
  try {
    CloseButton = requireModule(3434)?.Jn || null;
  } catch {
    CloseButton = null;
  }

  return (
    <div className={cx('donate', { sheet: Boolean(onClose) })}>
      <div
        className={cx('head')}
        onTouchStart={
          onClose
            ? (e) => {
                const atTop = ((e.currentTarget.parentElement?.scrollTop) || 0) <= 0;
                touchStartYRef.current = atTop ? (e.touches?.[0]?.clientY ?? null) : null;
              }
            : undefined
        }
        onTouchMove={
          onClose
            ? (e) => {
                const y = e.touches?.[0]?.clientY;
                if (touchStartYRef.current !== null && y - touchStartYRef.current > 60) {
                  touchStartYRef.current = null;
                  onClose();
                }
              }
            : undefined
        }
      >
        {onClose && (
          <button
            type="button"
            className={cx('grabber')}
            onClick={onClose}
            aria-label="Đóng"
          />
        )}
        {onClose && CloseButton && (
          <CloseButton className={cx('head-close')} onClick={onClose} />
        )}
        <h2 className={cx('title')}>Ủng hộ 💛</h2>
        <p className={cx('subtitle')}>
          Mọi tính năng đã được mở miễn phí 100%. Nếu thấy hữu ích, bạn có thể ủng hộ tuỳ tâm nhé!
        </p>
      </div>

      <section className={cx('card')}>
        <div className={cx('qr-box')}>
          <img
            key={qrUrl}
            src={qrUrl}
            alt={`Mã QR chuyển khoản ${BANK_NAME} ${ACCOUNT_NUMBER} - ${ACCOUNT_HOLDER}`}
            className={cx('qr')}
          />
        </div>

        <div className={cx('amounts')} role="group" aria-label="Chọn nhanh số tiền ủng hộ">
          {AMOUNT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              className={cx('amount', { on: amount === opt })}
              onClick={() => setAmount(opt)}
              aria-pressed={amount === opt}
            >
              {formatChipLabel(opt)}
            </button>
          ))}
        </div>

        <dl className={cx('info')}>
          <div className={cx('info-row')}>
            <dt>Ngân hàng</dt>
            <dd>{BANK_NAME}</dd>
          </div>

          <div className={cx('info-row')}>
            <dt>Chủ tài khoản</dt>
            <dd>{ACCOUNT_HOLDER}</dd>
          </div>

          <div className={cx('info-row', { 'content-row': amount <= 0 })}>
            <dt>Số tài khoản</dt>
            <dd>
              <strong className={cx('code')}>{ACCOUNT_NUMBER}</strong>
              <button
                type="button"
                className={cx('copy')}
                onClick={() => copyText(ACCOUNT_NUMBER, 'Đã sao chép số tài khoản')}
                aria-label="Sao chép số tài khoản"
              >
                <CopyIcon />
              </button>
            </dd>
          </div>

          {amount > 0 && (
            <div className={cx('info-row', 'content-row')}>
              <dt>Số tiền</dt>
              <dd>{formatVnd(amount)}</dd>
            </div>
          )}
        </dl>

        <p className={cx('note')}>
          Quét mã VietQR bằng ứng dụng ngân hàng bất kỳ hoặc sao chép số tài khoản{' '}
          <strong>{ACCOUNT_NUMBER}</strong> ({BANK_NAME} — <strong>{ACCOUNT_HOLDER}</strong>). Cảm ơn
          bạn rất nhiều! 💛
        </p>

        <button type="button" className={cx('save-qr')} onClick={saveQrImage}>
          Lưu ảnh QR
        </button>
      </section>
    </div>
  );
}

registerModules({
  9621: (_module, exports, req) => {
    req.r(exports);
    req.d(exports, { default: () => DonateSection });
  },
});
