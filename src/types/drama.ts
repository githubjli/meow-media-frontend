export type DramaWatchProgress = {
  seconds?: number;
  watched_seconds?: number;
  duration_seconds?: number;
  percent?: number;
  updated_at?: string;
  [key: string]: any;
};

export type DramaEpisodeAccess = {
  can_watch?: boolean;
  is_unlocked?: boolean;
  unlock_type?: string;
  points_price?: number | string;
  meow_points_price?: number | string;
  coin_price?: number | string;
  playback_url?: string;
  hls_url?: string;
  video_url?: string;
  progress?: DramaWatchProgress | number | string;
  [key: string]: any;
};

export type DramaEpisode = DramaEpisodeAccess & {
  id: number | string;
  series_id?: number | string;
  episode_no?: number;
  number?: number;
  title?: string;
  description?: string;
  duration_seconds?: number;
  thumbnail_url?: string;
  status?: string;
  updated_at?: string;
  [key: string]: any;
};

export type DramaSeries = {
  id: number | string;
  slug?: string;
  title?: string;
  description?: string;
  category?: string;
  category_display?: string;
  cover?: string;
  cover_url?: string;
  poster_url?: string;
  thumbnail_url?: string;
  total_episodes?: number;
  episodes_count?: number;
  view_count?: number;
  favorite_count?: number;
  is_favorited?: boolean;
  is_free?: boolean;
  is_vip?: boolean;
  is_locked?: boolean;
  points_price?: number | string;
  meow_points_price?: number | string;
  coin_price?: number | string;
  status?: string;
  visibility?: string;
  tags?: string[];
  updated_at?: string;
  latest_progress?: DramaWatchProgress | null;
  [key: string]: any;
};

export type DramaListResponse = {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: DramaSeries[];
};

export type DramaViewTrackResponse = {
  series_id: number;
  view_count: number;
  counted: boolean;
};

export type CreatorDramaSeriesPayload = {
  title: string;
  description?: string;
  cover?: File | string | null;
  cover_url?: string;
  category?: number | string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived' | string;
  visibility?: 'public' | 'private' | 'unlisted' | string;
  [key: string]: any;
};

export type CreatorDramaEpisodePayload = {
  episode_no?: number;
  title: string;
  description?: string;
  video_file?: File | null;
  thumbnail?: File | string | null;
  thumbnail_url?: string;
  video_url?: string;
  hls_url?: string;
  playback_url?: string;
  unlock_type?:
    | 'free'
    | 'meow_points'
    | 'coin'
    | 'membership'
    | 'ad_reward'
    | string;
  points_price?: number | string;
  meow_points_price?: number | string;
  coin_price?: number | string;
  status?: 'draft' | 'published' | 'archived' | string;
  duration_seconds?: number;
  [key: string]: any;
};

export type CreatorDramaListResponse = DramaListResponse;
