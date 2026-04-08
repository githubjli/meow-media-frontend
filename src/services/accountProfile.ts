import { getValidAccessToken, requestJson } from '@/services/auth';

export type AccountProfileResponse = {
  id: number | string;
  email: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_creator?: boolean;
  is_seller?: boolean;
  is_admin?: boolean;
  can_create_live?: boolean;
  can_manage_store?: boolean;
  can_accept_payments?: boolean;
  seller_store?: {
    id?: number | string;
    name?: string | null;
    slug?: string;
    is_active?: boolean;
  } | null;
  counts?: {
    videos?: number;
    live_streams?: number;
    products?: number;
    payment_methods?: number;
    orders?: number;
  } | null;
  [key: string]: any;
};

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

export async function getAccountProfile() {
  return requestJson<AccountProfileResponse>('/api/account/profile', {
    method: 'GET',
    headers: await withAuth(),
  });
}
