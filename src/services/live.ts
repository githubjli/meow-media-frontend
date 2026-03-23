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
  thumbnail_url?: string;
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

const normalizeBroadcast = (item: any): LiveBroadcast => ({
  ...item,
  id: item?.id ?? item?.pk ?? item?.stream_id ?? item?.streamId,
  title: item?.title || item?.name || 'Untitled live stream',
  name: item?.name || item?.title || 'Untitled live stream',
  category: item?.category || item?.category_name || item?.category_display,
  status: item?.status || item?.live_status || 'created',
  viewer_count: item?.viewer_count ?? item?.viewerCount ?? 0,
  viewerCount: item?.viewerCount ?? item?.viewer_count ?? 0,
  stream_key: item?.stream_key || item?.streamKey || '',
  rtmp_url: item?.rtmp_url || item?.rtmpUrl || '',
  playback_url: item?.playback_url || item?.playbackUrl || '',
  thumbnail_url: item?.thumbnail_url || item?.thumbnailUrl || '',
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
});

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
