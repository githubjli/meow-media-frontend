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
  status: string;
  product_title_snapshot: string;
  product_price_snapshot: string | number;
  quantity: number;
  total_amount: string | number;
  expected_amount: string | number;
  currency: string;
  pay_to_address?: string;
  expires_at?: string;
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
};

export type ProductOrderListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: ProductOrder[];
};
