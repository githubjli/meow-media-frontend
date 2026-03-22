import { requestJson } from '@/services/auth';

export type PublicCategory = {
  id?: number | string;
  slug: string;
  name: string;
  is_active?: boolean;
  [key: string]: any;
};

const normalizeCategories = (payload: any): PublicCategory[] => {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
    ? payload.results
    : [];

  return items
    .filter((item) => item?.slug && item?.name)
    .map((item) => ({
      id: item.id,
      slug: String(item.slug),
      name: String(item.name),
      is_active: item.is_active,
      ...item,
    }));
};

export async function listPublicCategories(): Promise<PublicCategory[]> {
  const payload = await requestJson<any>('/api/public/categories/', {
    method: 'GET',
  });
  return normalizeCategories(payload);
}
