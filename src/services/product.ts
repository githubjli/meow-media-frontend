import { getValidAccessToken, requestJson } from '@/services/auth';
import type { Product, ProductListResponse } from '@/types/product';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeListResponse = (payload: any): ProductListResponse => {
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

export async function getMyProducts() {
  const payload = await requestJson<any>('/api/store/me/products/', {
    method: 'GET',
    headers: await withAuth(),
  });

  return normalizeListResponse(payload);
}

export async function getMyProductDetail(id: string | number) {
  return requestJson<Product>(`/api/store/me/products/${id}/`, {
    method: 'GET',
    headers: await withAuth(),
  });
}

export async function createMyProduct(payload: Partial<Product>) {
  return requestJson<Product>('/api/store/me/products/', {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function updateMyProduct(
  id: string | number,
  payload: Partial<Product>,
) {
  return requestJson<Product>(`/api/store/me/products/${id}/`, {
    method: 'PATCH',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function deleteMyProduct(id: string | number) {
  return requestJson<void>(`/api/store/me/products/${id}/`, {
    method: 'DELETE',
    headers: await withAuth(),
  });
}

export async function getPublicStoreProducts(slug: string) {
  const payload = await requestJson<any>(`/api/stores/${slug}/products/`, {
    method: 'GET',
  });

  return normalizeListResponse(payload);
}
