import { listMyProductOrders } from '@/services/productOrders';
import type { ProductOrder } from '@/types/productOrder';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import { Alert, Card, Empty, Space, Spin, Table, Tag } from 'antd';
import { useEffect, useState } from 'react';

export default function AccountProductOrdersPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState<ProductOrder[]>([]);
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(`/login?redirect=${encodeURIComponent('/account/product-orders')}`);
      return;
    }
    if (!isLoggedIn) return;

    setLoading(true);
    listMyProductOrders()
      .then((data) => setItems(data))
      .catch((error: any) => {
        setErrorMessage(
          error?.message || intl.formatMessage({ id: 'account.productOrders.error.load' }),
        );
      })
      .finally(() => setLoading(false));
  }, [initialState?.authLoading, isLoggedIn]);

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  return (
    <PageContainer title={false}>
      <Card variant="borderless" style={{ borderRadius: 20, marginBottom: 12 }}>
        <Space direction="vertical" size={4}>
          <h3 style={{ margin: 0 }}>{intl.formatMessage({ id: 'account.productOrders.title' })}</h3>
          <span style={{ color: '#8c8c8c' }}>
            {intl.formatMessage({ id: 'account.productOrders.subtitle' })}
          </span>
        </Space>
      </Card>

      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

      {loading ? (
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Spin />
        </Card>
      ) : items.length === 0 ? (
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Empty description={intl.formatMessage({ id: 'account.productOrders.empty' })} />
        </Card>
      ) : (
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Table
            rowKey="order_no"
            dataSource={items}
            onRow={(row) => ({
              onClick: () => history.push(`/account/product-orders/${row.order_no}`),
              style: { cursor: 'pointer' },
            })}
            columns={[
              {
                title: intl.formatMessage({ id: 'account.productOrders.orderNo' }),
                dataIndex: 'order_no',
              },
              {
                title: intl.formatMessage({ id: 'account.productOrders.product' }),
                dataIndex: 'product_title_snapshot',
              },
              {
                title: intl.formatMessage({ id: 'account.productOrders.amount' }),
                render: (_, row) => `${row.total_amount} ${row.currency || intl.formatMessage({ id: 'account.productOrders.currency.thbLtt' })}`,
              },
              {
                title: intl.formatMessage({ id: 'account.productOrders.status' }),
                render: (_, row) => <Tag>{String(row.status || '-').toUpperCase()}</Tag>,
              },
              {
                title: intl.formatMessage({ id: 'account.productOrders.createdAt' }),
                render: (_, row) => formatDate(row.created_at),
              },
            ]}
          />
        </Card>
      )}
    </PageContainer>
  );
}
