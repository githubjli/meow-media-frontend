import type { LiveChatMessage } from '@/types/liveChat';
import { useIntl } from '@umijs/max';
import { Empty, Space } from 'antd';
import LiveChatMessageItem from './LiveChatMessageItem';

export default function LiveChatMessageList({
  items,
  canModerate,
  onPinToggle,
  onDelete,
}: {
  items: LiveChatMessage[];
  canModerate: boolean;
  onPinToggle: (item: LiveChatMessage) => Promise<void>;
  onDelete: (item: LiveChatMessage) => Promise<void>;
}) {
  const intl = useIntl();

  if (items.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={intl.formatMessage({ id: 'live.chat.empty' })}
      />
    );
  }

  return (
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      {items.map((item) => (
        <LiveChatMessageItem
          key={String(item.id)}
          item={item}
          canModerate={canModerate}
          onPinToggle={onPinToggle}
          onDelete={onDelete}
        />
      ))}
    </Space>
  );
}
