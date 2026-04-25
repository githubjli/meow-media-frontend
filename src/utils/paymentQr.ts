export type ParsedPaymentQr = {
  raw: string;
  format: 'json' | 'url' | 'wallet_uri' | 'unknown';
  payload?: any;
  orderNo?: string;
  address?: string;
  amount?: string;
  currency?: string;
  error?: string;
};

export const isProductPaymentQr = (payload: any) =>
  payload && String(payload.type || '').toLowerCase() === 'product_payment';

const tryParseJson = (text: string): ParsedPaymentQr | null => {
  try {
    const parsed = JSON.parse(text);
    if (isProductPaymentQr(parsed)) {
      return {
        raw: text,
        format: 'json',
        payload: parsed,
        orderNo: parsed.order_no,
        address: parsed.pay_to_address,
        amount: parsed.expected_amount,
        currency: parsed.currency,
      };
    }
  } catch (error) {
    return null;
  }
  return null;
};

const extractOrderNoFromPath = (pathname: string) => {
  const accountMatch = pathname.match(/\/account\/product-orders\/([^/]+)/i);
  if (accountMatch?.[1]) return accountMatch[1];
  const payMatch = pathname.match(/\/pay\/([^/]+)/i);
  if (payMatch?.[1]) return payMatch[1];
  const confirmMatch = pathname.match(/\/product-payment\/confirm\/([^/]+)/i);
  if (confirmMatch?.[1]) return confirmMatch[1];
  return '';
};

const tryParseUrl = (text: string): ParsedPaymentQr | null => {
  try {
    const url = new URL(text);
    const orderNo =
      url.searchParams.get('order_no') || extractOrderNoFromPath(url.pathname);
    return {
      raw: text,
      format: 'url',
      payload: { href: url.href },
      orderNo: orderNo || undefined,
      address: url.searchParams.get('pay_to_address') || undefined,
      amount: url.searchParams.get('amount') || undefined,
      currency: url.searchParams.get('currency') || undefined,
    };
  } catch (error) {
    return null;
  }
};

const tryParseWalletUri = (text: string): ParsedPaymentQr | null => {
  const normalized = String(text || '').trim();
  if (!normalized.toLowerCase().startsWith('ltt:')) return null;

  const withoutPrefix = normalized.slice(4);
  const [address, queryString] = withoutPrefix.split('?');
  const params = new URLSearchParams(queryString || '');

  return {
    raw: text,
    format: 'wallet_uri',
    payload: Object.fromEntries(params.entries()),
    orderNo: params.get('order_no') || undefined,
    address: address || params.get('address') || undefined,
    amount: params.get('amount') || undefined,
    currency: params.get('currency') || undefined,
  };
};

export const parsePaymentQrText = (qrText: string): ParsedPaymentQr => {
  const value = String(qrText || '').trim();

  if (!value) {
    return {
      raw: value,
      format: 'unknown',
      error: 'QR text is empty.',
    };
  }

  const jsonResult = tryParseJson(value);
  if (jsonResult) return jsonResult;

  const urlResult = tryParseUrl(value);
  if (urlResult) return urlResult;

  const walletResult = tryParseWalletUri(value);
  if (walletResult) return walletResult;

  return {
    raw: value,
    format: 'unknown',
    error: 'Unable to parse payment QR payload.',
  };
};

export const extractOrderNoFromQr = (qrText: string) => {
  const parsed = parsePaymentQrText(qrText);
  return parsed.orderNo || '';
};
