export type RefundRequestStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'cancelled';

export type RefundRequest = {
  id: number | string;
  order_no?: string;
  reason?: string;
  requested_amount?: string | number;
  refund_txid?: string;
  status?: RefundRequestStatus | string;
  buyer_summary?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};
