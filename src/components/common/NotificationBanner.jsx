import React, { useEffect, useRef, useState } from 'react';
import { IN_APP_NOTIFICATION_EVENT } from '../../services/notificationService.js';

/**
 * Sleek top-anchored floating notification banner for live Emote Reactions & Incoming Messages.
 * Supports tap-to-navigate (jump to chat thread or moment), swipe-up dismiss, and auto-dismiss.
 */
export function NotificationBanner({ onOpenChat, onOpenMoment }) {
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null);
  const timerRef = useRef(null);
  const touchStartYRef = useRef(null);

  useEffect(() => {
    const onNotif = (ev) => {
      const detail = ev?.detail;
      if (!detail) return;
      setQueue((prev) => {
        if (prev.some((x) => x.id === detail.id)) return prev;
        return [...prev.slice(-4), detail];
      });
    };
    window.addEventListener(IN_APP_NOTIFICATION_EVENT, onNotif);
    return () => window.removeEventListener(IN_APP_NOTIFICATION_EVENT, onNotif);
  }, []);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const [next, ...rest] = queue;
    setActive(next);
    setQueue(rest);
  }, [active, queue]);

  useEffect(() => {
    if (!active) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActive(null);
    }, 4600);
    return () => clearTimeout(timerRef.current);
  }, [active]);

  if (!active) return null;

  const handleClick = () => {
    clearTimeout(timerRef.current);
    const current = active;
    setActive(null);
    if (current.type === 'message' && current.peerUid && onOpenChat) {
      onOpenChat(current.peerUid);
    } else if (current.type === 'reaction' && current.momentId && onOpenMoment) {
      onOpenMoment(current.momentId);
    }
  };

  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches?.[0]?.clientY ?? null;
  };

  const handleTouchMove = (e) => {
    if (touchStartYRef.current === null) return;
    const dy = (e.touches?.[0]?.clientY ?? 0) - touchStartYRef.current;
    if (dy < -24) {
      touchStartYRef.current = null;
      clearTimeout(timerRef.current);
      setActive(null);
    }
  };

  return (
    <div
      className="lk-notif-wrap"
      role="status"
      aria-live="polite"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="lk-notif-card" onClick={handleClick}>
        <div className="lk-notif-avatar-box">
          {active.avatar ? (
            <img src={active.avatar} alt="" className="lk-notif-avatar" />
          ) : (
            <span className="lk-notif-avatar lk-notif-fallback">
              {active.type === 'reaction' ? active.emoji || '💛' : '💬'}
            </span>
          )}
          <span className="lk-notif-badge">
            {active.type === 'reaction' ? active.emoji || '✨' : '💬'}
          </span>
        </div>

        <div className="lk-notif-body">
          <div className="lk-notif-title">{active.title}</div>
          {active.body && <div className="lk-notif-sub">{active.body}</div>}
        </div>

        <button
          type="button"
          className="lk-notif-close"
          aria-label="Đóng thông báo"
          onClick={(e) => {
            e.stopPropagation();
            clearTimeout(timerRef.current);
            setActive(null);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
