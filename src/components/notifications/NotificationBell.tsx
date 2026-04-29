import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationChangedEventName,
} from '@/services/localNotifications';
import type { AppNotification } from '@/types/notifications';
import { BellOutlined } from '@ant-design/icons';
import { history, useIntl } from '@umijs/max';
import { Badge, Button, Dropdown, Empty, List, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Text } = Typography;

export default function NotificationBell({ userKey }: { userKey: string }) {
  const intl = useIntl();
  const [items, setItems] = useState<AppNotification[]>([]);

  const refresh = () => {
    setItems(listNotifications(userKey));
  };

  useEffect(() => {
    refresh();
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (!detail?.userKey || detail.userKey === userKey) refresh();
    };
    window.addEventListener(notificationChangedEventName, handler);
    return () =>
      window.removeEventListener(notificationChangedEventName, handler);
  }, [userKey]);

  const unreadCount = useMemo(() => getUnreadCount(userKey), [items, userKey]);

  const content = (
    <div style={{ width: 340, maxWidth: '90vw' }}>
      <Space
        align="center"
        style={{
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <Text strong>{intl.formatMessage({ id: 'notifications.title' })}</Text>
        <Button
          size="small"
          type="link"
          onClick={() => markAllNotificationsRead(userKey)}
        >
          {intl.formatMessage({ id: 'notifications.markAllRead' })}
        </Button>
      </Space>
      {items.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={intl.formatMessage({ id: 'notifications.empty' })}
        />
      ) : (
        <List
          dataSource={items}
          style={{ maxHeight: 360, overflow: 'auto' }}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                marginBottom: 6,
                background: item.read ? 'transparent' : '#fff7e8',
                cursor: 'pointer',
              }}
              onClick={() => {
                markNotificationRead(userKey, item.id);
                const url = String(item.data?.url || '');
                if (url) history.push(url);
              }}
            >
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <Text strong={!item.read}>{item.title}</Text>
                {item.body ? <Text type="secondary">{item.body}</Text> : null}
              </Space>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown trigger={['click']} dropdownRender={() => content}>
      <Button
        type="text"
        icon={
          <Badge count={unreadCount} size="small" overflowCount={99}>
            <BellOutlined style={{ fontSize: 16 }} />
          </Badge>
        }
        style={{ width: 30, height: 30, borderRadius: 10 }}
      />
    </Dropdown>
  );
}
