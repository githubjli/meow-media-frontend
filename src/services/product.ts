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
  const formData = buildProductFormData(payload);
  return requestJson<Product>('/api/store/me/products/', {
    method: 'POST',
    headers: await withAuth(),
    body: formData,
  });
}

export async function updateMyProduct(
  id: string | number,
  payload: Partial<Product>,
) {
  const formData = buildProductFormData(payload);
  return requestJson<Product>(`/api/store/me/products/${id}/`, {
    method: 'PATCH',
    headers: await withAuth(),
    body: formData,
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

function buildProductFormData(payload: Partial<Product>) {
  const formData = new FormData();
  if (payload.title !== undefined)
    formData.append('title', String(payload.title));
  if (payload.slug !== undefined) formData.append('slug', String(payload.slug));
  if (payload.description !== undefined) {
    formData.append('description', String(payload.description || ''));
  }
  if (payload.price_amount !== undefined) {
    formData.append('price_amount', String(payload.price_amount));
  }
  if (payload.price_currency !== undefined) {
    formData.append('price_currency', String(payload.price_currency));
  }
  if (payload.stock_quantity !== undefined) {
    formData.append('stock_quantity', String(payload.stock_quantity));
  }
  if (payload.status !== undefined) {
    formData.append('status', String(payload.status));
  }
  if (payload.cover_image instanceof File) {
    formData.append('cover_image', payload.cover_image);
  }
  return formData;
}
