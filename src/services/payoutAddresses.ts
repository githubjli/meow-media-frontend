import { getValidAccessToken, requestJson } from '@/services/auth';
import type { PayoutAddress, PayoutAddressPayload } from '@/types/payoutAddress';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeList = (payload: any): PayoutAddress[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export async function listSellerPayoutAddresses() {
  const payload = await requestJson<any>('/api/seller/payout-addresses/', {
    method: 'GET',
    headers: await withAuth(),
  });
  return normalizeList(payload);
}

export async function createSellerPayoutAddress(payload: PayoutAddressPayload) {
  return requestJson<PayoutAddress>('/api/seller/payout-addresses/', {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function updateSellerPayoutAddress(
  id: string | number,
  payload: PayoutAddressPayload,
) {
  return requestJson<PayoutAddress>(`/api/seller/payout-addresses/${id}/`, {
    method: 'PATCH',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function deleteSellerPayoutAddress(id: string | number) {
  return requestJson<void>(`/api/seller/payout-addresses/${id}/`, {
    method: 'DELETE',
    headers: await withAuth(),
  });
}
