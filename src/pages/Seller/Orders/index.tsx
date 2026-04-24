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
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

export default function SellerOrdersPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [items, setItems] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [missingListEndpoint, setMissingListEndpoint] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(`/login?redirect=${encodeURIComponent('/seller/orders')}`);
      return;
    }
    if (!isLoggedIn) return;

    setLoading(true);
    listSellerProductOrders()
      .then((data) => {
        setItems(data as ProductOrder[]);
      })
      .catch(() => setMissingListEndpoint(true))
      .finally(() => setLoading(false));
  }, [initialState?.authLoading, isLoggedIn]);

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
    } catch (error: any) {
      message.error(
        error?.message || intl.formatMessage({ id: 'seller.orders.shipError' }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title={false}>
      <Card variant="borderless" style={{ borderRadius: 20, marginBottom: 12 }}>
        <h3 style={{ marginBottom: 6 }}>{intl.formatMessage({ id: 'seller.orders.title' })}</h3>
        <span style={{ color: '#8c8c8c' }}>{intl.formatMessage({ id: 'seller.orders.subtitle' })}</span>
      </Card>

      {missingListEndpoint ? (
        <Alert
          type="info"
          showIcon
          message={intl.formatMessage({ id: 'seller.orders.missingListEndpoint' })}
          style={{ marginBottom: 12 }}
        />
      ) : (
        <Card variant="borderless" style={{ borderRadius: 20, marginBottom: 12 }}>
          <Table
            loading={loading}
            rowKey="order_no"
            dataSource={items}
            columns={[
              { title: intl.formatMessage({ id: 'account.productOrders.orderNo' }), dataIndex: 'order_no' },
              { title: intl.formatMessage({ id: 'account.productOrders.product' }), dataIndex: 'product_title_snapshot' },
              {
                title: intl.formatMessage({ id: 'account.productOrders.amount' }),
                render: (_, row) => `${row.total_amount} ${row.currency || intl.formatMessage({ id: 'account.productOrders.currency.thbLtt' })}`,
              },
              {
                title: intl.formatMessage({ id: 'account.productOrders.status' }),
                render: (_, row) => <Tag>{String(row.status || '-').toUpperCase()}</Tag>,
              },
            ]}
            pagination={false}
          />
        </Card>
      )}

      <Card variant="borderless" style={{ borderRadius: 20 }} title={intl.formatMessage({ id: 'seller.orders.markShipped' })}>
        <Form layout="vertical" form={form}>
          <Form.Item name="order_no" label={intl.formatMessage({ id: 'account.productOrders.orderNo' })} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="carrier" label={intl.formatMessage({ id: 'account.productOrders.shipment.carrier' })} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="tracking_number" label={intl.formatMessage({ id: 'account.productOrders.trackingNumber' })} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="tracking_url" label={intl.formatMessage({ id: 'account.productOrders.shipment.trackingUrl' })}>
            <Input />
          </Form.Item>
          <Form.Item name="shipped_note" label={intl.formatMessage({ id: 'account.productOrders.shipment.note' })}>
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
