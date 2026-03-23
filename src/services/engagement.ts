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
  const normalizeComment = (comment: any): CommentItem => ({
    ...comment,
    id: comment?.id,
    video_id: comment?.video_id || comment?.video,
    parent_id: comment?.parent_id ?? comment?.parent ?? null,
    content: comment?.content || '',
    created_at: comment?.created_at,
    updated_at: comment?.updated_at,
    like_count: comment?.like_count,
    reply_count: comment?.reply_count,
    viewer_has_liked: comment?.viewer_has_liked,
    user: {
      id: comment?.user?.id,
      name:
        comment?.user?.name ||
        comment?.user?.username ||
        comment?.user?.email ||
        'Viewer',
      avatar_url: comment?.user?.avatar_url,
      ...comment?.user,
    },
  });

  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload.map(normalizeComment),
    };
  }

  return {
    count: payload?.count || 0,
    next: payload?.next || null,
    previous: payload?.previous || null,
    results: Array.isArray(payload?.results)
      ? payload.results.map(normalizeComment)
      : [],
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
  const response = await requestJson<any>(
    `/api/videos/${videoId}/comments/`,
    await withAuth({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  return {
    ...response,
    id: response?.id,
    video_id: response?.video_id || response?.video || videoId,
    parent_id: response?.parent_id ?? response?.parent ?? null,
    content: response?.content || '',
    created_at: response?.created_at,
    updated_at: response?.updated_at,
    like_count: response?.like_count,
    reply_count: response?.reply_count,
    viewer_has_liked: response?.viewer_has_liked,
    user: {
      id: response?.user?.id,
      name:
        response?.user?.name ||
        response?.user?.username ||
        response?.user?.email ||
        'You',
      avatar_url: response?.user?.avatar_url,
      ...response?.user,
    },
  };
}
