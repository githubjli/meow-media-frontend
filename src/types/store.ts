export type SellerStore = {
  id: number;
  owner?: number;
  name: string;
  slug: string;
  description?: string;
  logo?: string | File | null;
  banner?: string | File | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};
