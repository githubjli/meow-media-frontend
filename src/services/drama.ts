import { getValidAccessToken, requestJson } from '@/services/auth';
import type {
  CreatorDramaEpisodePayload,
  CreatorDramaListResponse,
  CreatorDramaSeriesPayload,
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

const buildDramaSeriesPayloadBody = (payload: CreatorDramaSeriesPayload) => {
  const formData = new FormData();
  const appendValue = (key: string, value: any) => {
    if (value === undefined || value === null || value === '') return;
    formData.append(key, String(value));
  };

  const coverFile = payload.cover instanceof File ? payload.cover : null;
  if (coverFile) {
    formData.append('cover', coverFile);
  }

  appendValue('title', payload.title);
  appendValue('description', payload.description);
  appendValue('category', payload.category);
  appendValue('status', payload.status);
  appendValue('visibility', payload.visibility);

  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : typeof payload.tags === 'string'
    ? String(payload.tags)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (tags.length > 0) {
    tags.forEach((tag) => formData.append('tags', tag));
  }

  const hasFile = Boolean(coverFile);
  if (hasFile) return formData;

  const jsonPayload: Record<string, any> = {
    title: payload.title,
  };

  if (payload.description !== undefined)
    jsonPayload.description = payload.description;
  if (payload.category !== undefined) jsonPayload.category = payload.category;
  if (payload.status !== undefined) jsonPayload.status = payload.status;
  if (payload.visibility !== undefined)
    jsonPayload.visibility = payload.visibility;
  if (tags.length > 0) jsonPayload.tags = tags;
  if (payload.cover && typeof payload.cover === 'string') {
    jsonPayload.cover = payload.cover;
  }
  if (payload.cover_url) {
    jsonPayload.cover_url = payload.cover_url;
  }

  return JSON.stringify(jsonPayload);
};

const buildDramaEpisodePayloadBody = (payload: CreatorDramaEpisodePayload) => {
  const formData = new FormData();
  const appendValue = (key: string, value: any) => {
    if (value === undefined || value === null || value === '') return;
    formData.append(key, String(value));
  };

  const videoFile =
    payload.video_file instanceof File ? payload.video_file : null;
  const thumbnailFile =
    payload.thumbnail instanceof File ? payload.thumbnail : null;

  if (videoFile) {
    formData.append('video_file', videoFile);
  }
  if (thumbnailFile) {
    formData.append('thumbnail', thumbnailFile);
  }

  appendValue('episode_no', payload.episode_no);
  appendValue('title', payload.title);
  appendValue('description', payload.description);
  appendValue('video_url', payload.video_url);
  appendValue('hls_url', payload.hls_url);
  appendValue('playback_url', payload.playback_url);
  appendValue('unlock_type', payload.unlock_type);
  appendValue(
    'points_price',
    payload.points_price ?? payload.meow_points_price ?? payload.coin_price,
  );
  appendValue('status', payload.status);
  appendValue('duration_seconds', payload.duration_seconds);

  const hasUploadFile = Boolean(videoFile || thumbnailFile);
  if (hasUploadFile) return formData;

  const jsonPayload: Record<string, any> = {
    title: payload.title,
  };

  if (payload.episode_no !== undefined)
    jsonPayload.episode_no = payload.episode_no;
  if (payload.description !== undefined)
    jsonPayload.description = payload.description;
  if (payload.video_url !== undefined)
    jsonPayload.video_url = payload.video_url;
  if (payload.hls_url !== undefined) jsonPayload.hls_url = payload.hls_url;
  if (payload.playback_url !== undefined)
    jsonPayload.playback_url = payload.playback_url;
  if (payload.unlock_type !== undefined)
    jsonPayload.unlock_type = payload.unlock_type;
  const aliasPointsPrice =
    payload.points_price ?? payload.meow_points_price ?? payload.coin_price;
  if (aliasPointsPrice !== undefined) {
    jsonPayload.points_price = aliasPointsPrice;
  }
  if (payload.status !== undefined) jsonPayload.status = payload.status;
  if (payload.duration_seconds !== undefined) {
    jsonPayload.duration_seconds = payload.duration_seconds;
  }
  if (payload.thumbnail && typeof payload.thumbnail === 'string') {
    jsonPayload.thumbnail = payload.thumbnail;
  }
  if (payload.thumbnail_url !== undefined) {
    jsonPayload.thumbnail_url = payload.thumbnail_url;
  }

  return JSON.stringify(jsonPayload);
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

export type DramaProgressPayload = {
  episode_id: number | string;
  progress_seconds: number;
  completed: boolean;
};

export async function updateDramaProgress(
  seriesId: string | number,
  payload: DramaProgressPayload,
) {
  return requestJson<any>(`/api/dramas/${seriesId}/progress/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function getCreatorDramas(params?: Record<string, any>) {
  const payload = await requestJson<any>(
    `/api/creator/dramas/${buildQuery(params)}`,
    {
      method: 'GET',
      headers: await withAuth(),
    },
  );
  return normalizeListResponse(payload) as CreatorDramaListResponse;
}

export async function getCreatorDrama(id: string | number) {
  return requestJson<DramaSeries>(`/api/creator/dramas/${id}/`, {
    method: 'GET',
    headers: await withAuth(),
  });
}

export async function createCreatorDrama(payload: CreatorDramaSeriesPayload) {
  return requestJson<DramaSeries>('/api/creator/dramas/', {
    method: 'POST',
    headers: await withAuth(),
    body: buildDramaSeriesPayloadBody(payload),
  });
}

export async function updateCreatorDrama(
  id: string | number,
  payload: CreatorDramaSeriesPayload,
) {
  return requestJson<DramaSeries>(`/api/creator/dramas/${id}/`, {
    method: 'PATCH',
    headers: await withAuth(),
    body: buildDramaSeriesPayloadBody(payload),
  });
}

export async function deleteCreatorDrama(id: string | number) {
  return requestJson<void>(`/api/creator/dramas/${id}/`, {
    method: 'DELETE',
    headers: await withAuth(),
  });
}

export async function getCreatorDramaEpisodes(seriesId: string | number) {
  const payload = await requestJson<any>(
    `/api/creator/dramas/${seriesId}/episodes/`,
    {
      method: 'GET',
      headers: await withAuth(),
    },
  );
  return normalizeArray<DramaEpisode>(payload);
}

export async function createCreatorDramaEpisode(
  seriesId: string | number,
  payload: CreatorDramaEpisodePayload,
) {
  return requestJson<DramaEpisode>(
    `/api/creator/dramas/${seriesId}/episodes/`,
    {
      method: 'POST',
      headers: await withAuth(),
      body: buildDramaEpisodePayloadBody(payload),
    },
  );
}

export async function updateCreatorDramaEpisode(
  seriesId: string | number,
  episodeId: string | number,
  payload: CreatorDramaEpisodePayload,
) {
  return requestJson<DramaEpisode>(
    `/api/creator/dramas/${seriesId}/episodes/${episodeId}/`,
    {
      method: 'PATCH',
      headers: await withAuth(),
      body: buildDramaEpisodePayloadBody(payload),
    },
  );
}

export async function deleteCreatorDramaEpisode(
  seriesId: string | number,
  episodeId: string | number,
) {
  return requestJson<void>(
    `/api/creator/dramas/${seriesId}/episodes/${episodeId}/`,
    {
      method: 'DELETE',
      headers: await withAuth(),
    },
  );
}
