import QrCodePanel from '@/components/QrCodePanel';
import {
  confirmProductOrderReceived,
  getProductOrderDetail,
} from '@/services/productOrders';
import type { ProductOrder } from '@/types/productOrder';
import { CheckCircleOutlined, CopyOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Spin,
  Timeline,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Text } = Typography;

export default function AccountProductOrderDetailPage() {
  const intl = useIntl();
  const params = useParams<{ order_no: string }>();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [item, setItem] = useState<ProductOrder | null>(null);
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  const loadDetail = () => {
    if (!params.order_no) return;
    setLoading(true);
    setErrorMessage('');
    getProductOrderDetail(params.order_no)
      .then((data) => setItem(data))
      .catch((error: any) => {
        setErrorMessage(
          error?.message || intl.formatMessage({ id: 'account.productOrders.error.detail' }),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(
        `/login?redirect=${encodeURIComponent(`/account/product-orders/${params.order_no || ''}`)}`,
      );
      return;
    }
    if (!isLoggedIn) return;
    loadDetail();
  }, [initialState?.authLoading, isLoggedIn, params.order_no]);

  const timelineItems = useMemo(
    () => [
      { key: 'created', value: item?.created_at },
      { key: 'paid', value: item?.paid_at },
      { key: 'shipped', value: item?.shipped_at },
      { key: 'completed', value: item?.completed_at },
      { key: 'settled', value: item?.settled_at },
    ],
    [item],
  );

  const copyValue = async (value?: string | number) => {
    if (!value) return;
    await navigator.clipboard.writeText(String(value));
    message.success(intl.formatMessage({ id: 'common.copied' }));
  };

  const onConfirmReceived = async () => {
    if (!item?.order_no) return;
    setActionLoading(true);
    try {
      await confirmProductOrderReceived(item.order_no);
      message.success(intl.formatMessage({ id: 'account.productOrders.confirmReceivedSuccess' }));
      loadDetail();
    } catch (error: any) {
      message.error(
        error?.message || intl.formatMessage({ id: 'account.productOrders.error.confirmReceived' }),
      );
    } finally {
      setActionLoading(false);
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
          <Empty description={intl.formatMessage({ id: 'account.productOrders.empty' })} />
        </Card>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Descriptions column={1} title={intl.formatMessage({ id: 'account.productOrders.detailTitle' })}>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.orderNo' })}>
                <Space>
                  <Text>{item.order_no}</Text>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => copyValue(item.order_no)} />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.product' })}>
                {item.product_title_snapshot}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.amount' })}>
                {item.total_amount} {item.currency || intl.formatMessage({ id: 'account.productOrders.currency.thbLtt' })}
              </Descriptions.Item>
              <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.status' })}>
                {String(item.status || '-').toUpperCase()}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card variant="borderless" style={{ borderRadius: 20 }} title={intl.formatMessage({ id: 'account.productOrders.timeline' })}>
            <Timeline
              items={timelineItems.map((entry) => ({
                color: entry.value ? 'green' : 'gray',
                children: `${intl.formatMessage({ id: `account.productOrders.timeline.${entry.key}` })}: ${entry.value || '-'}`,
              }))}
            />
          </Card>

          {String(item.status) === 'pending_payment' ? (
            <Card variant="borderless" style={{ borderRadius: 20 }} title={intl.formatMessage({ id: 'account.productOrders.paymentQr' })}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <QrCodePanel
                  payload={item.qr_payload || item.qr_text}
                  emptyText={intl.formatMessage({ id: 'account.productOrders.paymentQr.empty' })}
                />
                <Descriptions column={1}>
                  <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.payToAddress' })}>
                    <Space>
                      <Text>{item.pay_to_address || '-'}</Text>
                      <Button size="small" icon={<CopyOutlined />} onClick={() => copyValue(item.pay_to_address)} />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.expectedAmount' })}>
                    <Space>
                      <Text>{item.expected_amount}</Text>
                      <Button size="small" icon={<CopyOutlined />} onClick={() => copyValue(item.expected_amount)} />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.currency' })}>
                    {item.currency || intl.formatMessage({ id: 'account.productOrders.currency.thbLtt' })}
                  </Descriptions.Item>
                  <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.expiresAt' })}>
                    {item.expires_at || '-'}
                  </Descriptions.Item>
                </Descriptions>
                <Alert
                  type="warning"
                  showIcon
                  message={intl.formatMessage({ id: 'account.productOrders.paymentReminder' })}
                />
              </Space>
            </Card>
          ) : null}

          {String(item.status) === 'shipping' ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading} onClick={onConfirmReceived}>
                {intl.formatMessage({ id: 'account.productOrders.confirmReceived' })}
              </Button>
            </Card>
          ) : null}

          {item.shipment ? (
            <Card variant="borderless" style={{ borderRadius: 20 }} title={intl.formatMessage({ id: 'account.productOrders.shipment' })}>
              <Descriptions column={1}>
                <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.shipment.carrier' })}>
                  {item.shipment.carrier || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.trackingNumber' })}>
                  {item.shipment.tracking_number || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.shipment.trackingUrl' })}>
                  {item.shipment.tracking_url || '-'}
                </Descriptions.Item>
                <Descriptions.Item label={intl.formatMessage({ id: 'account.productOrders.shipment.note' })}>
                  {item.shipment.shipped_note || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ) : null}
        </Space>
      )}
    </PageContainer>
  );
}
