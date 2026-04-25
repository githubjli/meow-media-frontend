import { getValidAccessToken, requestJson } from '@/services/auth';
import type { RefundRequest } from '@/types/refundRequest';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeList = (payload: any): RefundRequest[] => {
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

export async function listBuyerProductRefundRequests(orderNo: string) {
  const payload = await requestJson<any>(
    `/api/product-orders/${orderNo}/refund-requests/`,
    {
      method: 'GET',
      headers: await withAuth(),
    },
  );
  return normalizeList(payload);
}

export async function createBuyerProductRefundRequest(
  orderNo: string,
  payload: { reason: string; requested_amount?: string | number },
) {
  return requestJson<RefundRequest>(`/api/product-orders/${orderNo}/refund-requests/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function listSellerRefundRequests(params?: Record<string, any>) {
  const payload = await requestJson<any>(
    `/api/seller/refund-requests/${buildQuery(params)}`,
    {
      method: 'GET',
      headers: await withAuth(),
    },
  );
  return normalizeList(payload);
}

export async function listAdminRefundRequests(params?: Record<string, any>) {
  const payload = await requestJson<any>(
    `/api/admin/refund-requests/${buildQuery(params)}`,
    {
      method: 'GET',
      headers: await withAuth(),
    },
  );
  return normalizeList(payload);
}

export async function approveRefundRequest(
  id: string | number,
  payload: Record<string, any> = {},
) {
  return requestJson<RefundRequest>(`/api/admin/refund-requests/${id}/approve/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function rejectRefundRequest(
  id: string | number,
  payload: Record<string, any> = {},
) {
  return requestJson<RefundRequest>(`/api/admin/refund-requests/${id}/reject/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function markRefundRequestRefunded(
  id: string | number,
  payload: Record<string, any> = {},
) {
  return requestJson<RefundRequest>(
    `/api/admin/refund-requests/${id}/mark-refunded/`,
    {
      method: 'POST',
      headers: await withAuth(),
      body: JSON.stringify(payload),
    },
  );
}
