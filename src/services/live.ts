import { getAccessToken } from '@/utils/auth';

import { getValidAccessToken, requestJson } from '@/services/auth';

export type LiveBroadcast = {
  id: number | string;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  visibility?: string;
  status?: string;
  viewer_count?: number;
  viewerCount?: number;
  stream_key?: string;
  rtmp_url?: string;
  playback_url?: string;
  watch_url?: string;
  publish_session?: LivePublishSession;
  payment_address?: string;
  thumbnail_url?: string;
  preview_image_url?: string;
  snapshot_url?: string;
  creator?: {
    id?: number | string;
    name?: string;
    username?: string;
    email?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  created_at?: string;
  started_at?: string;
  ended_at?: string;
  [key: string]: any;
  normalized_status?: FrontendLiveStatus;
};

export type LivePublishSession = {
  mode?: string;
  session_id?: string;
  expires_at?: string | null;
  ant_media?: {
    websocket_url?: string;
    adaptor_script_url?: string;
    stream_id?: string;
    app_name?: string;
    publish_mode?: string;
    [key: string]: any;
  };
  constraints?: {
    video?: boolean;
    audio?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
};

export type LiveBroadcastStatus = {
  id?: string | number;
  status?: string;
  django_status?: string;
  effective_status?: string;
  status_source?: string;
  raw_ant_media_status?: string;
  sync_ok?: boolean;
  sync_error?: string;
  message?: string;
  can_start?: boolean;
  can_end?: boolean;
  viewer_count?: number;
  viewerCount?: number;
  playback_url?: string;
  watch_url?: string;
  normalized_status?: FrontendLiveStatus;
  [key: string]: any;
};

export type LivePrepareResponse = {
  message?: string;
  publish_session?: LivePublishSession;
  [key: string]: any;
};

export type FrontendLiveStatus =
  // Created in backend and ready for configuration, not ingesting media yet.
  | 'ready'
  // Session exists, backend is waiting for encoder/browser signal.
  | 'waiting_for_signal'
  // Backend confirms media ingest/broadcast is active.
  | 'live'
  // Backend marks stream lifecycle as finished.
  | 'ended';

export const normalizeLiveStatus = (
  value?: string | null,
): FrontendLiveStatus => {
  const status = String(value || '')
    .toLowerCase()
    .trim();

  if (['live', 'started', 'broadcasting', 'publishing'].includes(status)) {
    return 'live';
  }

  if (['ready', 'created', 'prepared', 'session_created'].includes(status)) {
    return 'ready';
  }

  if (['ended', 'finished', 'completed', 'stopped'].includes(status)) {
    return 'ended';
  }

  if (
    [
      'waiting',
      'waiting_for_signal',
      'pending',
      'starting',
      'signal_pending',
    ].includes(status)
  ) {
    return 'waiting_for_signal';
  }

  return 'waiting_for_signal';
};

const withAuth = async (options: RequestInit = {}) => {
  const accessToken = await getValidAccessToken();
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${accessToken}`,
    },
  };
};
const withOptionalAuth = (options: RequestInit = {}) => {
  const accessToken = getAccessToken();
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  };
};

const normalizeBroadcast = (item: any): LiveBroadcast => {
  const rawStatus = item?.status || item?.live_status || 'created';
  const rawPublishSession = item?.publish_session || item?.publishSession;
  const rawAntMedia =
    rawPublishSession?.ant_media || rawPublishSession?.antMedia;

  return {
    ...item,
    id: item?.id ?? item?.pk ?? item?.stream_id ?? item?.streamId,
    title: item?.title || item?.name || 'Untitled live stream',
    name: item?.name || item?.title || 'Untitled live stream',
    category: item?.category || item?.category_name || item?.category_display,
    status: rawStatus,
    normalized_status: normalizeLiveStatus(rawStatus),
    viewer_count: item?.viewer_count ?? item?.viewerCount ?? 0,
    viewerCount: item?.viewerCount ?? item?.viewer_count ?? 0,
    stream_key: item?.stream_key || item?.streamKey || '',
    rtmp_url: item?.rtmp_url || item?.rtmpUrl || '',
    playback_url: item?.playback_url || item?.playbackUrl || '',
    watch_url: item?.watch_url || item?.watchUrl || '',
    publish_session: rawPublishSession
      ? {
          ...rawPublishSession,
          mode: rawPublishSession?.mode || '',
          session_id: rawPublishSession?.session_id || '',
          expires_at: rawPublishSession?.expires_at || null,
          ant_media: rawAntMedia
            ? {
                ...rawAntMedia,
                websocket_url:
                  rawAntMedia?.websocket_url || rawAntMedia?.websocketUrl || '',
                adaptor_script_url:
                  rawAntMedia?.adaptor_script_url ||
                  rawAntMedia?.adaptorScriptUrl ||
                  '',
                stream_id:
                  rawAntMedia?.stream_id || rawAntMedia?.streamId || '',
                app_name: rawAntMedia?.app_name || rawAntMedia?.appName || '',
                publish_mode:
                  rawAntMedia?.publish_mode || rawAntMedia?.publishMode || '',
              }
            : undefined,
          constraints: rawPublishSession?.constraints || {},
        }
      : undefined,
    payment_address: item?.payment_address || item?.wallet_address || '',
    thumbnail_url: (item?.thumbnail_url || item?.thumbnailUrl || '')
      .toString()
      .trim(),
    preview_image_url: (
      item?.preview_image_url ||
      item?.previewImageUrl ||
      item?.poster_url ||
      ''
    )
      .toString()
      .trim(),
    snapshot_url: (item?.snapshot_url || item?.snapshotUrl || '')
      .toString()
      .trim(),
    creator: item?.creator
      ? {
          ...item.creator,
          name:
            item.creator?.name ||
            item.creator?.username ||
            item.creator?.email ||
            'Creator',
        }
      : undefined,
  };
};

export const getSafeWatchUrl = (
  live?: {
    id?: string | number;
    watch_url?: string;
  } | null,
) => {
  if (!live?.id) {
    return '';
  }

  const canonicalWatchUrl = String(live.watch_url || '').trim();
  if (canonicalWatchUrl) {
    return canonicalWatchUrl;
  }

  return `/live/${encodeURIComponent(String(live.id))}`;
};

const normalizeBroadcastStatus = (payload: any): LiveBroadcastStatus => {
  const rawStatus =
    payload?.effective_status ||
    payload?.status ||
    payload?.django_status ||
    payload?.live_status ||
    '';
  const normalizedStatus = normalizeLiveStatus(rawStatus);

  return {
    ...payload,
    id: payload?.id ?? payload?.live_id ?? payload?.stream_id ?? undefined,
    status: payload?.status || payload?.django_status || '',
    django_status: payload?.django_status || payload?.status || '',
    effective_status:
      payload?.effective_status || payload?.status || payload?.django_status,
    status_source: payload?.status_source || '',
    raw_ant_media_status:
      payload?.raw_ant_media_status || payload?.ant_media_status || '',
    sync_ok: typeof payload?.sync_ok === 'boolean' ? payload.sync_ok : true,
    sync_error: payload?.sync_error || '',
    message: payload?.message || '',
    can_start:
      typeof payload?.can_start === 'boolean'
        ? payload.can_start
        : normalizedStatus !== 'live',
    can_end:
      typeof payload?.can_end === 'boolean'
        ? payload.can_end
        : normalizedStatus !== 'ended',
    viewer_count: payload?.viewer_count ?? payload?.viewerCount ?? 0,
    viewerCount: payload?.viewerCount ?? payload?.viewer_count ?? 0,
    playback_url: payload?.playback_url || payload?.playbackUrl || '',
    watch_url: payload?.watch_url || payload?.watchUrl || '',
    normalized_status: normalizedStatus,
  };
};

const normalizeBroadcastList = (payload: any): LiveBroadcast[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeBroadcast);
  }

  if (Array.isArray(payload?.results)) {
    return payload.results.map(normalizeBroadcast);
  }

  return [];
};

export async function getLiveList(): Promise<LiveBroadcast[]> {
  const payload = await requestJson<any>(
    '/api/live/',
    withOptionalAuth({ method: 'GET' }),
  );
  return normalizeBroadcastList(payload);
}

export async function getLiveBroadcast(
  id: string | number,
): Promise<LiveBroadcast> {
  const payload = await requestJson<any>(`/api/live/${id}/`, { method: 'GET' });
  return normalizeBroadcast(payload);
}

export async function getLiveBroadcastStatus(
  id: string | number,
): Promise<LiveBroadcastStatus> {
  const payload = await requestJson<any>(
    `/api/live/${id}/status/`,
    withOptionalAuth({ method: 'GET' }),
  );
  return normalizeBroadcastStatus(payload);
}

export async function createLiveBroadcast(payload: {
  title: string;
  category?: string;
  visibility: string;
  description?: string;
  payment_address?: string;
}): Promise<LiveBroadcast> {
  const response = await requestJson<any>(
    '/api/live/create/',
    await withAuth({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  return normalizeBroadcast(response);
}

export async function prepareLiveBroadcast(
  id: string | number,
): Promise<LiveBroadcast> {
  const response = await requestJson<any>(
    `/api/live/${id}/prepare/`,
    await withAuth({ method: 'POST' }),
  );
  console.log('PREPARE RAW RESPONSE', response);
  const normalized = normalizeBroadcast(response);
  console.log('NORMALIZED LIVE', normalized);
  return normalized;
}

export async function startLiveBroadcast(
  id: string | number,
): Promise<LiveBroadcast> {
  const response = await requestJson<any>(
    `/api/live/${id}/start/`,
    await withAuth({ method: 'POST' }),
  );

  return normalizeBroadcast(response);
}

export async function endLiveBroadcast(
  id: string | number,
): Promise<LiveBroadcast> {
  const response = await requestJson<any>(
    `/api/live/${id}/end/`,
    await withAuth({ method: 'POST' }),
  );

  return normalizeBroadcast(response);
}
