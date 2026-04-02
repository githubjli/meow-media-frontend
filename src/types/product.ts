export type ProductStatus = 'draft' | 'active' | 'inactive';

export type Product = {
  id: number;
  store?: number;
  title: string;
  slug: string;
  description?: string;
  cover_image?: string | null;
  price_amount: string;
  price_currency: string;
  stock_quantity: number;
  status: ProductStatus;
  created_at?: string;
  updated_at?: string;
};

export type ProductListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: Product[];
};
