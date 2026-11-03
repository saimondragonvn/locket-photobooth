import { registerModules } from '../runtime/moduleRegistry.js';

/**
 * Same-origin proxy base ("") in localhost Vite dev/preview & Vercel rewrites,
 * or custom VITE_LOCKET_API_URL when explicitly configured.
 */
const API_ORIGIN = (import.meta.env.VITE_LOCKET_API_URL || '').replace(/\/+$/, '');
const LOCKET_BASE = `${API_ORIGIN}/locket`;

export const apiConfig = {
  API_ORIGIN,
  apiRoutes: {
    LOGIN_KEY_URL: `${LOCKET_BASE}/login-key`,
    LOGIN_URL: `${LOCKET_BASE}/login`,
    UPGRADE_LOGIN_URL: `${LOCKET_BASE}/upgrade-login`,
    REFRESH_URL: `${LOCKET_BASE}/refresh`,
    UPLOAD_MEDIA_URL: `${LOCKET_BASE}/upload-media`,
    UPLOAD_STATUS_URL: (jobId) => `${LOCKET_BASE}/upload-media/${jobId}`,
    UPLOAD_SESSION_URL: `${LOCKET_BASE}/upload-session`,
    PUBLISH_IMAGE_URL: `${LOCKET_BASE}/publish-image`,
    PUBLISH_VIDEO_URL: `${LOCKET_BASE}/publish-video`,
    UPLOAD_PART_URL: `${LOCKET_BASE}/upload-part`,
    UPLOAD_PART_STATUS_URL: `${LOCKET_BASE}/upload-part/status`,
    GET_USER_BY_USERNAME_URL: `${LOCKET_BASE}/get-user-by-username`,
    CHANGE_NAME_ACCOUNT_URL: `${LOCKET_BASE}/change-name-account`,
    GET_ACCOUNT_INFO_URL: `${LOCKET_BASE}/get-account-info`,
    GET_LAST_MOMENT_URL: `${LOCKET_BASE}/get-last-moment`,
    CREATE_ACCOUNT_URL: `${LOCKET_BASE}/create-account`,
    CAPTION_PRESETS_URL: `${LOCKET_BASE}/caption-presets`,
    REACT_MOMENT_URL: `${LOCKET_BASE}/react-moment`,
    MARK_VIEWED_URL: `${LOCKET_BASE}/mark-viewed`,
    GET_MOMENT_VIEWS_URL: `${LOCKET_BASE}/get-moment-views`,
    MOMENT_ACTIVITY_URL: `${LOCKET_BASE}/moment-activity`,
    MOMENT_AUDIENCE_URL: `${LOCKET_BASE}/moment-audience`,
    DELETE_MOMENT_URL: `${LOCKET_BASE}/delete-moment`,
    MEDIA_URL: `${LOCKET_BASE}/media`,
    MEDIA_STATUS_URL: `${LOCKET_BASE}/media-status`,
    PLAYABLE_VIDEO_URL: `${LOCKET_BASE}/playable-video`,
    PRIVATE_MOMENTS_URL: `${LOCKET_BASE}/private-moments`,
    DELETE_PRIVATE_MOMENT_URL: `${LOCKET_BASE}/private-moment/delete`,
    DONATE_ME_URL: `${LOCKET_BASE}/donate/me`,
    DONATE_STATUS_URL: `${LOCKET_BASE}/donate/status`,
    DONATE_NAME_URL: `${LOCKET_BASE}/donate/name`,
    DONATE_LIST_URL: `${LOCKET_BASE}/donate/list`,
    CHANGE_AVATAR_URL: `${LOCKET_BASE}/change-avatar`,
    COMMENT_MOMENT_URL: `${LOCKET_BASE}/comment-moment`,
    FEED_URL: `${LOCKET_BASE}/feed`,
    MEMORIES_STATS_URL: `${LOCKET_BASE}/memories-stats`,
    CAPTION_WEATHER_URL: `${LOCKET_BASE}/caption-weather`,
    CAPTION_PLACES_URL: `${LOCKET_BASE}/caption-places`,
    FRIENDS_URL: `${LOCKET_BASE}/friends`,
    FRIEND_REQUESTS_URL: `${LOCKET_BASE}/friend-requests`,
    FRIEND_ACTION_URL: `${LOCKET_BASE}/friend-action`,
    CONVERSATIONS_URL: `${LOCKET_BASE}/conversations`,
    MESSAGES_URL: `${LOCKET_BASE}/messages`,
    SEND_MESSAGE_URL: `${LOCKET_BASE}/send-message`,
    MARK_READ_URL: `${LOCKET_BASE}/mark-read`,
    DELETE_MESSAGE_URL: `${LOCKET_BASE}/delete-message`,
    REACT_MESSAGE_URL: `${LOCKET_BASE}/react-message`,
    REPORT_MESSAGE_URL: `${LOCKET_BASE}/report-message`,
  },
  toastSettings: {
    position: 'bottom-right',
    autoClose: 2000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  },
};

registerModules({
  1016: (_e, t, n) => {
    n.d(t, { A: () => apiConfig });
  },
});
