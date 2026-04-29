export type MeowPointWallet = {
  balance?: number | string;
  available_balance?: number | string;
  total_purchased?: number | string;
  total_bonus?: number | string;
  total_spent?: number | string;
  updated_at?: string;
  [key: string]: any;
};

export type MeowPointPackage = {
  id?: number | string;
  code?: string;
  name?: string;
  title?: string;
  description?: string;
  points?: number | string;
  points_amount?: number | string;
  bonus_points?: number | string;
  total_points?: number | string;
  price?: number | string;
  price_amount?: number | string;
  price_thb?: number | string;
  currency?: string;
  price_currency?: string;
  active?: boolean;
  [key: string]: any;
};

export type MeowPointLedgerEntry = {
  id?: number | string;
  created_at?: string;
  type?: string;
  category?: string;
  amount?: number | string;
  delta?: number | string;
  balance_after?: number | string;
  reference?: string;
  note?: string;
  description?: string;
  [key: string]: any;
};

export type MeowPointLedgerParams = {
  page?: number;
  page_size?: number;
  type?: string;
};

export type MeowPointOrderStatus =
  | 'pending'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'failed'
  | 'underpaid'
  | 'overpaid'
  | string;

export type MeowPointOrder = {
  id?: number | string;
  order_no?: string;
  status?: MeowPointOrderStatus;
  package_code?: string;
  package_name?: string;
  package_snapshot?: {
    code?: string;
    name?: string;
    title?: string;
  } | null;
  points_amount?: number | string;
  bonus_points?: number | string;
  total_points?: number | string;
  payment_amount?: number | string;
  amount?: number | string;
  price_amount?: number | string;
  payment_currency?: string;
  currency?: string;
  pay_to_address?: string;
  txid?: string;
  confirmations?: number;
  expires_at?: string | null;
  paid_at?: string | null;
  credited_at?: string | null;
  created_at?: string;
  [key: string]: any;
};

export type MeowPointOrderListParams = {
  page?: number;
  page_size?: number;
  status?: string;
};

export type CreateMeowPointOrderResponse = MeowPointOrder;

export type DailyLoginRewardResponse = {
  granted: boolean;
  points_amount: number;
  reward_date: string;
  [key: string]: any;
};
