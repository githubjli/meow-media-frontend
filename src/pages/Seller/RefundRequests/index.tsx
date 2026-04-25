import { listSellerRefundRequests } from '@/services/refundRequests';
import type { RefundRequest } from '@/types/refundRequest';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import { Card, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';

export default function SellerRefundRequestsPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [items, setItems] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(`/login?redirect=${encodeURIComponent('/seller/refund-requests')}`);
      return;
    }
    if (!isLoggedIn) return;
    setLoading(true);
    listSellerRefundRequests().then(setItems).finally(() => setLoading(false));
  }, [initialState?.authLoading, isLoggedIn]);

  return (
    <PageContainer title={false}>
      <Card variant="borderless" style={{ borderRadius: 20 }}>
        <h3>{intl.formatMessage({ id: 'refundRequests.title' })}</h3>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={items}
          columns={[
            { title: intl.formatMessage({ id: 'account.productOrders.orderNo' }), dataIndex: 'order_no' },
            { title: intl.formatMessage({ id: 'seller.orders.buyerSummary' }), dataIndex: 'buyer_summary' },
            { title: intl.formatMessage({ id: 'refundRequests.reason' }), dataIndex: 'reason' },
            { title: intl.formatMessage({ id: 'refundRequests.amount' }), dataIndex: 'requested_amount' },
            { title: intl.formatMessage({ id: 'refundRequests.status' }), render: (_, row) => <Tag>{String(row.status || '-').toUpperCase()}</Tag> },
            { title: intl.formatMessage({ id: 'account.productOrders.createdAt' }), dataIndex: 'created_at' },
          ]}
        />
      </Card>
    </PageContainer>
  );
}
