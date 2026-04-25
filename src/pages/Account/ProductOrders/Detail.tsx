import QrCodePanel from '@/components/QrCodePanel';
import {
  confirmProductOrderReceived,
  getProductOrderDetail,
  submitProductOrderTxHint,
} from '@/services/productOrders';
import type { ProductOrder } from '@/types/productOrder';
import {
  CheckCircleOutlined,
  CopyOutlined,
  SendOutlined,
} from '@ant-design/icons';
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
  const [hintLoading, setHintLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [item, setItem] = useState<ProductOrder | null>(null);
  const [hintForm] = Form.useForm<{ txid: string }>();
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  const loadDetail = () => {
    if (!params.order_no) return;
    setLoading(true);
    setErrorMessage('');
    getProductOrderDetail(params.order_no)
      .then((data) => setItem(data))
      .catch((error: any) => {
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'account.productOrders.error.detail' }),
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
      { key: 'cancelled', value: item?.cancelled_at },
    ],
    [item],
  );

  const copyValue = async (value?: string | number | null) => {
    if (!value) return;
    await navigator.clipboard.writeText(String(value));
    message.success(intl.formatMessage({ id: 'common.copied' }));
  };

  const onConfirmReceived = async () => {
    if (!item?.order_no) return;
    setActionLoading(true);
    try {
      await confirmProductOrderReceived(item.order_no);
      message.success(
        intl.formatMessage({ id: 'account.productOrders.confirmReceivedSuccess' }),
      );
      loadDetail();
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({
            id: 'account.productOrders.error.confirmReceived',
          }),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const onSubmitTxHint = async () => {
    if (!item?.order_no) return;
    const values = await hintForm.validateFields();
    setHintLoading(true);
    try {
      await submitProductOrderTxHint(item.order_no, { txid: values.txid });
      message.success(
        intl.formatMessage({ id: 'account.productOrders.txHint.submitSuccess' }),
      );
      hintForm.resetFields();
      loadDetail();
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'account.productOrders.txHint.submitError' }),
      );
    } finally {
      setHintLoading(false);
    }
  };

  const normalizedStatus = String(item?.status || '').toLowerCase();
  const normalizedPaymentStatus = String(item?.payment_status || '').toLowerCase();
  const isPaymentTimeoutCancelled =
    normalizedStatus === 'cancelled' && item?.cancel_reason === 'payment_timeout';

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
          <Empty
            description={intl.formatMessage({ id: 'account.productOrders.empty' })}
          />
        </Card>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Descriptions
              column={1}
              title={intl.formatMessage({ id: 'account.productOrders.detailTitle' })}
            >
              <Descriptions.Item
                label={intl.formatMessage({ id: 'account.productOrders.orderNo' })}
              >
                <Space>
                  <Text>{item.order_no}</Text>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyValue(item.order_no)}
                  />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'account.productOrders.product' })}
              >
                {item.product_title_snapshot}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'account.productOrders.amount' })}
              >
                {item.total_amount}{' '}
                {item.currency ||
                  intl.formatMessage({ id: 'account.productOrders.currency.thbLtt' })}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'account.productOrders.status' })}
              >
                <Tag>{String(item.status || '-').toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'account.productOrders.paymentStatus' })}
              >
                <Tag>{String(item.payment_status || '-').toUpperCase()}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {normalizedPaymentStatus === 'underpaid' ? (
            <Alert
              showIcon
              type="warning"
              message={intl.formatMessage({ id: 'account.productOrders.payment.underpaid' })}
              description={intl.formatMessage({
                id: 'account.productOrders.payment.underpaidAdvice',
              })}
            />
          ) : null}

          {normalizedPaymentStatus === 'overpaid' ? (
            <Alert
              showIcon
              type="success"
              message={intl.formatMessage({ id: 'account.productOrders.payment.overpaid' })}
            />
          ) : null}

          {normalizedPaymentStatus === 'paid' ? (
            <Alert
              showIcon
              type="success"
              message={intl.formatMessage({ id: 'account.productOrders.payment.paid' })}
              description={`${intl.formatMessage({ id: 'account.productOrders.txid' })}: ${item.txid || '-'} · ${intl.formatMessage({ id: 'account.productOrders.confirmations' })}: ${item.confirmations ?? '-'}`}
            />
          ) : null}

          {isPaymentTimeoutCancelled ? (
            <Alert
              showIcon
              type="error"
              message={intl.formatMessage({ id: 'account.productOrders.paymentTimeout' })}
              description={intl.formatMessage({
                id: 'account.productOrders.createNewOrderGuidance',
              })}
              action={
                <Button onClick={() => history.push('/browse')}>
                  {intl.formatMessage({ id: 'account.productOrders.createNewOrder' })}
                </Button>
              }
            />
          ) : null}

          <Card
            variant="borderless"
            style={{ borderRadius: 20 }}
            title={intl.formatMessage({ id: 'account.productOrders.timeline' })}
          >
            <Timeline
              items={timelineItems.map((entry) => ({
                color: entry.value ? 'green' : 'gray',
                children: `${intl.formatMessage({ id: `account.productOrders.timeline.${entry.key}` })}: ${entry.value || '-'}`,
              }))}
            />
          </Card>

          {normalizedStatus === 'pending_payment' && !isPaymentTimeoutCancelled ? (
            <Card
              variant="borderless"
              style={{ borderRadius: 20 }}
              title={intl.formatMessage({ id: 'account.productOrders.paymentQr' })}
            >
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <QrCodePanel
                  payload={item.qr_payload || item.qr_text || item.payment_uri}
                  emptyText={intl.formatMessage({
                    id: 'account.productOrders.paymentQr.empty',
                  })}
                />
                <Descriptions column={1}>
                  <Descriptions.Item
                    label={intl.formatMessage({ id: 'account.productOrders.payToAddress' })}
                  >
                    <Space>
                      <Text>{item.pay_to_address || '-'}</Text>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyValue(item.pay_to_address)}
                      />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({ id: 'account.productOrders.expectedAmount' })}
                  >
                    <Space>
                      <Text>{item.expected_amount}</Text>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyValue(item.expected_amount)}
                      />
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({ id: 'account.productOrders.currency' })}
                  >
                    {item.currency ||
                      intl.formatMessage({ id: 'account.productOrders.currency.thbLtt' })}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({ id: 'account.productOrders.expiresAt' })}
                  >
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

          {normalizedStatus === 'pending_payment' && !isPaymentTimeoutCancelled ? (
            <Card
              variant="borderless"
              style={{ borderRadius: 20 }}
              title={intl.formatMessage({ id: 'account.productOrders.txHint.title' })}
            >
              <Form form={hintForm} layout="vertical">
                <Form.Item
                  name="txid"
                  label={intl.formatMessage({ id: 'account.productOrders.txidHint' })}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={onSubmitTxHint}
                  loading={hintLoading}
                >
                  {intl.formatMessage({ id: 'account.productOrders.submitTxid' })}
                </Button>
              </Form>
              <Descriptions column={1} style={{ marginTop: 12 }}>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.paymentVerification',
                  })}
                >
                  {String(item.product_order_status || item.status || '-').toUpperCase()}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'account.productOrders.matched' })}
                >
                  {normalizedPaymentStatus === 'paid'
                    ? intl.formatMessage({ id: 'common.yes' })
                    : intl.formatMessage({ id: 'common.no' })}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'account.productOrders.txid' })}
                >
                  {item.txid || '-'}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.confirmations',
                  })}
                >
                  {item.confirmations ?? '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ) : null}

          {normalizedStatus === 'shipping' ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={actionLoading}
                onClick={onConfirmReceived}
              >
                {intl.formatMessage({ id: 'account.productOrders.confirmReceived' })}
              </Button>
            </Card>
          ) : null}

          {item.shipment ? (
            <Card
              variant="borderless"
              style={{ borderRadius: 20 }}
              title={intl.formatMessage({ id: 'account.productOrders.shipment' })}
            >
              <Descriptions column={1}>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.shipment.carrier',
                  })}
                >
                  {item.shipment.carrier || '-'}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.trackingNumber',
                  })}
                >
                  {item.shipment.tracking_number || '-'}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.shipment.trackingUrl',
                  })}
                >
                  {item.shipment.tracking_url || '-'}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'account.productOrders.shipment.note' })}
                >
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
