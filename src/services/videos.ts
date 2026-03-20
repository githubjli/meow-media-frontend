import { buildUrl, getValidAccessToken, requestJson } from '@/services/auth';

export type VideoItem = {
  id: number | string;
  title?: string;
  name?: string;
  description?: string;
  file?: string;
  file_url?: string;
  thumbnail?: string;
  created_at?: string;
  updated_at?: string;
  owner_email?: string;
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

const normalizeVideoList = (payload: any): VideoItem[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

export async function listMyVideos(): Promise<VideoItem[]> {
  const payload = await requestJson<any>(
    '/api/videos/',
    await withAuth({ method: 'GET' }),
  );
  return normalizeVideoList(payload);
}

export async function getVideoDetail(id: string): Promise<VideoItem> {
  return requestJson(`/api/videos/${id}/`, await withAuth({ method: 'GET' }));
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
  file: File;
}): Promise<VideoItem> {
  const formData = new FormData();
  formData.append('title', payload.title);
  if (payload.description) {
    formData.append('description', payload.description);
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
          detail;
      } catch (error) {}
      throw new Error(detail);
    }

    return response.json();
  });
}
