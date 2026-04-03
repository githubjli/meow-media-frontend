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
  const formData = buildStoreFormData(payload);
  return requestJson<SellerStore>('/api/store/me/', {
    method: 'POST',
    headers: await withAuth(),
    body: formData,
  });
}

export async function updateMyStore(payload: Partial<SellerStore>) {
  const formData = buildStoreFormData(payload);
  return requestJson<SellerStore>('/api/store/me/', {
    method: 'PATCH',
    headers: await withAuth(),
    body: formData,
  });
}

export async function getPublicStore(slug: string) {
  return requestJson<SellerStore>(`/api/stores/${slug}/`, {
    method: 'GET',
  });
}

function buildStoreFormData(payload: Partial<SellerStore>) {
  const formData = new FormData();
  if (payload.name !== undefined) formData.append('name', String(payload.name));
  if (payload.slug !== undefined) formData.append('slug', String(payload.slug));
  if (payload.description !== undefined) {
    formData.append('description', String(payload.description || ''));
  }
  if (payload.is_active !== undefined) {
    formData.append('is_active', payload.is_active ? 'true' : 'false');
  }
  if (payload.logo instanceof File) {
    formData.append('logo', payload.logo);
  }
  if (payload.banner instanceof File) {
    formData.append('banner', payload.banner);
  }
  return formData;
}
