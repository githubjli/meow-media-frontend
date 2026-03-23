import { getValidAccessToken, requestJson } from '@/services/auth';

export type VideoInteractionSummary = {
  video_id: number | string;
  like_count: number;
  comment_count: number;
  is_liked?: boolean;
  is_subscribed?: boolean;
  [key: string]: any;
};

export type CommentItem = {
  id: number | string;
  video: number | string;
  content: string;
  created_at?: string;
  updated_at?: string;
  user?: {
    id?: number | string;
    email?: string;
    username?: string;
    [key: string]: any;
  };
  [key: string]: any;
};

export type CommentListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: CommentItem[];
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
    `/api/videos/${videoId}/engagement/`,
    await withAuth({ method: 'GET' }),
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
    `/api/videos/${videoId}/comments/${query ? `?${query}` : ''}`,
    await withAuth({ method: 'GET' }),
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
