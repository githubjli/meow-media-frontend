export type LivePaymentMethodType =
  | 'watch_qr'
  | 'pay_qr'
  | 'paid_program_qr'
  | 'crypto_address';

export type LivePaymentMethod = {
  id: number | string;
  method_type: LivePaymentMethodType;
  title: string;
  qr_image_url?: string | null;
  qr_text?: string;
  wallet_address?: string;
  sort_order?: number;
};

export type ManageLivePaymentMethod = LivePaymentMethod & {
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};
