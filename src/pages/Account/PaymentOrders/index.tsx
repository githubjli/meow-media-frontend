import PageIntroCard from '@/components/PageIntroCard';
import PaymentOrderDetailCard from '@/components/live-room/PaymentOrderDetailCard';
import {
  getLivePaymentOrderDetail,
  getMyPaymentOrders,
} from '@/services/livePaymentOrders';
import type { PaymentOrder, PaymentOrderSummary } from '@/types/paymentOrder';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export default function AccountPaymentOrdersPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PaymentOrderSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PaymentOrder | null>(null);
  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const locale = intl.locale || 'en-US';

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  };

  const formatLegacyAmount = (row: PaymentOrderSummary) => {
    const rawAmount = Number(row.amount);
    if (!Number.isFinite(rawAmount)) {
      return `${row.amount ?? '-'} ${row.currency || ''}`.trim();
    }

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: row.currency || 'USD',
        currencyDisplay: 'code',
      }).format(rawAmount);
    } catch (error) {
      return `${rawAmount} ${row.currency || ''}`.trim();
    }
  };

  const formatSettlementAmount = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === '') return '-';
    return `${value} ${intl.formatMessage({
      id: 'account.subscription.plan.ltt',
    })}`;
  };

  const resolveAmountDisplay = (row: PaymentOrderSummary) => {
    const hasMembershipAmounts =
      row.expected_amount_lbc !== undefined ||
      row.actual_amount_lbc !== undefined;
    const isMembershipOrder =
      String(row.order_type || '').toLowerCase() === 'membership' ||
      hasMembershipAmounts;
    const actualAmount = toNumber(row.actual_amount_lbc);
    if (isMembershipOrder && actualAmount > 0) {
      return {
        primary: formatSettlementAmount(row.actual_amount_lbc),
        secondary:
          row.expected_amount_lbc !== undefined
            ? intl.formatMessage(
                { id: 'account.paymentOrders.expectedAmountValue' },
                { value: formatSettlementAmount(row.expected_amount_lbc) },
              )
            : '',
      };
    }

    if (
      isMembershipOrder &&
      row.expected_amount_lbc !== undefined &&
      row.expected_amount_lbc !== null &&
      row.expected_amount_lbc !== ''
    ) {
      return {
        primary: formatSettlementAmount(row.expected_amount_lbc),
        secondary: '',
      };
    }

    return {
      primary: formatLegacyAmount(row),
      secondary: '',
    };
  };

  const resolveStatusMeta = (status?: string) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'paid') {
      return {
        color: 'green',
        text: intl.formatMessage({ id: 'account.paymentOrders.status.paid' }),
      };
    }
    if (normalized === 'underpaid') {
      return {
        color: 'orange',
        text: intl.formatMessage({
          id: 'account.paymentOrders.status.underpaid',
        }),
      };
    }
    if (normalized === 'overpaid') {
      return {
        color: 'blue',
        text: intl.formatMessage({
          id: 'account.paymentOrders.status.overpaid',
        }),
      };
    }
    if (normalized === 'expired') {
      return {
        color: 'default',
        text: intl.formatMessage({
          id: 'account.paymentOrders.status.expired',
        }),
      };
    }
    if (
      normalized === 'paid_after_expiry' ||
      normalized === 'paid_after_expired' ||
      normalized === 'paid_after_expire'
    ) {
      return {
        color: 'purple',
        text: intl.formatMessage({
          id: 'account.paymentOrders.status.paidAfterExpiry',
        }),
      };
    }
    if (['pending', 'created', 'unpaid'].includes(normalized)) {
      return {
        color: 'gold',
        text: intl.formatMessage({
          id: 'account.paymentOrders.status.pending',
        }),
      };
    }
    if (['failed', 'cancelled', 'canceled'].includes(normalized)) {
      return {
        color: 'red',
        text: String(status || '-').toUpperCase(),
      };
    }
    return {
      color: 'default',
      text: String(status || '-').toUpperCase(),
    };
  };

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(
        `/login?redirect=${encodeURIComponent('/account/payment-orders')}`,
      );
      return;
    }

    if (!isLoggedIn) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    getMyPaymentOrders()
      .then((data) => setItems(data))
      .catch((error: any) =>
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'account.paymentOrders.error' }),
        ),
      )
      .finally(() => setLoading(false));
  }, [initialState?.authLoading, intl, isLoggedIn]);

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <PageIntroCard
          title={intl.formatMessage({ id: 'account.paymentOrders.title' })}
          description={intl.formatMessage({
            id: 'account.paymentOrders.subtitle',
          })}
        />

        {errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}

        {loading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Spin />
          </Card>
        ) : items.length === 0 ? (
          <Empty
            description={intl.formatMessage({
              id: 'account.paymentOrders.empty',
            })}
          />
        ) : (
          <Table
            rowKey="id"
            dataSource={items}
            columns={[
              {
                title: intl.formatMessage({ id: 'live.orders.id' }),
                render: (_, row) => row.order_no || row.id,
              },
              {
                title: intl.formatMessage({ id: 'live.orders.orderType' }),
                dataIndex: 'order_type',
              },
              {
                title: intl.formatMessage({ id: 'live.orders.amount' }),
                render: (_, row) => {
                  const amount = resolveAmountDisplay(row);
                  return (
                    <Space direction="vertical" size={0}>
                      <span>{amount.primary}</span>
                      {amount.secondary ? (
                        <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                          {amount.secondary}
                        </span>
                      ) : null}
                    </Space>
                  );
                },
              },
              {
                title: intl.formatMessage({ id: 'live.orders.status' }),
                render: (_, row) => {
                  const statusMeta = resolveStatusMeta(row.status);
                  return <Tag color={statusMeta.color}>{statusMeta.text}</Tag>;
                },
              },
              {
                title: intl.formatMessage({ id: 'live.orders.createdAt' }),
                render: (_, row) => formatDateTime(row.created_at),
              },
              {
                title: intl.formatMessage({ id: 'common.actions' }),
                render: (_, row) => (
                  <Button
                    size="small"
                    onClick={async () => {
                      setDetailOpen(true);

                      if (row.order_type === 'membership' || !row.live?.id) {
                        setDetail(row as PaymentOrder);
                        return;
                      }

                      setDetailLoading(true);
                      try {
                        const detailItem = await getLivePaymentOrderDetail(
                          row.live.id,
                          row.id,
                        );
                        setDetail(detailItem);
                      } catch (error: any) {
                        setDetail(null);
                        message.error(
                          error?.message ||
                            intl.formatMessage({
                              id: 'account.paymentOrders.error',
                            }),
                        );
                      } finally {
                        setDetailLoading(false);
                      }
                    }}
                  >
                    {intl.formatMessage({ id: 'common.view' })}
                  </Button>
                ),
              },
            ]}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        )}
      </Space>

      <Modal
        open={detailOpen}
        footer={null}
        onCancel={() => setDetailOpen(false)}
        title={intl.formatMessage({ id: 'live.orders.detail.title' })}
      >
        {detailLoading ? (
          <Spin />
        ) : detail ? (
          <PaymentOrderDetailCard
            order={{
              ...detail,
              created_at: formatDateTime(detail.created_at),
              paid_at: formatDateTime(detail.paid_at),
              expires_at: formatDateTime(detail.expires_at),
            }}
          />
        ) : (
          <Empty />
        )}
      </Modal>
    </PageContainer>
  );
}
