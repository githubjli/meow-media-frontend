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

  const formatDateTime = (value?: string) => {
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

  const formatAmount = (row: PaymentOrderSummary) => {
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

  const resolveStatusColor = (status?: string) => {
    const normalized = String(status || '').toLowerCase();
    if (['paid', 'success', 'completed'].includes(normalized)) return 'green';
    if (['pending', 'created', 'unpaid'].includes(normalized)) return 'gold';
    if (['failed', 'cancelled', 'canceled'].includes(normalized)) return 'red';
    return 'default';
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
                dataIndex: 'id',
              },
              {
                title: intl.formatMessage({ id: 'live.orders.orderType' }),
                dataIndex: 'order_type',
              },
              {
                title: intl.formatMessage({ id: 'live.orders.amount' }),
                render: (_, row) => formatAmount(row),
              },
              {
                title: intl.formatMessage({ id: 'live.orders.status' }),
                render: (_, row) => (
                  <Tag color={resolveStatusColor(row.status)}>
                    {String(row.status || '-').toUpperCase()}
                  </Tag>
                ),
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
                      if (!row.live?.id) {
                        message.warning(
                          intl.formatMessage({
                            id: 'account.paymentOrders.error',
                          }),
                        );
                        return;
                      }
                      setDetailOpen(true);
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
          <PaymentOrderDetailCard order={detail} />
        ) : (
          <Empty />
        )}
      </Modal>
    </PageContainer>
  );
}
