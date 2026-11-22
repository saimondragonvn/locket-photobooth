import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { resolveDisplayName } from '../../services/notificationService.js';

export const ROLLCALL_PROMPTS = [
  'Đang làm gì đó? Chụp liền 1 tấm 📸',
  'Góc học tập / làm việc lúc này 💻',
  'Món vừa ăn hoặc đồ uống gần bạn nhất 🧋',
  'Bầu trời chỗ bạn ngay lúc này 🌤️',
  'Selfie mặt ngáo không chỉnh sửa 🤪',
  'Fit check hôm nay của bạn 👟',
  'Người đang ngồi cạnh bạn lúc này 👀',
  'Thứ đầu tiên bên tay phải bạn 👉',
  'Tâm trạng hôm nay bằng 1 tấm ảnh ✨',
  'Chiếc view đẹp nhất quanh bạn 🌿',
  'Đang nghe bài gì đó? Chia sẻ ngay 🎧',
  'Góc chill buổi tối của bạn 🌙',
  'Khoe thú cưng hoặc góc dễ thương 🐾',
  'Check-in địa điểm hiện tại 📍',
  'Đôi giày / dép đang mang lúc này 🩴',
  'Khoảnh khắc vui nhất hôm nay 🎉',
];

function getTodayPromptIndex() {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return seed % ROLLCALL_PROMPTS.length;
}

/**
 * Official Locket-inspired Daily Rollcall Sheet ("Điểm danh hằng ngày")
 * - Daily rotating prompt + reroll dice
 * - Shows which friends already checked in within 24h (tap avatar to jump to their moment!)
 * - Shows friends who haven't checked in yet with 1-tap "👋 Nhắc nhẹ" chat nudge
 * - 1-tap "📸 Chụp Rollcall ngay" launches camera with the Rollcall prompt caption prefilled
 */
