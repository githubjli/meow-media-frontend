export type LiveChatUserSummary = {
  id?: number | string;
  name?: string;
  username?: string;
  avatar_url?: string | null;
};

export type LiveChatProductSummary = {
  id?: number | string;
  title?: string;
  cover_image_url?: string | null;
  price_amount?: string;
  price_currency?: string;
};

export type LiveChatMessage = {
  id: number | string;
  live_id?: number | string;
  message_type?: string;
  content?: string;
  created_at?: string;
  is_pinned?: boolean;
  is_deleted?: boolean;
  user?: LiveChatUserSummary | null;
  product?: LiveChatProductSummary | null;
};

export type LiveChatListResponse = {
  results: LiveChatMessage[];
  next_after_id?: number | string | null;
};
