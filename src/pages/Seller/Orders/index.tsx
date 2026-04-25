import {
  listSellerProductOrders,
  shipSellerProductOrder,
} from '@/services/productOrders';
import type { ProductOrder } from '@/types/productOrder';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const SHIPPING_ALLOWED_STATUSES = new Set(['paid']);

const readBuyerSummary = (row: ProductOrder) =>
  row.buyer_display_name ||
  row.buyer_name ||
  row.buyer_username ||
  row.buyer_email ||
  '-';

export default function SellerOrdersPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [items, setItems] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  const loadOrders = () => {
    setLoading(true);
    setErrorMessage('');
    listSellerProductOrders({
      status: statusFilter || undefined,
      search: search || undefined,
    })
      .then((data) => {
        setItems(data as ProductOrder[]);
      })
      .catch((error: any) => {
        setErrorMessage(
          error?.message || intl.formatMessage({ id: 'seller.orders.error.load' }),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(`/login?redirect=${encodeURIComponent('/seller/orders')}`);
      return;
    }
    if (!isLoggedIn) return;
    loadOrders();
  }, [initialState?.authLoading, isLoggedIn, statusFilter]);

  const onShip = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await shipSellerProductOrder(values.order_no, {
        carrier: values.carrier,
        tracking_number: values.tracking_number,
        tracking_url: values.tracking_url,
        shipped_note: values.shipped_note,
      });
      message.success(intl.formatMessage({ id: 'seller.orders.shipSuccess' }));
      form.resetFields();
      loadOrders();
    } catch (error: any) {
      message.error(
        error?.message || intl.formatMessage({ id: 'seller.orders.shipError' }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const paidOrders = useMemo(
    () =>
      items.filter((entry) =>
        SHIPPING_ALLOWED_STATUSES.has(String(entry.status || '').toLowerCase()),
      ),
    [items],
  );

  return (
    <PageContainer title={false}>
      <Card variant="borderless" style={{ borderRadius: 20, marginBottom: 12 }}>
        <h3 style={{ marginBottom: 6 }}>
          {intl.formatMessage({ id: 'seller.orders.title' })}
        </h3>
        <span style={{ color: '#8c8c8c' }}>
          {intl.formatMessage({ id: 'seller.orders.subtitle' })}
        </span>
      </Card>

      <Card variant="borderless" style={{ borderRadius: 20, marginBottom: 12 }}>
        <Space wrap>
          <span>{intl.formatMessage({ id: 'seller.orders.filter.status' })}</span>
          <Select
            allowClear
            style={{ width: 220 }}
            value={statusFilter || undefined}
            onChange={(value) => setStatusFilter(value || '')}
            options={[
              {
                label: intl.formatMessage({
                  id: 'seller.orders.status.pending_payment',
                }),
                value: 'pending_payment',
              },
              {
                label: intl.formatMessage({ id: 'seller.orders.status.paid' }),
                value: 'paid',
              },
              {
                label: intl.formatMessage({ id: 'seller.orders.status.shipping' }),
                value: 'shipping',
              },
              {
                label: intl.formatMessage({ id: 'seller.orders.status.completed' }),
                value: 'completed',
              },
              {
                label: intl.formatMessage({ id: 'seller.orders.status.settled' }),
                value: 'settled',
              },
              {
                label: intl.formatMessage({ id: 'seller.orders.status.cancelled' }),
                value: 'cancelled',
              },
            ]}
            placeholder={intl.formatMessage({
              id: 'seller.orders.filter.statusPlaceholder',
            })}
          />
          <Input
            style={{ width: 260 }}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={intl.formatMessage({ id: 'seller.orders.filter.search' })}
            onPressEnter={loadOrders}
          />
          <Button onClick={loadOrders}>
            {intl.formatMessage({ id: 'common.refresh' })}
          </Button>
        </Space>
      </Card>

      {errorMessage ? (
        <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 12 }} />
      ) : null}

      <Card variant="borderless" style={{ borderRadius: 20, marginBottom: 12 }}>
        <Table
          loading={loading}
          rowKey="order_no"
          dataSource={items}
          onRow={(row) => ({
            style: { cursor: 'pointer' },
            onClick: () => history.push(`/seller/orders/${row.order_no}`),
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
              title: intl.formatMessage({ id: 'seller.orders.buyerSummary' }),
              render: (_, row) => readBuyerSummary(row),
            },
            {
              title: intl.formatMessage({ id: 'seller.orders.quantity' }),
              dataIndex: 'quantity',
            },
            {
              title: intl.formatMessage({ id: 'account.productOrders.amount' }),
              render: (_, row) =>
                `${row.total_amount} ${
                  row.currency ||
                  intl.formatMessage({ id: 'account.productOrders.currency.thbLtt' })
                }`,
            },
            {
              title: intl.formatMessage({ id: 'account.productOrders.status' }),
              render: (_, row) => <Tag>{String(row.status || '-').toUpperCase()}</Tag>,
            },
            {
              title: intl.formatMessage({
                id: 'account.productOrders.paymentStatus',
              }),
              render: (_, row) => (
                <Tag>{String(row.payment_status || '-').toUpperCase()}</Tag>
              ),
            },
            {
              title: intl.formatMessage({ id: 'account.productOrders.createdAt' }),
              dataIndex: 'created_at',
            },
          ]}
          pagination={false}
        />
      </Card>

      <Card
        variant="borderless"
        style={{ borderRadius: 20 }}
        title={intl.formatMessage({ id: 'seller.orders.shipOrder' })}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            name="order_no"
            label={intl.formatMessage({ id: 'account.productOrders.orderNo' })}
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              options={paidOrders.map((entry) => ({
                label: `${entry.order_no} · ${entry.product_title_snapshot || '-'}`,
                value: entry.order_no,
              }))}
              placeholder={intl.formatMessage({
                id: 'seller.orders.paidOrderPlaceholder',
              })}
            />
          </Form.Item>
          <Form.Item
            name="carrier"
            label={intl.formatMessage({
              id: 'account.productOrders.shipment.carrier',
            })}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="tracking_number"
            label={intl.formatMessage({ id: 'account.productOrders.trackingNumber' })}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="tracking_url"
            label={intl.formatMessage({
              id: 'account.productOrders.shipment.trackingUrl',
            })}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="shipped_note"
            label={intl.formatMessage({ id: 'account.productOrders.shipment.note' })}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space>
            <Button type="primary" onClick={onShip} loading={submitting}>
              {intl.formatMessage({ id: 'seller.orders.markShipped' })}
            </Button>
          </Space>
        </Form>
      </Card>
    </PageContainer>
  );
}
