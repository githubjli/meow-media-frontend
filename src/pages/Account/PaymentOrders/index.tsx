import PageIntroCard from '@/components/PageIntroCard';
import PaymentOrderDetailCard from '@/components/live-room/PaymentOrderDetailCard';
import {
  getLivePaymentOrderDetail,
  getMyPaymentOrders,
} from '@/services/livePaymentOrders';
import type { PaymentOrder, PaymentOrderSummary } from '@/types/paymentOrder';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Alert, Button, Empty, Modal, Space, Spin, Table } from 'antd';
import { useEffect, useState } from 'react';

export default function AccountPaymentOrdersPage() {
  const intl = useIntl();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PaymentOrderSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<PaymentOrder | null>(null);

  useEffect(() => {
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
  }, [intl]);

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
          <Spin />
        ) : items.length === 0 ? (
          <Empty
            description={intl.formatMessage({
              id: 'account.paymentOrders.empty',
            })}
          />
        ) : (
          <Table
            rowKey="id"
            pagination={false}
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
                render: (_, row) => `${row.amount} ${row.currency}`,
              },
              {
                title: intl.formatMessage({ id: 'live.orders.status' }),
                dataIndex: 'status',
              },
              {
                title: intl.formatMessage({ id: 'live.orders.createdAt' }),
                dataIndex: 'created_at',
              },
              {
                title: intl.formatMessage({ id: 'common.actions' }),
                render: (_, row) => (
                  <Button
                    size="small"
                    onClick={async () => {
                      if (!row.live?.id) return;
                      setDetailOpen(true);
                      setDetailLoading(true);
                      try {
                        const detailItem = await getLivePaymentOrderDetail(
                          row.live.id,
                          row.id,
                        );
                        setDetail(detailItem);
                      } catch (error) {
                        setDetail(null);
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
