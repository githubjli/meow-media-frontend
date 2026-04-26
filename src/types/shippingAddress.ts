export type ShippingAddress = {
  id: number | string;
  receiver_name: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  district: string;
  street_address: string;
  postal_code: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ShippingAddressPayload = Partial<
  Omit<ShippingAddress, 'id' | 'created_at' | 'updated_at'>
>;
