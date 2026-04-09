import { getValidAccessToken, requestJson } from '@/services/auth';

export type BillingPlan = {
  id: number | string;
  name?: string;
  code?: string;
  description?: string;
  amount?: string | number;
  currency?: string;
  interval?: 'month' | 'year' | string;
  is_active?: boolean;
  [key: string]: any;
};

export type BillingSubscription = {
  id: number | string;
  status?: string;
  auto_renew?: boolean;
  cancel_at?: string | null;
  canceled_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  plan?: BillingPlan | null;
  [key: string]: any;
};

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizePlanList = (payload: any): BillingPlan[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export async function listBillingPlans() {
  const payload = await requestJson<any>(`/api/billing/plans/`, {
    method: 'GET',
    headers: await withAuth(),
  });
  return normalizePlanList(payload);
}

export async function getMyBillingSubscription() {
  return requestJson<BillingSubscription | null>(
    `/api/billing/subscriptions/me/`,
    {
      method: 'GET',
      headers: await withAuth(),
    },
  );
}

export async function createBillingSubscription(payload: {
  plan_id: string | number;
}) {
  return requestJson<BillingSubscription>(`/api/billing/subscriptions/`, {
    method: 'POST',
    headers: await withAuth(),
    body: JSON.stringify(payload),
  });
}

export async function cancelBillingSubscription(id: string | number) {
  return requestJson<BillingSubscription>(
    `/api/billing/subscriptions/${id}/cancel/`,
    {
      method: 'POST',
      headers: await withAuth(),
    },
  );
}
