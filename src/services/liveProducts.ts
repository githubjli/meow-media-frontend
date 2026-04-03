import { getValidAccessToken, requestJson } from '@/services/auth';
import type { LiveProductBinding } from '@/types/liveProduct';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeBindings = (payload: any): LiveProductBinding[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
};

export async function getPublicLiveProducts(id: string | number) {
  const payload = await requestJson<any>(`/api/live/${id}/products/`, {
    method: 'GET',
  });

  return normalizeBindings(payload);
}

export async function getManageLiveProducts(id: string | number) {
  const payload = await requestJson<any>(`/api/live/${id}/products/manage/`, {
    method: 'GET',
    headers: await withAuth(),
  });

  return normalizeBindings(payload);
}

export async function createLiveProductBinding(
  id: string | number,
  payload: {
    product?: string | number;
    product_id?: string | number;
    sort_order?: number;
    is_pinned?: boolean;
    is_active?: boolean;
  },
) {
  return requestJson<LiveProductBinding>(`/api/live/${id}/products/manage/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function updateLiveProductBinding(
  id: string | number,
  bindingId: string | number,
  payload: {
    sort_order?: number;
    is_pinned?: boolean;
    is_active?: boolean;
  },
) {
  return requestJson<LiveProductBinding>(
    `/api/live/${id}/products/manage/${bindingId}/`,
    {
      method: 'PATCH',
      headers: await withAuth(),
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteLiveProductBinding(
  id: string | number,
  bindingId: string | number,
) {
  return requestJson<void>(`/api/live/${id}/products/manage/${bindingId}/`, {
    method: 'DELETE',
    headers: await withAuth(),
  });
}
