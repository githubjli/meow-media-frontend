import { getValidAccessToken, requestJson } from '@/services/auth';
import type {
  LivePaymentMethod,
  ManageLivePaymentMethod,
} from '@/types/livePaymentMethod';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeMethods = <
  T extends LivePaymentMethod | ManageLivePaymentMethod,
>(
  payload: any,
): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export async function getPublicLivePaymentMethods(id: string | number) {
  const payload = await requestJson<any>(`/api/live/${id}/payment-methods/`, {
    method: 'GET',
  });
  return normalizeMethods<LivePaymentMethod>(payload);
}

export async function getManageLivePaymentMethods(id: string | number) {
  const payload = await requestJson<any>(
    `/api/live/${id}/payment-methods/manage/`,
    {
      method: 'GET',
      headers: await withAuth(),
    },
  );
  return normalizeMethods<ManageLivePaymentMethod>(payload);
}

export async function createLivePaymentMethod(
  id: string | number,
  payload: Partial<ManageLivePaymentMethod>,
) {
  return requestJson<ManageLivePaymentMethod>(
    `/api/live/${id}/payment-methods/manage/`,
    {
      method: 'POST',
      headers: await withAuth(),
      body: JSON.stringify(payload),
    },
  );
}

export async function updateLivePaymentMethod(
  id: string | number,
  pmId: string | number,
  payload: Partial<ManageLivePaymentMethod>,
) {
  return requestJson<ManageLivePaymentMethod>(
    `/api/live/${id}/payment-methods/manage/${pmId}/`,
    {
      method: 'PATCH',
      headers: await withAuth(),
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteLivePaymentMethod(
  id: string | number,
  pmId: string | number,
) {
  return requestJson<void>(`/api/live/${id}/payment-methods/manage/${pmId}/`, {
    method: 'DELETE',
    headers: await withAuth(),
  });
}
