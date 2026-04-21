import type { PaymentOrder } from '@/types/paymentOrder';
import { useIntl } from '@umijs/max';
import { Button, Card, Descriptions, Space, Tag } from 'antd';

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const formatSettlementValue = (
  value: string | number | undefined,
  intl: any,
) => {
  if (value === undefined || value === null || value === '') return '-';
  return `${value} ${intl.formatMessage({
    id: 'account.subscription.plan.ltt',
  })}`;
};

const resolveDisplayAmount = (order: PaymentOrder, intl: any) => {
  const actual = toNumber(order.actual_amount_lbc);
  if (actual > 0) return formatSettlementValue(order.actual_amount_lbc, intl);
  if (
    order.expected_amount_lbc !== undefined &&
    order.expected_amount_lbc !== null &&
    order.expected_amount_lbc !== ''
  ) {
    return formatSettlementValue(order.expected_amount_lbc, intl);
  }
  if (
    order.amount !== undefined &&
    order.amount !== null &&
    order.amount !== ''
  ) {
    return `${order.amount} ${order.currency || ''}`.trim();
  }
  return '-';
};

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
          {order.order_no ? (
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'account.paymentOrders.orderNo',
              })}
            >
              {order.order_no}
            </Descriptions.Item>
          ) : null}
          <Descriptions.Item
            label={intl.formatMessage({ id: 'live.orders.orderType' })}
          >
            <Tag>{order.order_type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item
            label={intl.formatMessage({ id: 'live.orders.amount' })}
          >
            {resolveDisplayAmount(order, intl)}
          </Descriptions.Item>
          {order.expected_amount_lbc !== undefined ? (
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'account.paymentOrders.expectedAmount',
              })}
            >
              {formatSettlementValue(order.expected_amount_lbc, intl)}
            </Descriptions.Item>
          ) : null}
          {order.actual_amount_lbc !== undefined ? (
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'account.paymentOrders.actualAmount',
              })}
            >
              {formatSettlementValue(order.actual_amount_lbc, intl)}
            </Descriptions.Item>
          ) : null}
          {order.pay_to_address ? (
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'account.paymentOrders.paymentAddress',
              })}
            >
              {order.pay_to_address}
            </Descriptions.Item>
          ) : null}
          {order.txid ? (
            <Descriptions.Item
              label={intl.formatMessage({ id: 'account.paymentOrders.txid' })}
            >
              {order.txid}
            </Descriptions.Item>
          ) : null}
          {typeof order.confirmations === 'number' ? (
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'account.paymentOrders.confirmations',
              })}
            >
              {order.confirmations}
            </Descriptions.Item>
          ) : null}
          {order.paid_at ? (
            <Descriptions.Item
              label={intl.formatMessage({ id: 'account.paymentOrders.paidAt' })}
            >
              {order.paid_at}
            </Descriptions.Item>
          ) : null}
          {order.expires_at ? (
            <Descriptions.Item
              label={intl.formatMessage({
                id: 'account.paymentOrders.expiresAt',
              })}
            >
              {order.expires_at}
            </Descriptions.Item>
          ) : null}
          <Descriptions.Item
            label={intl.formatMessage({ id: 'live.orders.status' })}
          >
            <Tag>{order.status}</Tag>
          </Descriptions.Item>
          {order.backend_note || order.reason || order.detail ? (
            <Descriptions.Item
              label={intl.formatMessage({ id: 'account.paymentOrders.note' })}
            >
              {order.backend_note || order.reason || order.detail}
            </Descriptions.Item>
          ) : null}
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
