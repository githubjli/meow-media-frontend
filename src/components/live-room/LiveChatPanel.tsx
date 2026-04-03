import type { LiveChatMessage } from '@/types/liveChat';
import { useIntl } from '@umijs/max';
import { Alert, Card, Skeleton, Space, Typography } from 'antd';
import LiveChatComposer from './LiveChatComposer';
import LiveChatMessageList from './LiveChatMessageList';

const { Text } = Typography;

export default function LiveChatPanel({
  loading,
  errorMessage,
  items,
  canCompose,
  composeDisabledReason,
  canModerate,
  onSend,
  onPinToggle,
  onDelete,
}: {
  loading: boolean;
  errorMessage: string;
  items: LiveChatMessage[];
  canCompose: boolean;
  composeDisabledReason?: string;
  canModerate: boolean;
  onSend: (content: string) => Promise<void>;
  onPinToggle: (item: LiveChatMessage) => Promise<void>;
  onDelete: (item: LiveChatMessage) => Promise<void>;
}) {
  const intl = useIntl();

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 16 }}
      bodyStyle={{ padding: 10 }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Text type="secondary">
          {intl.formatMessage({ id: 'live.chat.subtitle' })}
        </Text>
        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        ) : null}
        {!loading && errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}
        {!loading && !errorMessage ? (
          <LiveChatMessageList
            items={items}
            canModerate={canModerate}
            onPinToggle={onPinToggle}
            onDelete={onDelete}
          />
        ) : null}
        {!canCompose && composeDisabledReason ? (
          <Alert type="info" showIcon message={composeDisabledReason} />
        ) : null}
        <LiveChatComposer
          disabled={!canCompose}
          disabledReason={composeDisabledReason}
          onSubmit={onSend}
        />
      </Space>
    </Card>
  );
}
