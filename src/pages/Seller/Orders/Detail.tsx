import {
  getSellerProductOrderDetail,
  shipSellerProductOrder,
} from '@/services/productOrders';
import type { ProductOrder } from '@/types/productOrder';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Text } = Typography;

const readFirst = (obj: any, keys: string[]) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== '') {
      return obj[key];
    }
  }
  return '';
};

export default function SellerOrderDetailPage() {
  const intl = useIntl();
  const params = useParams<{ order_no: string }>();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [item, setItem] = useState<ProductOrder | null>(null);
  const [form] = Form.useForm();
  const [shippingLoading, setShippingLoading] = useState(false);
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  const loadDetail = () => {
    if (!params.order_no) return;
    setLoading(true);
    setErrorMessage('');
    getSellerProductOrderDetail(params.order_no)
      .then((data) => setItem(data))
      .catch((error: any) => {
        setErrorMessage(
          error?.message || intl.formatMessage({ id: 'seller.orders.error.detail' }),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(
        `/login?redirect=${encodeURIComponent(`/seller/orders/${params.order_no || ''}`)}`,
      );
      return;
    }
    if (!isLoggedIn) return;
    loadDetail();
  }, [initialState?.authLoading, isLoggedIn, params.order_no]);

  const buyerSummary = useMemo(
    () => ({
      name: readFirst(item, ['buyer_name', 'buyer_display_name', 'buyer_username']),
      email: readFirst(item, ['buyer_email']),
      phone: readFirst(item, ['buyer_phone']),
    }),
    [item],
  );

  const shippingAddressSummary = useMemo(
    () => ({
      receiver_name: readFirst(item, [
        'shipping_receiver_name',
        'receiver_name_snapshot',
      ]),
      phone: readFirst(item, ['shipping_phone', 'phone_snapshot']),
      address: readFirst(item, ['shipping_address_snapshot', 'shipping_address_text']),
    }),
    [item],
  );

  const payoutSummary = useMemo(
    () => item?.payout || null,
    [item],
  );

  const canShip = String(item?.status || '').toLowerCase() === 'paid';

  const onShip = async () => {
    if (!item?.order_no) return;
    const values = await form.validateFields();
    setShippingLoading(true);
    try {
      await shipSellerProductOrder(item.order_no, {
        carrier: values.carrier,
        tracking_number: values.tracking_number,
        tracking_url: values.tracking_url,
        shipped_note: values.shipped_note,
      });
      message.success(intl.formatMessage({ id: 'seller.orders.shipSuccess' }));
      form.resetFields();
      loadDetail();
    } catch (error: any) {
      message.error(
        error?.message || intl.formatMessage({ id: 'seller.orders.shipError' }),
      );
    } finally {
      setShippingLoading(false);
    }
  };

  return (
    <PageContainer title={false}>
      {loading ? (
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Spin />
        </Card>
      ) : errorMessage ? (
        <Alert type="error" showIcon message={errorMessage} />
      ) : !item ? (
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Empty description={intl.formatMessage({ id: 'seller.orders.empty' })} />
        </Card>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Descriptions column={1} title={intl.formatMessage({ id: 'seller.orders.detailTitle' })}>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.orderNo' })}>
                {item.order_no}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.product' })}>
                {item.product_title_snapshot || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.status' })}>
                <Tag>{String(item.status || '-').toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'seller.orders.quantity' })}>
                {item.quantity ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.amount' })}>
                {item.total_amount} {item.currency || intl.formatMessage({ id: 'account.productOrders.currency.thbLtt' })}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.expectedAmount' })}>
                {item.expected_amount}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.payToAddress' })}>
                <Text copyable>{item.pay_to_address || '-'}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>



          {String(item.status || '').toLowerCase() === 'cancelled' &&
          String(item.cancel_reason || '').toLowerCase() === 'payment_timeout' ? (
            <Alert
              showIcon
              type="warning"
              message={intl.formatMessage({ id: 'account.productOrders.paymentTimeout' })}
            />
          ) : null}

          <Card variant="borderless" style={{ borderRadius: 20 }} title={intl.formatMessage({ id: 'seller.orders.paymentSummary' })}>
            <Descriptions column={1}>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.paymentStatus' })}>{String(item.payment_status || '-').toUpperCase()}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.txid' })}>{item.txid || '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.confirmations' })}>{item.confirmations ?? '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.expectedAmount' })}>{item.expected_amount ?? '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.actualAmount' })}>{item.actual_amount ?? '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card variant="borderless" style={{ borderRadius: 20 }} title={intl.formatMessage({ id: 'seller.orders.buyerSummary' })}>
            <Descriptions column={1}>
              <Descriptions.Item label={intl.formatMessage({ id: 'seller.orders.buyer.name' })}>{buyerSummary.name || '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'seller.orders.buyer.email' })}>{buyerSummary.email || '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'seller.orders.buyer.phone' })}>{buyerSummary.phone || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card variant="borderless" style={{ borderRadius: 20 }} title={intl.formatMessage({ id: 'seller.orders.shippingAddressSnapshot' })}>
            <Descriptions column={1}>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.shippingAddresses.receiver' })}>{shippingAddressSummary.receiver_name || '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.shippingAddresses.phone' })}>{shippingAddressSummary.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.shippingAddresses.address' })}>{shippingAddressSummary.address || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card variant="borderless" style={{ borderRadius: 20 }} title={intl.formatMessage({ id: 'seller.orders.shipmentSummary' })}>
            <Descriptions column={1}>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.shipment.carrier' })}>{item.shipment?.carrier || '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.trackingNumber' })}>{item.shipment?.tracking_number || '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.shipment.trackingUrl' })}>{item.shipment?.tracking_url || '-'}</Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.shipment.note' })}>{item.shipment?.shipped_note || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card variant="borderless" style={{ borderRadius: 20 }} title={intl.formatMessage({ id: 'seller.orders.payoutSummary' })}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(payoutSummary || {}, null, 2)}
            </pre>
          </Card>

          <Card variant="borderless" style={{ borderRadius: 20 }} title={intl.formatMessage({ id: 'seller.orders.markShipped' })}>
            {!canShip ? (
              <Alert showIcon type="info" message={intl.formatMessage({ id: 'seller.orders.shipOnlyWhenPaid' })} style={{ marginBottom: 12 }} />
            ) : null}
            <Form layout="vertical" form={form}>
              <Form.Item name="carrier" label={intl.formatMessage({ id: 'account.productOrders.shipment.carrier' })} rules={[{ required: true }]}> 
                <Input disabled={!canShip} />
              </Form.Item>
              <Form.Item name="tracking_number" label={intl.formatMessage({ id: 'account.productOrders.trackingNumber' })} rules={[{ required: true }]}> 
                <Input disabled={!canShip} />
              </Form.Item>
              <Form.Item name="tracking_url" label={intl.formatMessage({ id: 'account.productOrders.shipment.trackingUrl' })}> 
                <Input disabled={!canShip} />
              </Form.Item>
              <Form.Item name="shipped_note" label={intl.formatMessage({ id: 'account.productOrders.shipment.note' })}> 
                <Input.TextArea rows={3} disabled={!canShip} />
              </Form.Item>
              <Button type="primary" onClick={onShip} loading={shippingLoading} disabled={!canShip}>
                {intl.formatMessage({ id: 'seller.orders.markShipped' })}
              </Button>
            </Form>
          </Card>
        </Space>
      )}
    </PageContainer>
  );
}