export function RollcallSheet({
  open,
  onClose,
  meUid,
  items = [],
  users = {},
  streak = null,
  friends = [],
  onStartRollcallCapture,
  onJumpToMoment,
  onNudgeFriend,
}) {
  const [promptIdx, setPromptIdx] = useState(getTodayPromptIndex);
  const [nudgedUids, setNudgedUids] = useState({});
  const [nudgeBusyUid, setNudgeBusyUid] = useState(null);

  useEffect(() => {
    if (open) setPromptIdx(getTodayPromptIndex());
  }, [open]);

  const activePrompt = ROLLCALL_PROMPTS[promptIdx % ROLLCALL_PROMPTS.length];

  const { mePostedToday, checkedInFriends, missingFriends } = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const latestByUser = new Map();
    let meToday = false;

    for (const m of items || []) {
      if (!m || !m.user || m.private) continue;
      const ts = Date.parse(m.date) || 0;
      if (ts < cutoff) continue;
      if (m.user === meUid) {
        meToday = true;
      } else if (!latestByUser.has(m.user)) {
        latestByUser.set(m.user, m);
      }
    }

    const checked = [];
    for (const [uid, moment] of latestByUser.entries()) {
      const prof = users[uid] || friends.find((f) => f.uid === uid) || { uid };
      checked.push({ uid, profile: prof, moment });
    }

    const missing = (friends || [])
      .filter((f) => f?.uid && f.uid !== meUid && !latestByUser.has(f.uid))
      .slice(0, 14);

    return {
      mePostedToday: meToday || Boolean(streak?.postedToday),
      checkedInFriends: checked,
      missingFriends: missing,
    };
  }, [items, users, friends, meUid, streak]);

  if (!open) return null;

  const streakNum = streak?.count || (mePostedToday ? 1 : 0);

  const handleReroll = () => {
    setPromptIdx((idx) => (idx + 1 + Math.floor(Math.random() * 3)) % ROLLCALL_PROMPTS.length);
  };

  const handleNudge = async (uid) => {
    if (!onNudgeFriend || nudgeBusyUid || nudgedUids[uid]) return;
    setNudgeBusyUid(uid);
    try {
      await onNudgeFriend(uid, `⚡ Rollcall hôm nay: "${activePrompt}" — Chụp 1 tấm Locket điểm danh nha!`);
      setNudgedUids((prev) => ({ ...prev, [uid]: true }));
    } catch {
      // toast handled by caller
    } finally {
      setNudgeBusyUid(null);
    }
  };

  return createPortal(
    <div className="lk-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Rollcall Điểm danh hôm nay" onClick={onClose}>
      <div className="lk-sheet-panel lk-rollcall-panel" onClick={(e) => e.stopPropagation()}>
        <div className="lk-sheet-handle" />
        <div className="lk-sheet-head">
          <h3>⚡ Rollcall hôm nay</h3>
          <button type="button" className="lk-sheet-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        {/* Daily Prompt Card */}
        <div className="lk-rc-prompt-card">
          <div className="lk-rc-prompt-top">
            <span className="lk-rc-pill">CHỦ ĐỀ HÔM NAY</span>
            <span className="lk-rc-streak">🔥 {streakNum} ngày</span>
          </div>
          <div className="lk-rc-prompt-text">{activePrompt}</div>
          <div className="lk-rc-prompt-actions">
            <button type="button" className="lk-rc-dice" onClick={handleReroll}>
              🎲 Đổi chủ đề
            </button>
            <button
              type="button"
              className="lk-rc-shoot"
              onClick={() => {
                onClose?.();
                onStartRollcallCapture?.(`⚡ ${activePrompt}`);
              }}
            >
              📸 {mePostedToday ? 'Chụp thêm Rollcall' : 'Chụp Rollcall ngay'}
            </button>
          </div>
          {mePostedToday && (
            <div className="lk-rc-done-note">✅ Bạn đã giữ chuỗi và điểm danh hôm nay!</div>
          )}
        </div>

        {/* Checked-in Friends (Last 24h) */}
        <div className="lk-rc-section">
          <div className="lk-rc-sec-title">
            Đã điểm danh 24h qua ({checkedInFriends.length})
          </div>
          {checkedInFriends.length > 0 ? (
            <div className="lk-rc-avatars">
              {checkedInFriends.map(({ uid, profile, moment }) => {
                const name = resolveDisplayName(profile, 'Bạn bè');
                return (
                  <button
                    key={uid}
                    type="button"
                    className="lk-rc-friend-pill"
                    onClick={() => {
                      onClose?.();
                      onJumpToMoment?.(moment.id);
                    }}
                  >
                    <div className="lk-rc-avatar-ring">
                      {profile?.profile_picture_url ? (
                        <img src={profile.profile_picture_url} alt="" />
                      ) : (
                        <span>{name[0]?.toUpperCase() || 'B'}</span>
                      )}
                      <span className="lk-rc-check-dot">✓</span>
                    </div>
                    <span className="lk-rc-friend-name">{name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="lk-rc-empty">Chưa có bạn bè nào đăng trong 24h qua — hãy là người mở bát!</div>
          )}
        </div>

        {/* Missing Friends — 1-Tap Nudge */}
        {missingFriends.length > 0 && (
          <div className="lk-rc-section">
            <div className="lk-rc-sec-title">
              Chưa điểm danh ({missingFriends.length})
            </div>
            <div className="lk-rc-missing-list">
              {missingFriends.map((f) => {
                const name = resolveDisplayName(f, 'Bạn bè');
                const done = Boolean(nudgedUids[f.uid]);
                const busy = nudgeBusyUid === f.uid;
                return (
                  <div key={f.uid} className="lk-rc-missing-row">
                    <div className="lk-rc-missing-av">
                      {f.profile_picture_url ? (
                        <img src={f.profile_picture_url} alt="" />
                      ) : (
                        <span>{name[0]?.toUpperCase() || 'B'}</span>
                      )}
                    </div>
                    <span className="lk-rc-missing-name">{name}</span>
                    <button
                      type="button"
                      className={`lk-rc-nudge-btn ${done ? 'done' : ''}`}
                      disabled={done || busy}
                      onClick={() => handleNudge(f.uid)}
                    >
                      {done ? '✓ Đã nhắc' : busy ? '...' : '👋 Nhắc nhẹ'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
