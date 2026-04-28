import { getValidAccessToken, requestJson } from '@/services/auth';
import type {
  MeowPointLedgerEntry,
  MeowPointLedgerParams,
  MeowPointPackage,
  MeowPointWallet,
} from '@/types/meowPoints';

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

const normalizeList = <T>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const buildQuery = (params?: Record<string, any>) => {
  if (!params) return '';
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export async function getMeowPointWallet() {
  return requestJson<MeowPointWallet>('/api/meow-points/wallet/', {
    method: 'GET',
    headers: await withAuth(),
  });
}

export async function getMeowPointPackages() {
  const payload = await requestJson<any>('/api/meow-points/packages/', {
    method: 'GET',
    headers: await withAuth(),
  });
  return normalizeList<MeowPointPackage>(payload);
}

export async function getMeowPointLedger(params?: MeowPointLedgerParams) {
  const payload = await requestJson<any>(
    `/api/meow-points/ledger/${buildQuery(params)}`,
    {
      method: 'GET',
      headers: await withAuth(),
    },
  );
  return normalizeList<MeowPointLedgerEntry>(payload);
}
