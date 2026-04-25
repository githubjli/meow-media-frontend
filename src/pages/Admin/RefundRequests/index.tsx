import {
  approveRefundRequest,
  listAdminRefundRequests,
  markRefundRequestRefunded,
  rejectRefundRequest,
} from '@/services/refundRequests';
import type { RefundRequest } from '@/types/refundRequest';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import { Button, Card, Input, Space, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';

export default function AdminRefundRequestsPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [items, setItems] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [txid, setTxid] = useState<Record<string, string>>({});
  const isAdmin = Boolean(
    initialState?.currentUser &&
      (initialState.currentUser.is_admin ||
        initialState.currentUser.is_staff ||
        initialState.currentUser.is_superuser ||
        initialState.currentUser.role === 'admin'),
  );

  const load = () => {
    setLoading(true);
    listAdminRefundRequests().then(setItems).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) {
      history.replace('/home');
      return;
    }
    load();
  }, [isAdmin]);

  return (
    <PageContainer title={false}>
      <Card variant="borderless" style={{ borderRadius: 20 }}>
        <h3>{intl.formatMessage({ id: 'admin.refundRequests.title' })}</h3>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={items}
          columns={[
            { title: intl.formatMessage({ id: 'account.productOrders.orderNo' }), dataIndex: 'order_no' },
            { title: intl.formatMessage({ id: 'refundRequests.reason' }), dataIndex: 'reason' },
            { title: intl.formatMessage({ id: 'refundRequests.amount' }), dataIndex: 'requested_amount' },
            { title: intl.formatMessage({ id: 'refundRequests.status' }), render: (_, row) => <Tag>{String(row.status || '-').toUpperCase()}</Tag> },
            {
              title: intl.formatMessage({ id: 'common.actions' }),
              render: (_, row) => (
                <Space>
                  <Button size="small" onClick={async () => { await approveRefundRequest(row.id); load(); }}>{intl.formatMessage({ id: 'refundRequests.approve' })}</Button>
                  <Button size="small" danger onClick={async () => { await rejectRefundRequest(row.id); load(); }}>{intl.formatMessage({ id: 'refundRequests.reject' })}</Button>
                  <Input size="small" style={{ width: 140 }} value={txid[String(row.id)] || ''} onChange={(e) => setTxid((prev) => ({ ...prev, [String(row.id)]: e.target.value }))} placeholder={intl.formatMessage({ id: 'refundRequests.refundTxid' })} />
                  <Button size="small" type="primary" onClick={async () => { await markRefundRequestRefunded(row.id, { refund_txid: txid[String(row.id)] || undefined }); load(); }}>{intl.formatMessage({ id: 'refundRequests.markRefunded' })}</Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </PageContainer>
  );
}
