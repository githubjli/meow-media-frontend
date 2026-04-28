import { requestJson } from '@/services/auth';

export type PublicVideo = {
  id: number | string;
  title?: string;
  description?: string;
  category?: string;
  category_display?: string;
  owner_id?: number | string;
  owner_name?: string;
  owner_avatar_url?: string;
  created_at?: string;
  file_url?: string;
  access_type?: 'free' | 'membership' | string;
  preview_seconds?: number;
  can_watch?: boolean;
  is_locked?: boolean;
  lock_reason?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  [key: string]: any;
};

export type PublicVideoListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: PublicVideo[];
};

const normalizeVideo = (video: any): PublicVideo => {
  if (!video || typeof video !== 'object') {
    return {
      id: '',
      access_type: 'free',
      preview_seconds: 0,
      can_watch: true,
      is_locked: false,
      lock_reason: '',
    };
  }

  return {
    ...video,
    access_type: video.access_type || 'free',
    preview_seconds: Number.isFinite(Number(video.preview_seconds))
      ? Number(video.preview_seconds)
      : 0,
    can_watch:
      typeof video.can_watch === 'boolean' ? video.can_watch : true,
    is_locked:
      typeof video.is_locked === 'boolean' ? video.is_locked : false,
    lock_reason: video.lock_reason ? String(video.lock_reason) : '',
  };
};

const normalizeListResponse = (payload: any): PublicVideoListResponse => {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload.map((item) => normalizeVideo(item)),
    };
  }

  return {
    count: payload?.count || 0,
    next: payload?.next || null,
    previous: payload?.previous || null,
    results: Array.isArray(payload?.results)
      ? payload.results.map((item: any) => normalizeVideo(item))
      : [],
  };
};

export async function listPublicVideos(
  params?: Record<string, string | number | undefined>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  const payload = await requestJson<any>(
    `/api/public/videos/${query ? `?${query}` : ''}`,
    {
      method: 'GET',
    },
  );

  return normalizeListResponse(payload);
}

export async function getPublicVideoDetail(id: string) {
  const payload = await requestJson<PublicVideo>(`/api/public/videos/${id}/`, {
    method: 'GET',
  });
  return normalizeVideo(payload);
}
