export type LiveProductStoreSummary = {
  id?: number | string;
  name?: string;
  slug?: string;
};

export type LiveProductSummary = {
  id: number | string;
  title: string;
  description?: string;
  cover_image_url?: string | null;
  price_amount?: string;
  price_currency?: string;
  store?: LiveProductStoreSummary | null;
};

export type LiveProductBinding = {
  binding_id: number | string;
  sort_order?: number;
  is_pinned?: boolean;
  is_active?: boolean;
  start_at?: string | null;
  end_at?: string | null;
  product: LiveProductSummary;
};
