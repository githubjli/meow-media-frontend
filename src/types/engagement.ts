export type VideoInteractionSummary = {
  video_id: number | string;
  like_count?: number;
  comment_count?: number;
  subscriber_count?: number;
  viewer_has_liked?: boolean;
  viewer_is_subscribed?: boolean;
  [key: string]: any;
};

export type CommentItem = {
  id: number | string;
  video: number | string;
  content: string;
  created_at?: string;
  updated_at?: string;
  user?: {
    id?: number | string;
    email?: string;
    username?: string;
    [key: string]: any;
  };
  [key: string]: any;
};

export type CommentListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: CommentItem[];
};
