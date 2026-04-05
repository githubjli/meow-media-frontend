import LiveProductCard from '@/components/live-room/LiveProductCard';
import type { LiveChatMessage } from '@/types/liveChat';
import type { LivePaymentMethod } from '@/types/livePaymentMethod';
import type { LiveProductBinding } from '@/types/liveProduct';
import type { PaymentOrder } from '@/types/paymentOrder';
import { useIntl } from '@umijs/max';
import { Alert, Col, Empty, Row, Skeleton, Tabs, Typography } from 'antd';
import LiveChatPanel from './LiveChatPanel';

const { Text } = Typography;

export default function LiveInteractionPanel({
  productsLoading,
  productsError,
  products,
  chatLoading,
  chatError,
  chatMessages,
  paymentsLoading,
  paymentsError,
  paymentMethods,
  createOrderLoading,
  createOrderError,
  latestOrder,
  canCompose,
  composeDisabledReason,
  canModerate,
  isLoggedIn,
  canMarkOrderPaid,
  onRequireLogin,
  onCopyPaymentValue,
  onCreateOrder,
  onMarkOrderPaid,
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
  paymentsLoading: boolean;
  paymentsError: string;
  paymentMethods: LivePaymentMethod[];
  createOrderLoading: boolean;
  createOrderError: string;
  latestOrder?: PaymentOrder | null;
  canCompose: boolean;
  composeDisabledReason?: string;
  canModerate: boolean;
  isLoggedIn: boolean;
  canMarkOrderPaid: boolean;
  onRequireLogin: () => void;
  onCopyPaymentValue: (value: string, label: string) => void;
  onCreateOrder: (values: any) => Promise<void>;
  onMarkOrderPaid: () => Promise<void>;
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
              composeDisabledReason={composeDisabledReason}
              canModerate={canModerate}
              onSend={onSend}
              onPinToggle={onPinToggle}
              onDelete={onDelete}
            />
          ),
        },
        {
          key: 'payments',
          label: intl.formatMessage({ id: 'live.reviews.title' }),
          children: (
            <div>
              <Empty
                description={intl.formatMessage({
                  id: 'live.reviews.placeholder.comingSoon',
                })}
              />
              <Text
                type="secondary"
                style={{ display: 'block', textAlign: 'center' }}
              >
                {intl.formatMessage({
                  id: 'live.reviews.placeholder.willAppear',
                })}
              </Text>
            </div>
          ),
        },
      ]}
    />
  );
}
