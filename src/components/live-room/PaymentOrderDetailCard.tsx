import type { PaymentOrder } from '@/types/paymentOrder';
import { useIntl } from '@umijs/max';
import { Button, Card, Descriptions, Space, Tag } from 'antd';

const formatSettlementValue = (
  value: string | number | undefined,
  intl: any,
) => {
  if (value === undefined || value === null || value === '') return '-';
  return `${value} ${intl.formatMessage({
    id: 'account.subscription.plan.ltt',
  })}`;
};

const resolvePlanName = (order: PaymentOrder, intl: any) =>
  order.plan_name ||
  order.plan?.name ||
  intl.formatMessage({ id: 'account.paymentOrders.membershipOrder' });

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
            label={intl.formatMessage({
              id: 'account.paymentOrders.orderNo',
            })}
          >
            {order.order_no || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'live.orders.orderType' })}
          >
            <Tag>{order.order_type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'account.paymentOrders.planName' })}
          >
            {resolvePlanName(order, intl)}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'account.paymentOrders.expectedAmount',
            })}
          >
            {formatSettlementValue(order.expected_amount_lbc, intl)}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'account.paymentOrders.actualAmount',
            })}
          >
            {formatSettlementValue(order.actual_amount_lbc, intl)}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'account.paymentOrders.txid' })}
          >
            {order.txid || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'account.paymentOrders.paymentAddress',
            })}
          >
            {order.pay_to_address || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'account.paymentOrders.confirmations',
            })}
          >
            {typeof order.confirmations === 'number'
              ? order.confirmations
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'live.orders.createdAt' })}
          >
            {order.created_at || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'account.paymentOrders.paidAt' })}
          >
            {order.paid_at || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({
              id: 'account.paymentOrders.expiresAt',
            })}
          >
            {order.expires_at || '-'}
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'live.orders.status' })}
          >
            <Tag>{order.status}</Tag>
          </Descriptions.Item>
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
