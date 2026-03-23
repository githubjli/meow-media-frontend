import { getValidAccessToken, requestJson } from '@/services/auth';
import { getAccessToken } from '@/utils/auth';

import type {
  CommentItem,
  CommentListResponse,
  VideoInteractionSummary,
} from '@/types/engagement';

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

const normalizeCommentList = (payload: any): CommentListResponse => {
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

export async function getVideoInteractionSummary(
  videoId: string | number,
): Promise<VideoInteractionSummary> {
  return requestJson(
    `/api/public/videos/${videoId}/interaction-summary/`,
    withOptionalAuth({ method: 'GET' }),
  );
}

export async function likeVideo(
  videoId: string | number,
): Promise<VideoInteractionSummary> {
  return requestJson(
    `/api/videos/${videoId}/like/`,
    await withAuth({ method: 'POST' }),
  );
}

export async function unlikeVideo(videoId: string | number): Promise<void> {
  return requestJson(
    `/api/videos/${videoId}/like/`,
    await withAuth({ method: 'DELETE' }),
  );
}

export async function subscribeChannel(
  channelId: string | number,
): Promise<void> {
  return requestJson(
    `/api/channels/${channelId}/subscribe/`,
    await withAuth({ method: 'POST' }),
  );
}

export async function unsubscribeChannel(
  channelId: string | number,
): Promise<void> {
  return requestJson(
    `/api/channels/${channelId}/subscribe/`,
    await withAuth({ method: 'DELETE' }),
  );
}

export async function listVideoComments(
  videoId: string | number,
  params?: Record<string, string | number | undefined>,
): Promise<CommentListResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  const payload = await requestJson<any>(
    `/api/public/videos/${videoId}/comments/${query ? `?${query}` : ''}`,
    withOptionalAuth({ method: 'GET' }),
  );

  return normalizeCommentList(payload);
}

export async function createVideoComment(
  videoId: string | number,
  payload: { content: string },
): Promise<CommentItem> {
  return requestJson(
    `/api/videos/${videoId}/comments/`,
    await withAuth({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
}
