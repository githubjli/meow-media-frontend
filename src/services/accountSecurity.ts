import { getValidAccessToken, requestJson } from '@/services/auth';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

export async function changeAccountPassword(payload: {
  current_password: string;
  new_password: string;
}) {
  return requestJson<{ detail?: string; message?: string }>(
    '/api/account/change-password/',
    {
      method: 'POST',
      headers: await withAuth(),
      body: JSON.stringify(payload),
    },
  );
}
