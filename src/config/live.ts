const trim = (value?: string) => String(value || '').trim();

const runtimeOrigin =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : '';

const LIVE_ROOM_PATH_PREFIX =
  trim(process.env.UMI_APP_LIVE_ROOM_PATH_PREFIX) || '/live';

export const liveConfig = {
  antMediaWebSocketUrl: trim(process.env.UMI_APP_ANT_MEDIA_WEBSOCKET_URL) || '',
  antMediaWebRtcAdaptorScriptUrl:
    trim(process.env.UMI_APP_ANT_MEDIA_WEBRTC_ADAPTOR_SCRIPT_URL) || '',
  antMediaTurnUrl:
    trim(process.env.UMI_APP_ANT_MEDIA_TURN_URL) ||
    'turn:media.meownews.online:3478?transport=udp',
  antMediaTurnUsername:
    trim(process.env.UMI_APP_ANT_MEDIA_TURN_USERNAME) || 'ipb-meownews',
  antMediaTurnCredential:
    trim(process.env.UMI_APP_ANT_MEDIA_TURN_CREDENTIAL) || 'IPBMeow@2026#',
  hlsScriptUrl:
    trim(process.env.UMI_APP_HLS_SCRIPT_URL) ||
    'https://cdn.jsdelivr.net/npm/hls.js@1.5.18/dist/hls.min.js',
  watchPageOrigin: trim(process.env.UMI_APP_WATCH_PAGE_ORIGIN) || runtimeOrigin,
  watchPagePathPrefix: LIVE_ROOM_PATH_PREFIX,
} as const;

export const getLiveWatchPageUrl = (id?: string | number) => {
  if (!id) return '';

  const encodedId = encodeURIComponent(String(id));
  const pathPrefix = `/${String(
    liveConfig.watchPagePathPrefix || '/live',
  ).replace(/^\/+|\/+$/g, '')}`;
  const path = `${pathPrefix}/${encodedId}`;

  if (!liveConfig.watchPageOrigin) {
    return path;
  }

  return `${String(liveConfig.watchPageOrigin).replace(/\/$/, '')}${path}`;
};
