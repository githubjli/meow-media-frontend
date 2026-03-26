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
