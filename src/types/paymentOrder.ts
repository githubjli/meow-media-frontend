export type PaymentOrderType = 'tip' | 'product' | 'membership' | string;

export type PaymentOrderStatus = string;

export type PaymentOrderSummary = {
  id: number | string;
  order_no?: string;
  order_type: PaymentOrderType;
  status: PaymentOrderStatus;
  amount?: string | number;
  currency?: string;
  expected_amount_lbc?: string | number;
  actual_amount_lbc?: string | number;
  pay_to_address?: string;
  txid?: string;
  confirmations?: number;
  paid_at?: string | null;
  expires_at?: string | null;
  backend_note?: string;
  reason?: string;
  detail?: string;
  created_at?: string;
  live_title?: string;
  product_title?: string;
  plan_name?: string;
  plan?: { id?: number | string; name?: string } | null;
  price_thb?: string | number;
  display_price_thb?: string | number;
  price_fiat_thb?: string | number;
  thb_price?: string | number;
  live?: { id?: number | string; title?: string } | null;
  product?: { id?: number | string; title?: string } | null;
  [key: string]: any;
};

export type PaymentOrder = PaymentOrderSummary & {
  external_reference?: string;
  payment_method?: { id?: number | string; title?: string } | null;
  buyer?: { id?: number | string; username?: string; name?: string } | null;
};
