export type PaymentOrderType = 'tip' | 'product' | string;

export type PaymentOrderStatus = string;

export type PaymentOrderSummary = {
  id: number | string;
  order_type: PaymentOrderType;
  status: PaymentOrderStatus;
  amount: string;
  currency: string;
  created_at?: string;
  live_title?: string;
  product_title?: string;
  live?: { id?: number | string; title?: string } | null;
  product?: { id?: number | string; title?: string } | null;
};

export type PaymentOrder = PaymentOrderSummary & {
  external_reference?: string;
  payment_method?: { id?: number | string; title?: string } | null;
  buyer?: { id?: number | string; username?: string; name?: string } | null;
};
