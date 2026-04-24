import { getValidAccessToken, requestJson } from '@/services/auth';
import type { ProductOrder } from '@/types/productOrder';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeList = (payload: any): ProductOrder[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export async function createProductOrder(payload: {
  product_id: string | number;
  quantity: number;
  shipping_address_id: string | number;
}) {
  return requestJson<ProductOrder>('/api/product-orders/', {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function listMyProductOrders() {
  const payload = await requestJson<any>('/api/product-orders/', {
    method: 'GET',
    headers: await withAuth(),
  });
  return normalizeList(payload);
}

export async function getProductOrderDetail(orderNo: string) {
  return requestJson<ProductOrder>(`/api/product-orders/${orderNo}/`, {
    method: 'GET',
    headers: await withAuth(),
  });
}

export async function confirmProductOrderReceived(orderNo: string) {
  return requestJson<ProductOrder>(
    `/api/product-orders/${orderNo}/confirm-received/`,
    {
      method: 'POST',
      headers: await withAuth(),
    },
  );
}

export async function shipSellerProductOrder(
  orderNo: string,
  payload: {
    carrier: string;
    tracking_number: string;
    tracking_url?: string;
    shipped_note?: string;
  },
) {
  return requestJson<ProductOrder>(`/api/seller/product-orders/${orderNo}/ship/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function markProductOrderSettled(
  orderNo: string,
  payload: Record<string, any> = {},
) {
  return requestJson<ProductOrder>(
    `/api/admin/product-orders/${orderNo}/mark-settled/`,
    {
      method: 'POST',
      headers: await withAuth(),
      body: JSON.stringify(payload),
    },
  );
}

export async function listSellerProductOrders() {
  return Promise.reject(new Error('seller_product_order_list_endpoint_missing'));
}
