const WALLET_RPC_URL =
  process.env.UMI_APP_WALLET_RPC_URL || process.env.REACT_APP_WALLET_RPC_URL;

type WalletRpcResult = Record<string, any>;

async function walletRpcCall(method: string, params: Record<string, any>) {
  if (!WALLET_RPC_URL) {
    throw new Error('Wallet RPC is not configured.');
  }

  const response = await fetch(WALLET_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params }),
  });

  if (!response.ok) {
    throw new Error('Wallet RPC request failed.');
  }

  const payload = await response.json();
  if (payload?.error) {
    throw new Error(payload.error?.message || 'Wallet RPC error.');
  }

  return (payload?.result || payload) as WalletRpcResult;
}

const resolveTxid = (result: WalletRpcResult) =>
  String(result?.txid || result?.tx_id || result?.id || '').trim();

export async function runWalletPrototypePaymentFlow(payload: {
  linkedWalletId?: string;
  unlockPassword: string;
  toAddress: string;
  amountLbc: string | number;
}) {
  let unlocked = false;
  try {
    await walletRpcCall('wallet_unlock', {
      wallet_id: payload.linkedWalletId,
      password: payload.unlockPassword,
    });
    unlocked = true;

    const sendResult = await walletRpcCall('wallet_send', {
      wallet_id: payload.linkedWalletId,
      to_address: payload.toAddress,
      amount: payload.amountLbc,
    });

    const txid = resolveTxid(sendResult);
    if (!txid) {
      throw new Error('Wallet sent payment but no txid was returned.');
    }

    return { txid };
  } finally {
    if (unlocked) {
      try {
        await walletRpcCall('wallet_lock', {
          wallet_id: payload.linkedWalletId,
        });
      } catch (error) {
        // Keep silent to avoid masking payment errors.
      }
    }
  }
}
