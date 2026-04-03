import type { LiveChatMessage } from '@/types/liveChat';
import { DeleteOutlined, PushpinOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Avatar, Button, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

const formatTime = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const resolveMessageTone = (messageType?: string) => {
  if (messageType === 'system') {
    return {
      border: '1px solid rgba(59, 130, 246, 0.25)',
      background: 'rgba(239, 246, 255, 0.8)',
    };
  }
  if (messageType === 'payment') {
    return {
      border: '1px solid rgba(34, 197, 94, 0.25)',
      background: 'rgba(240, 253, 244, 0.8)',
    };
  }
  if (messageType === 'product') {
    return {
      border: '1px solid rgba(168, 85, 247, 0.25)',
      background: 'rgba(250, 245, 255, 0.8)',
    };
  }
  return {
    border: '1px solid rgba(15, 23, 42, 0.08)',
    background: '#fffaf2',
  };
};

export default function LiveChatMessageItem({
  item,
  canModerate,
  onPinToggle,
  onDelete,
}: {
  item: LiveChatMessage;
  canModerate: boolean;
  onPinToggle: (item: LiveChatMessage) => Promise<void>;
  onDelete: (item: LiveChatMessage) => Promise<void>;
}) {
  const intl = useIntl();
  const tone = resolveMessageTone(item.message_type);

  return (
    <div
      style={{
        borderRadius: 10,
        padding: 10,
        border: item.is_pinned
          ? '1px solid rgba(184, 135, 46, 0.28)'
          : tone.border,
        background: item.is_pinned
          ? 'rgba(255, 249, 237, 0.75)'
          : tone.background,
      }}
    >
      <Space direction="vertical" size={6} style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Space size={8}>
            <Avatar size={24} src={item.user?.avatar_url || undefined}>
              {(item.user?.name || item.user?.username || '?')
                .charAt(0)
                .toUpperCase()}
            </Avatar>
            <div>
              <Text style={{ display: 'block', fontWeight: 600, fontSize: 12 }}>
                {item.user?.name ||
                  item.user?.username ||
                  intl.formatMessage({ id: 'live.chat.user.unknown' })}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {formatTime(item.created_at)}
              </Text>
            </div>
          </Space>
          <Space size={4}>
            {item.is_pinned ? (
              <Tag color="gold">
                {intl.formatMessage({ id: 'live.products.pinned' })}
              </Tag>
            ) : null}
            {item.message_type ? <Tag>{item.message_type}</Tag> : null}
          </Space>
        </Space>

        {item.content ? <Text>{item.content}</Text> : null}

        {item.product?.title ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {`${item.product.title} · ${item.product.price_amount || '-'} ${
              item.product.price_currency || ''
            }`}
          </Text>
        ) : null}

        {canModerate ? (
          <Space size={4}>
            <Button
              size="small"
              icon={<PushpinOutlined />}
              onClick={() => onPinToggle(item)}
            >
              {intl.formatMessage({ id: 'live.chat.actions.pinToggle' })}
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(item)}
            >
              {intl.formatMessage({ id: 'seller.product.actions.delete' })}
            </Button>
          </Space>
        ) : null}
      </Space>
    </div>
  );
}
