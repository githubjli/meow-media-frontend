import { getValidAccessToken, requestJson } from '@/services/auth';

export type AccountProfileResponse = {
  id?: number | string;
  email?: string;
  username?: string;
  name?: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  role?: string;
  is_admin?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_creator?: boolean;
  has_store?: boolean;
  seller?: {
    has_store?: boolean;
    store?: {
      id?: number | string;
      slug?: string;
      name?: string;
      title?: string;
    } | null;
  } | null;
  store?: {
    id?: number | string;
    slug?: string;
    name?: string;
    title?: string;
  } | null;
  counts?: {
    videos?: number;
    live_sessions?: number;
    followers?: number;
    following?: number;
    payment_orders?: number;
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
