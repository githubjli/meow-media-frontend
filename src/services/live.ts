// src/services/live.ts
import { request } from '@umijs/max';

export async function getLiveList() {
  console.log('--- Triggering API Request ---');
  return request('/live-api/live/rest/v2/broadcasts/list/0/20', {
    method: 'GET',
  }).then((res) => {
    console.log('--- API Raw Response:', res);
    return res;
  });
}
