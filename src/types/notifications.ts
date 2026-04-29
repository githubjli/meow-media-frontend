export type AppNotificationType =
  | 'daily_reward'
  | 'meow_points_recharge'
  | 'drama_unlock'
  | 'new_follower'
  | 'new_comment'
  | 'system';

export type AppNotification = {
  id: string;
  type: AppNotificationType;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
  data?: Record<string, unknown>;
};
