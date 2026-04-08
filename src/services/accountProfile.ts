import { getValidAccessToken, requestJson } from '@/services/auth';

export type AccountProfileResponse = {
  id: number | string;
  email: string;
  display_name?: string | null;
  username?: string | null;
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

export type UpdateAccountProfilePayload = {
  display_name?: string;
  bio?: string;
  avatar?: File | null;
  avatar_clear?: boolean;
};

export async function updateAccountProfile(
  payload: UpdateAccountProfilePayload,
) {
  const headers = await withAuth();
  const hasAvatarFile = payload.avatar instanceof File;

  if (hasAvatarFile) {
    const formData = new FormData();
    if (typeof payload.display_name === 'string') {
      formData.append('display_name', payload.display_name);
    }
    if (typeof payload.bio === 'string') {
      formData.append('bio', payload.bio);
    }
    formData.append('avatar', payload.avatar as File);

    return requestJson<AccountProfileResponse>('/api/account/profile', {
      method: 'PATCH',
      headers,
      body: formData,
    });
  }

  const jsonPayload: Record<string, any> = {};
  if (typeof payload.display_name === 'string') {
    jsonPayload.display_name = payload.display_name;
  }
  if (typeof payload.bio === 'string') {
    jsonPayload.bio = payload.bio;
  }
  if (payload.avatar_clear === true || payload.avatar === null) {
    jsonPayload.avatar_clear = true;
  }

  return requestJson<AccountProfileResponse>('/api/account/profile', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(jsonPayload),
  });
}
