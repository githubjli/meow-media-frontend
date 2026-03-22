import { requestJson } from '@/services/auth';

export type PublicVideo = {
  id: number | string;
  title?: string;
  description?: string;
  category?: string;
  category_display?: string;
  created_at?: string;
  file_url?: string;
  thumbnail?: string;
  [key: string]: any;
};

export type PublicVideoListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: PublicVideo[];
};

const normalizeListResponse = (payload: any): PublicVideoListResponse => {
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
    results: Array.isArray(payload?.results) ? payload.results : [],
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
  return requestJson<PublicVideo>(`/api/public/videos/${id}/`, {
    method: 'GET',
  });
}
