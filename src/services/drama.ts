import { getValidAccessToken, requestJson } from '@/services/auth';
import type {
  DramaEpisode,
  DramaListResponse,
  DramaSeries,
} from '@/types/drama';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const buildQuery = (params?: Record<string, any>) => {
  if (!params) return '';
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

const normalizeListResponse = (payload: any): DramaListResponse => {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload,
    };
  }

  return {
    count: payload?.count || 0,
    next: payload?.next || null,
    previous: payload?.previous || null,
    results: Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.items)
      ? payload.items
      : [],
  };
};

const normalizeArray = <T>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export async function getDramaList(params?: Record<string, any>) {
  const payload = await requestJson<any>(`/api/dramas/${buildQuery(params)}`, {
    method: 'GET',
  });
  return normalizeListResponse(payload);
}

export async function getDramaDetail(id: string | number) {
  return requestJson<DramaSeries>(`/api/dramas/${id}/`, {
    method: 'GET',
  });
}

export async function getDramaEpisodes(seriesId: string | number) {
  const payload = await requestJson<any>(`/api/dramas/${seriesId}/episodes/`, {
    method: 'GET',
    headers: await withAuth().catch(() => ({})),
  });
  return normalizeArray<DramaEpisode>(payload);
}

export async function favoriteDrama(seriesId: string | number) {
  return requestJson<any>(`/api/dramas/${seriesId}/favorite/`, {
    method: 'POST',
    headers: await withAuth(),
  });
}

export async function unfavoriteDrama(seriesId: string | number) {
  return requestJson<any>(`/api/dramas/${seriesId}/favorite/`, {
    method: 'DELETE',
    headers: await withAuth(),
  });
}

export async function unlockDramaEpisode(episodeId: string | number) {
  return requestJson<any>(`/api/dramas/episodes/${episodeId}/unlock/`, {
    method: 'POST',
    headers: await withAuth(),
  });
}

export async function updateDramaProgress(
  episodeId: string | number,
  payload: Record<string, any>,
) {
  return requestJson<any>(`/api/dramas/episodes/${episodeId}/progress/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}
