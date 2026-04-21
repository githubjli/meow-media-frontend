import { getValidAccessToken, requestJson } from '@/services/auth';

export type WalletPrototypePayOrderResponse = {
  order_no?: string;
  txid?: string;
  message?: string;
  warning?: string;
  wallet_relocked?: boolean;
  relock_warning?: string;
  [key: string]: any;
};

const withAuth = async () => ({
  Authorization: `Bearer ${await getValidAccessToken()}`,
});

export async function runWalletPrototypePaymentFlow(payload: {
  order_no: string;
  wallet_id?: string;
  password: string;
}) {
  return requestJson<WalletPrototypePayOrderResponse>(
    `/api/wallet-prototype/pay-order/`,
    {
      method: 'POST',
      headers: await withAuth(),
      body: JSON.stringify(payload),
    },
  );
}
