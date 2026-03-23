export type VideoInteractionSummary = {
  video_id: number | string;
  like_count?: number;
  comment_count?: number;
  subscriber_count?: number;
  viewer_has_liked?: boolean;
  viewer_is_subscribed?: boolean;
  [key: string]: any;
};

export type CommentUser = {
  id: number | string;
  name?: string;
  avatar_url?: string;
  [key: string]: any;
};

export type CommentItem = {
  id: number | string;
  video_id: number | string;
  parent_id?: number | string | null;
  content: string;
  created_at?: string;
  updated_at?: string;
  like_count?: number;
  reply_count?: number;
  viewer_has_liked?: boolean;
  user: CommentUser;
  [key: string]: any;
};

export type CommentListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: CommentItem[];
};
