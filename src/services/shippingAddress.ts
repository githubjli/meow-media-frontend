import { getValidAccessToken, requestJson } from '@/services/auth';
import type {
  ShippingAddress,
  ShippingAddressPayload,
} from '@/types/shippingAddress';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeList = (payload: any): ShippingAddress[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export async function listShippingAddresses() {
  const payload = await requestJson<any>('/api/account/shipping-addresses/', {
    method: 'GET',
    headers: await withAuth(),
  });
  return normalizeList(payload);
}

export async function createShippingAddress(payload: ShippingAddressPayload) {
  return requestJson<ShippingAddress>('/api/account/shipping-addresses/', {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function updateShippingAddress(
  id: string | number,
  payload: ShippingAddressPayload,
) {
  return requestJson<ShippingAddress>(`/api/account/shipping-addresses/${id}/`, {
    method: 'PATCH',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function deleteShippingAddress(id: string | number) {
  return requestJson<void>(`/api/account/shipping-addresses/${id}/`, {
    method: 'DELETE',
    headers: await withAuth(),
  });
}
