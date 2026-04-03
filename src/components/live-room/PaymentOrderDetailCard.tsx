import type { PaymentOrder } from '@/types/paymentOrder';
import { useIntl } from '@umijs/max';
import { Button, Card, Descriptions, Space, Tag } from 'antd';

export default function PaymentOrderDetailCard({
  order,
  canMarkPaid,
  onMarkPaid,
}: {
  order: PaymentOrder;
  canMarkPaid?: boolean;
  onMarkPaid?: () => Promise<void>;
}) {
  const intl = useIntl();

  return (
    <Card
      size="small"
      title={intl.formatMessage({ id: 'live.orders.detail.title' })}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item
            label={intl.formatMessage({ id: 'live.orders.id' })}
          >
            {String(order.id)}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'live.orders.orderType' })}
          >
            <Tag>{order.order_type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'live.orders.amount' })}
          >
            {`${order.amount} ${order.currency}`}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'live.orders.status' })}
          >
            <Tag>{order.status}</Tag>
          </Descriptions.Item>
          {order.external_reference ? (
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'live.orders.externalReference',
              })}
            >
              {order.external_reference}
            </Descriptions.Item>
          ) : null}
        </Descriptions>
        {canMarkPaid && onMarkPaid ? (
          <Button onClick={onMarkPaid}>
            {intl.formatMessage({ id: 'live.orders.markPaid' })}
          </Button>
        ) : null}
      </Space>
    </Card>
  );
}
