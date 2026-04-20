import { getValidAccessToken, requestJson } from '@/services/auth';

export type MembershipPlan = {
  id: number | string;
  name?: string;
  description?: string;
  code?: string;
  price_lbc?: string | number;
  duration_days?: number;
  [key: string]: any;
};

export type MembershipOrder = {
  order_no: string;
  status?: string;
  plan?: MembershipPlan | null;
  plan_name?: string;
  expected_amount_lbc?: string | number;
  pay_to_address?: string;
  qr_text?: string;
  expires_at?: string | null;
  txid?: string;
  confirmations?: number;
  [key: string]: any;
};

export type MembershipStatus = {
  status?: string;
  is_active?: boolean;
  valid_until?: string | null;
  remaining_days?: number;
  plan?: MembershipPlan | null;
  plan_name?: string;
  [key: string]: any;
};

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeList = <T>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export async function listMembershipPlans() {
  const payload = await requestJson<any>(`/api/membership/plans/`, {
    method: 'GET',
    headers: await withAuth(),
  });

  return normalizeList<MembershipPlan>(payload);
}

export async function createMembershipOrder(payload: { plan_code: string }) {
  return requestJson<MembershipOrder>(`/api/membership/orders/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function getMembershipOrder(orderNo: string) {
  return requestJson<MembershipOrder>(`/api/membership/orders/${orderNo}/`, {
    method: 'GET',
    headers: await withAuth(),
  });
}

export async function getMyMembershipStatus() {
  return requestJson<MembershipStatus | null>(`/api/membership/me/`, {
    method: 'GET',
    headers: await withAuth(),
  });
}
