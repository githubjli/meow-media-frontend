import { getValidAccessToken, requestJson } from '@/services/auth';
import type { PaymentOrder, PaymentOrderSummary } from '@/types/paymentOrder';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeOrders = (payload: any): PaymentOrderSummary[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export async function createLivePaymentOrder(
  liveId: string | number,
  payload: {
    order_type: string;
    amount: string | number;
    currency: string;
    stream_payment_method?: string | number;
    product?: string | number;
  },
) {
  return requestJson<PaymentOrder>(`/api/live/${liveId}/payments/orders/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function getLivePaymentOrderDetail(
  liveId: string | number,
  orderId: string | number,
) {
  return requestJson<PaymentOrder>(
    `/api/live/${liveId}/payments/orders/${orderId}/`,
    {
      method: 'GET',
      headers: await withAuth(),
    },
  );
}

export async function markLivePaymentOrderPaid(
  liveId: string | number,
  orderId: string | number,
) {
  return requestJson<PaymentOrder>(
    `/api/live/${liveId}/payments/orders/${orderId}/mark-paid/`,
    {
      method: 'POST',
      headers: await withAuth(),
    },
  );
}

export async function getMyPaymentOrders() {
  const payload = await requestJson<any>(`/api/account/payment-orders/`, {
    method: 'GET',
    headers: await withAuth(),
  });
  return normalizeOrders(payload);
}
