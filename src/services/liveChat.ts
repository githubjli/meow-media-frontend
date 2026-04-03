import { getValidAccessToken, requestJson } from '@/services/auth';
import type { LiveChatListResponse, LiveChatMessage } from '@/types/liveChat';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeResponse = (payload: any): LiveChatListResponse => {
  if (Array.isArray(payload)) {
    const results = payload;
    const next = results.length ? results[results.length - 1]?.id : null;
    return { results, next_after_id: next };
  }

  return {
    results: Array.isArray(payload?.results) ? payload.results : [],
    next_after_id: payload?.next_after_id ?? null,
  };
};

export async function getLiveChatMessages(
  id: string | number,
  params?: { after_id?: string | number; limit?: number },
) {
  const searchParams = new URLSearchParams();
  if (params?.after_id !== undefined && params?.after_id !== null) {
    searchParams.set('after_id', String(params.after_id));
  }
  if (params?.limit) {
    searchParams.set('limit', String(params.limit));
  }

  const payload = await requestJson<any>(
    `/api/live/${id}/chat/messages/${
      searchParams.toString() ? `?${searchParams.toString()}` : ''
    }`,
    {
      method: 'GET',
    },
  );

  return normalizeResponse(payload);
}

export async function postLiveChatMessage(
  id: string | number,
  payload: { content: string; message_type?: string },
) {
  return requestJson<LiveChatMessage>(`/api/live/${id}/chat/messages/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function pinLiveChatMessage(
  id: string | number,
  messageId: string | number,
  payload?: { is_pinned?: boolean },
) {
  return requestJson<LiveChatMessage>(
    `/api/live/${id}/chat/messages/${messageId}/pin/`,
    {
      method: 'PATCH',
      headers: await withAuth(),
      body: JSON.stringify(payload || {}),
    },
  );
}

export async function deleteLiveChatMessage(
  id: string | number,
  messageId: string | number,
) {
  return requestJson<void>(`/api/live/${id}/chat/messages/${messageId}/`, {
    method: 'DELETE',
    headers: await withAuth(),
  });
}
