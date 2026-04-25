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

const buildQuery = (params?: Record<string, any>) => {
  if (!params) return '';
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
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

export async function payProductOrderWithWallet(
  orderNo: string,
  payload: { wallet_id?: string; password: string },
) {
  return requestJson<any>('/api/wallet-prototype/pay-product-order/', {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify({
      order_no: orderNo,
      wallet_id: payload.wallet_id,
      password: payload.password,
    }),
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

export async function submitProductOrderTxHint(
  orderNo: string,
  payload: { txid: string },
) {
  return requestJson<ProductOrder>(`/api/product-orders/${orderNo}/tx-hint/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
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
  return requestJson<ProductOrder>(
    `/api/seller/product-orders/${orderNo}/ship/`,
    {
      method: 'POST',
      headers: await withAuth(),
      body: JSON.stringify(payload),
    },
  );
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

export async function listSellerProductOrders(params?: {
  status?: string;
  search?: string;
  page?: number;
}) {
  const payload = await requestJson<any>(
    `/api/seller/product-orders/${buildQuery(params)}`,
    {
      method: 'GET',
      headers: await withAuth(),
    },
  );
  return normalizeList(payload);
}

export async function getSellerProductOrderDetail(orderNo: string) {
  return requestJson<ProductOrder>(`/api/seller/product-orders/${orderNo}/`, {
    method: 'GET',
    headers: await withAuth(),
  });
}
