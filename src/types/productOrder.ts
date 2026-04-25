export type ProductOrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'shipping'
  | 'completed'
  | 'settled'
  | 'cancelled';

export type ProductOrderPaymentStatus =
  | 'pending'
  | 'paid'
  | 'underpaid'
  | 'overpaid'
  | 'expired'
  | 'failed'
  | 'cancelled';

export type ProductOrderShipment = {
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  shipped_note?: string;
  [key: string]: any;
};

export type ProductOrderPayout = {
  [key: string]: any;
};

export type ProductOrder = {
  order_no: string;
  status: ProductOrderStatus | string;
  payment_status?: ProductOrderPaymentStatus | string | null;
  product_order_status?: ProductOrderStatus | string | null;
  product_title_snapshot: string;
  product_price_snapshot: string | number;
  quantity: number;
  total_amount: string | number;
  actual_amount?: string | number | null;
  expected_amount: string | number;
  currency: string;
  pay_to_address?: string;
  expires_at?: string;
  stock_locked_at?: string | null;
  stock_released_at?: string | null;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  txid?: string | null;
  confirmations?: number | string | null;
  qr_payload?: string;
  qr_text?: string;
  payment_uri?: string;
  shipment?: ProductOrderShipment | null;
  payout?: ProductOrderPayout | null;
  paid_at?: string | null;
  shipped_at?: string | null;
  completed_at?: string | null;
  settled_at?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

export type ProductOrderListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: ProductOrder[];
};
