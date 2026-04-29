import type { CurrentUser } from '@/services/auth';
import type { AppNotification } from '@/types/notifications';

const MAX_NOTIFICATIONS = 50;
const NOTIFICATION_EVENT = 'meow:notifications:changed';

const resolveStorageKey = (userKey: string) => `meow_notifications_${userKey}`;

export const getNotificationUserKey = (user?: CurrentUser | null) =>
  String(user?.id || user?.email || user?.username || 'guest');

const emitChanged = (userKey: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_EVENT, {
      detail: { userKey },
    }),
  );
};

export const listNotifications = (userKey: string): AppNotification[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(resolveStorageKey(userKey));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const saveNotifications = (userKey: string, items: AppNotification[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    resolveStorageKey(userKey),
    JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)),
  );
  emitChanged(userKey);
};

export const addNotification = (
  userKey: string,
  notification: AppNotification,
) => {
  const existing = listNotifications(userKey).filter(
    (item) => item.id !== notification.id,
  );
  saveNotifications(userKey, [notification, ...existing]);
};

export const markNotificationRead = (userKey: string, id: string) => {
  const next = listNotifications(userKey).map((item) =>
    item.id === id ? { ...item, read: true } : item,
  );
  saveNotifications(userKey, next);
};

export const markAllNotificationsRead = (userKey: string) => {
  const next = listNotifications(userKey).map((item) => ({
    ...item,
    read: true,
  }));
  saveNotifications(userKey, next);
};

export const getUnreadCount = (userKey: string) =>
  listNotifications(userKey).filter((item) => !item.read).length;

export const notificationChangedEventName = NOTIFICATION_EVENT;
