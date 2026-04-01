import { getValidAccessToken, requestJson } from '@/services/auth';
import type { SellerStore } from '@/types/store';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

export async function getMyStore() {
  return requestJson<SellerStore>('/api/store/me/', {
    method: 'GET',
    headers: await withAuth(),
  });
}

export async function createMyStore(payload: Partial<SellerStore>) {
  return requestJson<SellerStore>('/api/store/me/', {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function updateMyStore(payload: Partial<SellerStore>) {
  return requestJson<SellerStore>('/api/store/me/', {
    method: 'PATCH',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function getPublicStore(slug: string) {
  return requestJson<SellerStore>(`/api/stores/${slug}/`, {
    method: 'GET',
  });
}
