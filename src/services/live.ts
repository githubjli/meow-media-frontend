import { requestJson } from '@/services/auth';

export type LiveBroadcast = {
  streamId: string;
  name?: string;
  description?: string;
  category?: string;
  status?: string;
  viewerCount?: number;
  hlsUrl?: string;
  [key: string]: any;
};

const LIVE_LIST_PATH = '/live-api/live/rest/v2/broadcasts/list/0/20';

export async function getLiveList(): Promise<LiveBroadcast[]> {
  const payload = await requestJson<any>(LIVE_LIST_PATH, { method: 'GET' });
  return Array.isArray(payload) ? payload : [];
}

export async function getLiveBroadcast(streamId: string) {
  const items = await getLiveList();
  return (
    items.find((item) => String(item.streamId) === String(streamId)) || null
  );
}
