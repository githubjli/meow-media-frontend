import LiveProductCard from '@/components/live-room/LiveProductCard';
import type { LiveChatMessage } from '@/types/liveChat';
import type { LiveProductBinding } from '@/types/liveProduct';
import { useIntl } from '@umijs/max';
import { Alert, Col, Empty, Row, Skeleton, Tabs } from 'antd';
import LiveChatPanel from './LiveChatPanel';

export default function LiveInteractionPanel({
  productsLoading,
  productsError,
  products,
  chatLoading,
  chatError,
  chatMessages,
  canCompose,
  canModerate,
  onSend,
  onPinToggle,
  onDelete,
}: {
  productsLoading: boolean;
  productsError: string;
  products: LiveProductBinding[];
  chatLoading: boolean;
  chatError: string;
  chatMessages: LiveChatMessage[];
  canCompose: boolean;
  canModerate: boolean;
  onSend: (content: string) => Promise<void>;
  onPinToggle: (item: LiveChatMessage) => Promise<void>;
  onDelete: (item: LiveChatMessage) => Promise<void>;
}) {
  const intl = useIntl();

  return (
    <Tabs
      defaultActiveKey="products"
      items={[
        {
          key: 'products',
          label: intl.formatMessage({ id: 'live.products.title' }),
          children: productsLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : productsError ? (
            <Alert type="warning" showIcon message={productsError} />
          ) : products.length === 0 ? (
            <Empty
              description={intl.formatMessage({ id: 'live.products.empty' })}
            />
          ) : (
            <Row gutter={[10, 10]}>
              {products.map((binding) => (
                <Col xs={24} key={String(binding.binding_id)}>
                  <LiveProductCard binding={binding} />
                </Col>
              ))}
            </Row>
          ),
        },
        {
          key: 'chat',
          label: intl.formatMessage({ id: 'live.room.viewerChat' }),
          children: (
            <LiveChatPanel
              loading={chatLoading}
              errorMessage={chatError}
              items={chatMessages}
              canCompose={canCompose}
              canModerate={canModerate}
              onSend={onSend}
              onPinToggle={onPinToggle}
              onDelete={onDelete}
            />
          ),
        },
      ]}
    />
  );
}
