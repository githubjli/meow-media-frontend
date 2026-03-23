import { buildUrl, getValidAccessToken, requestJson } from '@/services/auth';

export type VideoItem = {
  id: number | string;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  category_display?: string;
  file?: string;
  file_url?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
  owner_email?: string;
  [key: string]: any;
};

export type VideoListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: VideoItem[];
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

const normalizeVideoList = (payload: any): VideoItem[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

const normalizeVideoListResponse = (payload: any): VideoListResponse => {
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

export const getPreferredThumbnail = (video?: Partial<VideoItem> | null) =>
  video?.thumbnail_url || video?.thumbnail || '';

export async function listMyVideos(): Promise<VideoItem[]> {
  const payload = await requestJson<any>(
    '/api/videos/',
    await withAuth({ method: 'GET' }),
  );
  return normalizeVideoList(payload);
}

export async function listAllVideos(
  params?: Record<string, string | number | undefined>,
): Promise<VideoListResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  const payload = await requestJson<any>(
    `/api/admin/videos/${query ? `?${query}` : ''}`,
    await withAuth({ method: 'GET' }),
  );

  return normalizeVideoListResponse(payload);
}

export async function getVideoDetail(id: string): Promise<VideoItem> {
  return requestJson(`/api/videos/${id}/`, await withAuth({ method: 'GET' }));
}

export async function updateVideo(
  id: string | number,
  payload: { title: string; description?: string; category?: string },
): Promise<VideoItem> {
  return requestJson(
    `/api/videos/${id}/`,
    await withAuth({
      method: 'PATCH',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );
}

export async function regenerateVideoThumbnail(
  id: string | number,
  payload?: Record<string, any>,
): Promise<VideoItem | void> {
  return requestJson(
    `/api/videos/${id}/regenerate-thumbnail/`,
    await withAuth({
      method: 'POST',
      ...(payload
        ? {
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
          }
        : {}),
    }),
  );
}

export async function deleteVideo(id: string | number): Promise<void> {
  return requestJson(
    `/api/videos/${id}/`,
    await withAuth({ method: 'DELETE' }),
  );
}

export async function uploadVideo(payload: {
  title: string;
  description?: string;
  category?: string;
  file: File;
}): Promise<VideoItem> {
  const formData = new FormData();
  formData.append('title', payload.title);
  if (payload.description) {
    formData.append('description', payload.description);
  }
  if (payload.category) {
    formData.append('category', payload.category);
  }
  formData.append('file', payload.file);

  const accessToken = await getValidAccessToken();

  return fetch(buildUrl('/api/videos/'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  }).then(async (response) => {
    if (!response.ok) {
      let detail = 'Upload failed.';
      try {
        const data = await response.json();
        detail =
          data?.detail ||
          data?.message ||
          data?.file?.[0] ||
          data?.title?.[0] ||
          data?.category?.[0] ||
          detail;
      } catch (error) {}
      throw new Error(detail);
    }

    return response.json();
  });
}
