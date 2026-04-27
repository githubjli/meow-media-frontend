export type PayoutAddress = {
  id: number | string;
  blockchain: string;
  token_symbol: string;
  address: string;
  label?: string;
  is_default?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PayoutAddressPayload = Partial<
  Omit<PayoutAddress, 'id' | 'created_at' | 'updated_at'>
>;
