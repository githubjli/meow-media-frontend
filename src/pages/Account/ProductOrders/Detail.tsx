import {
  default as QrCodePanel,
  buildQrImageUrl,
  resolveQrPayload,
} from '@/components/QrCodePanel';
import {
  confirmProductOrderReceived,
  getProductOrderDetail,
  payProductOrderWithWallet,
  submitProductOrderTxHint,
} from '@/services/productOrders';
import {
  createBuyerProductRefundRequest,
  listBuyerProductRefundRequests,
} from '@/services/refundRequests';
import type { ProductOrder } from '@/types/productOrder';
import type { RefundRequest } from '@/types/refundRequest';
import { getPaymentOrderStatusLabel } from '@/utils/productOrderStatus';
import {
  CheckCircleOutlined,
  CopyOutlined,
  ReloadOutlined,
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
  Grid,
  Input,
  Modal,
  Space,
  Spin,
  Tag,
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
  const [walletPayForm] = Form.useForm<{ password: string }>();
  const [refundForm] = Form.useForm<{
    reason: string;
    requested_amount: string;
  }>();
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [showQrPayload, setShowQrPayload] = useState(false);
  const [walletPayLoading, setWalletPayLoading] = useState(false);
  const [submittedTxid, setSubmittedTxid] = useState<string>('');
  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const screens = Grid.useBreakpoint();
  const paymentQrPayload = useMemo(() => {
    if (!item) return '';
    const directPayload = item.qr_payload || item.qr_text || item.payment_uri;
    if (directPayload) return directPayload;
    return {
      version: item.version || '1',
      type: 'product_payment',
      pay_to_address: item.pay_to_address || '',
      expected_amount: item.expected_amount,
      order_no: item.order_no,
      expires_at: item.expires_at,
      currency: item.currency,
    };
  }, [item]);
  const paymentQrPayloadText = useMemo(() => {
    if (!paymentQrPayload) return '';
    if (typeof paymentQrPayload === 'string') return paymentQrPayload;
    try {
      return JSON.stringify(paymentQrPayload, null, 2);
    } catch (error) {
      return String(paymentQrPayload);
    }
  }, [paymentQrPayload]);
  const paymentQrSize = screens.md ? 240 : 200;
  const qrImageUrl = useMemo(() => {
    const value = resolveQrPayload(paymentQrPayload);
    if (!value) return '';
    return buildQrImageUrl(value, paymentQrSize);
  }, [paymentQrPayload, paymentQrSize]);

  const loadDetail = async () => {
    if (!params.order_no) return;
    setLoading(true);
    setErrorMessage('');
    return Promise.all([
      getProductOrderDetail(params.order_no),
      listBuyerProductRefundRequests(params.order_no).catch(() => []),
    ])
      .then(([order, refundList]) => {
        setItem(order);
        setRefunds(refundList);
      })
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
        `/login?redirect=${encodeURIComponent(
          `/account/product-orders/${params.order_no || ''}`,
        )}`,
      );
      return;
    }
    if (!isLoggedIn) return;
    loadDetail();
  }, [initialState?.authLoading, isLoggedIn, params.order_no]);

  const copyValue = async (value?: string | number | null) => {
    if (!value) return;
    await navigator.clipboard.writeText(String(value));
    message.success(intl.formatMessage({ id: 'common.copied' }));
  };

  const onSaveQrImage = async () => {
    if (!qrImageUrl) {
      message.error(
        intl.formatMessage({ id: 'account.productOrders.saveQrImageFailed' }),
      );
      return;
    }
    const fileName = `meow-payment-qr-${item?.order_no || 'order'}.png`;
    try {
      const response = await fetch(qrImageUrl);
      const sourceBlob = await response.blob();
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(sourceBlob);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('image_load_failed'));
        };
        img.src = objectUrl;
      });

      const quietZone = 32;
      const canvas = document.createElement('canvas');
      canvas.width = image.width + quietZone * 2;
      canvas.height = image.height + quietZone * 2;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('canvas_unavailable');
      }
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, quietZone, quietZone, image.width, image.height);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => {
          if (!value) {
            reject(new Error('to_blob_failed'));
            return;
          }
          resolve(value);
        }, 'image/png');
      });
      const file = new File([blob], fileName, { type: 'image/png' });
      const canUseShare =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });
      if (canUseShare) {
        await navigator.share({ files: [file], title: fileName });
        message.success(
          intl.formatMessage({
            id: 'account.productOrders.saveQrImageSuccess',
          }),
        );
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      message.success(
        intl.formatMessage({ id: 'account.productOrders.saveQrImageSuccess' }),
      );
    } catch (error) {
      message.error(
        intl.formatMessage({ id: 'account.productOrders.saveQrImageFallback' }),
      );
    }
  };

  const onConfirmReceived = async () => {
    if (!item?.order_no) return;
    if (
      ['completed', 'settled'].includes(String(item.status || '').toLowerCase())
    ) {
      return;
    }
    Modal.confirm({
      title: intl.formatMessage({
        id: 'account.productOrders.confirmReceived',
      }),
      content: intl.formatMessage({
        id: 'account.productOrders.confirmReceivedPrompt',
      }),
      okText: intl.formatMessage({ id: 'common.yes' }),
      cancelText: intl.formatMessage({ id: 'common.cancel' }),
      onOk: async () => {
        setActionLoading(true);
        try {
          await confirmProductOrderReceived(item.order_no);
          message.success(
            intl.formatMessage({
              id: 'account.productOrders.completedSuccess',
            }),
          );
          loadDetail();
        } catch (error) {
          message.error(
            intl.formatMessage({
              id: 'account.productOrders.error.confirmReceived',
            }),
          );
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const onSubmitTxHint = async () => {
    if (!item?.order_no) return;
    const values = await hintForm.validateFields();
    setHintLoading(true);
    try {
      await submitProductOrderTxHint(item.order_no, { txid: values.txid });
      message.success(
        intl.formatMessage({
          id: 'account.productOrders.txHint.submitSuccess',
        }),
      );
      hintForm.resetFields();
      loadDetail();
    } finally {
      setHintLoading(false);
    }
  };

  const walletPaymentErrorMessage = (error: any) => {
    const normalized = String(
      error?.message || error?.detail || error?.error || '',
    ).toLowerCase();
    if (
      normalized.includes('insufficient') ||
      normalized.includes('not enough') ||
      normalized.includes('spendable balance')
    ) {
      return intl.formatMessage({
        id: 'account.productOrders.walletPayment.error.insufficientFunds',
      });
    }
    if (
      normalized.includes('unlock') ||
      normalized.includes('locked') ||
      normalized.includes('password')
    ) {
      return intl.formatMessage({
        id: 'account.productOrders.walletPayment.error.lockedWallet',
      });
    }
    if (normalized.includes('timeout') || normalized.includes('timed out')) {
      return intl.formatMessage({
        id: 'account.productOrders.walletPayment.error.timeout',
      });
    }
    return intl.formatMessage({
      id: 'account.productOrders.walletPayment.error.default',
    });
  };

  const onPayWithLinkedWallet = async () => {
    const currentTxid = String(
      item?.payment_order?.txid || item?.txid || submittedTxid || '',
    );
    if (!item?.order_no || currentTxid) return;
    const values = await walletPayForm.validateFields();
    setWalletPayLoading(true);
    try {
      const result = await payProductOrderWithWallet(item.order_no, {
        password: values.password,
      });
      const returnedTxid = String(
        result?.txid || result?.payment_order?.txid || '',
      );
      if (returnedTxid) setSubmittedTxid(returnedTxid);
      message.success(
        intl.formatMessage({
          id: 'account.productOrders.walletPayment.success',
        }),
      );
      walletPayForm.resetFields();
      await loadDetail();
    } catch (error) {
      message.error(walletPaymentErrorMessage(error));
    } finally {
      setWalletPayLoading(false);
    }
  };

  const onSubmitRefund = async () => {
    if (!item?.order_no) return;
    const values = await refundForm.validateFields();
    setRefundSubmitting(true);
    try {
      await createBuyerProductRefundRequest(item.order_no, values);
      message.success(
        intl.formatMessage({ id: 'refundRequests.requestSuccess' }),
      );
      setRefundOpen(false);
      refundForm.resetFields();
      loadDetail();
    } finally {
      setRefundSubmitting(false);
    }
  };

  const normalizedStatus = String(item?.status || '').toLowerCase();
  const normalizedPaymentStatus = String(
    item?.payment_status || '',
  ).toLowerCase();
  const paymentOrderStatus = String(
    item?.payment_order?.status || item?.payment_status || '',
  ).toLowerCase();
  const effectiveTxid = String(
    item?.payment_order?.txid || item?.txid || submittedTxid || '',
  );
  const paymentOrderStatusLabel = getPaymentOrderStatusLabel(
    paymentOrderStatus,
    effectiveTxid,
    intl,
  );
  const isPaymentTimeoutCancelled =
    normalizedStatus === 'cancelled' &&
    item?.cancel_reason === 'payment_timeout';
  const canRequestRefund =
    ['paid', 'shipping', 'completed'].includes(normalizedStatus) &&
    normalizedStatus !== 'settled';
  const activeRefundExists =
    Boolean(item?.active_refund_request_exists) ||
    refunds.some((entry) => String(entry.status).toLowerCase() === 'requested');
  const latestRefund = item?.latest_refund_request || refunds[0] || null;

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
            description={intl.formatMessage({
              id: 'account.productOrders.empty',
            })}
          />
        </Card>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Descriptions
              column={1}
              title={intl.formatMessage({ id: 'orderConfirmation.title' })}
            >
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.orderNo',
                })}
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
                label={intl.formatMessage({
                  id: 'account.productOrders.product',
                })}
              >
                {item.product_title_snapshot}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'confirmAndPay.title' })}
              >
                {item.total_amount}{' '}
                {item.currency ||
                  intl.formatMessage({
                    id: 'account.productOrders.currency.thbLtt',
                  })}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.status',
                })}
              >
                <Tag>{String(item.status || '-').toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.paymentStatus',
                })}
              >
                <Tag>{paymentOrderStatusLabel}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {isPaymentTimeoutCancelled ? (
            <Alert
              showIcon
              type="error"
              message={intl.formatMessage({
                id: 'account.productOrders.paymentTimeout',
              })}
            />
          ) : null}

          {normalizedStatus === 'pending_payment' &&
          !isPaymentTimeoutCancelled ? (
            <Card
              variant="borderless"
              style={{ borderRadius: 20 }}
              title={intl.formatMessage({ id: 'confirmAndPay.title' })}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Descriptions column={1}>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'account.productOrders.payToAddress',
                    })}
                  >
                    <Text style={{ wordBreak: 'break-all' }}>
                      {item.pay_to_address || '-'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'account.productOrders.expectedAmount',
                    })}
                  >
                    <Text strong>{item.expected_amount}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'account.productOrders.expiresAt',
                    })}
                  >
                    <Text type="secondary">{item.expires_at || '-'}</Text>
                  </Descriptions.Item>
                </Descriptions>
                <Space wrap size={8}>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyValue(item.pay_to_address)}
                  >
                    {intl.formatMessage({
                      id: 'account.productOrders.copyAddress',
                    })}
                  </Button>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyValue(item.expected_amount)}
                  >
                    {intl.formatMessage({
                      id: 'account.productOrders.copyAmount',
                    })}
                  </Button>
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() => copyValue(paymentQrPayloadText)}
                  >
                    {intl.formatMessage({
                      id: 'account.productOrders.copyQrPayload',
                    })}
                  </Button>
                  <Button
                    size="small"
                    onClick={onSaveQrImage}
                    disabled={!qrImageUrl}
                  >
                    {intl.formatMessage({
                      id: 'account.productOrders.saveQrImage',
                    })}
                  </Button>
                </Space>
                <Alert
                  showIcon
                  type="warning"
                  message={intl.formatMessage({ id: 'confirmAndPay.notProof' })}
                  style={{
                    background: '#fffbe6',
                    borderColor: '#ffe58f',
                  }}
                />
                <QrCodePanel
                  payload={paymentQrPayload}
                  size={paymentQrSize}
                  showPayloadText={false}
                  emptyText={intl.formatMessage({
                    id: 'account.productOrders.paymentQr.empty',
                  })}
                />
                <Button
                  type="link"
                  size="small"
                  style={{ alignSelf: 'center', paddingInline: 0 }}
                  onClick={() => setShowQrPayload((value) => !value)}
                >
                  {intl.formatMessage({
                    id: showQrPayload
                      ? 'account.productOrders.qrPayload.hide'
                      : 'account.productOrders.qrPayload.show',
                  })}
                </Button>
                {showQrPayload ? (
                  <pre
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.5,
                      padding: 10,
                      borderRadius: 8,
                      background: 'rgba(0,0,0,0.04)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {paymentQrPayloadText}
                  </pre>
                ) : null}
              </Space>
            </Card>
          ) : null}

          {normalizedStatus === 'pending_payment' &&
          !isPaymentTimeoutCancelled ? (
            <Card
              variant="borderless"
              style={{ borderRadius: 20 }}
              title={intl.formatMessage({
                id: 'account.productOrders.txHint.title',
              })}
            >
              <Form form={walletPayForm} layout="vertical">
                {effectiveTxid ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Alert
                      showIcon
                      type="info"
                      message={intl.formatMessage({
                        id: 'account.productOrders.walletPayment.submitted',
                      })}
                    />
                    <Space wrap>
                      <Text>
                        {intl.formatMessage({
                          id: 'account.productOrders.txid',
                        })}
                        : {effectiveTxid}
                      </Text>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyValue(effectiveTxid)}
                      >
                        {intl.formatMessage({
                          id: 'account.productOrders.copyTxid',
                        })}
                      </Button>
                    </Space>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={loadDetail}
                      disabled={walletPayLoading}
                    >
                      {intl.formatMessage({
                        id: 'account.productOrders.refreshPaymentStatus',
                      })}
                    </Button>
                  </Space>
                ) : (
                  <>
                    <Form.Item
                      name="password"
                      label={intl.formatMessage({
                        id: 'account.productOrders.walletPayment.password',
                      })}
                      rules={[{ required: true }]}
                    >
                      <Input.Password />
                    </Form.Item>
                    <Button
                      type="primary"
                      onClick={onPayWithLinkedWallet}
                      loading={walletPayLoading}
                      disabled={walletPayLoading}
                    >
                      {intl.formatMessage({
                        id: 'account.productOrders.walletPayment.pay',
                      })}
                    </Button>
                  </>
                )}
              </Form>
              <Form form={hintForm} layout="vertical" style={{ marginTop: 16 }}>
                <Form.Item
                  name="txid"
                  label={intl.formatMessage({
                    id: 'account.productOrders.txidHint',
                  })}
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
                  {intl.formatMessage({
                    id: 'account.productOrders.submitTxid',
                  })}
                </Button>
              </Form>
            </Card>
          ) : null}

          {normalizedPaymentStatus === 'underpaid' ||
          normalizedPaymentStatus === 'overpaid' ||
          normalizedPaymentStatus === 'paid' ? (
            <Alert
              showIcon
              type={
                normalizedPaymentStatus === 'underpaid' ? 'warning' : 'success'
              }
              message={
                normalizedPaymentStatus === 'underpaid'
                  ? intl.formatMessage({
                      id: 'account.productOrders.payment.underpaid',
                    })
                  : normalizedPaymentStatus === 'overpaid'
                  ? intl.formatMessage({
                      id: 'account.productOrders.payment.overpaid',
                    })
                  : intl.formatMessage({
                      id: 'account.productOrders.payment.paid',
                    })
              }
              description={`${intl.formatMessage({
                id: 'account.productOrders.txid',
              })}: ${item.txid || '-'} · ${intl.formatMessage({
                id: 'account.productOrders.confirmations',
              })}: ${item.confirmations ?? '-'}`}
            />
          ) : null}

          {normalizedStatus === 'shipping' ? (
            <Card
              variant="borderless"
              style={{ borderRadius: 20 }}
              title={intl.formatMessage({
                id: 'account.productOrders.shipment',
              })}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Descriptions column={1}>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'account.productOrders.shipment.carrier',
                    })}
                  >
                    {item.shipment?.carrier || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'account.productOrders.trackingNumber',
                    })}
                  >
                    {item.shipment?.tracking_number || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'account.productOrders.shipment.trackingUrl',
                    })}
                  >
                    {item.shipment?.tracking_url || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'account.productOrders.shipment.note',
                    })}
                  >
                    {item.shipment?.shipped_note || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'account.productOrders.shippedAt',
                    })}
                  >
                    {item.shipped_at || '-'}
                  </Descriptions.Item>
                </Descriptions>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={actionLoading}
                  disabled={actionLoading}
                  onClick={onConfirmReceived}
                >
                  {intl.formatMessage({
                    id: 'account.productOrders.confirmReceived',
                  })}
                </Button>
              </Space>
            </Card>
          ) : null}

          {normalizedStatus === 'completed' ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Alert
                type="success"
                showIcon
                message={intl.formatMessage({
                  id: 'account.productOrders.completedState',
                })}
                description={`${intl.formatMessage({
                  id: 'account.productOrders.completedAt',
                })}: ${item.completed_at || '-'}`}
              />
            </Card>
          ) : null}

          {normalizedStatus === 'paid' ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Alert
                showIcon
                type="info"
                message={intl.formatMessage({
                  id: 'account.productOrders.waitingSellerShip',
                })}
              />
            </Card>
          ) : null}

          {normalizedStatus === 'settled' ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Alert
                showIcon
                type="success"
                message={intl.formatMessage({
                  id: 'account.productOrders.settledState',
                })}
              />
            </Card>
          ) : null}

          {normalizedStatus === 'cancelled' ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Alert
                showIcon
                type="warning"
                message={intl.formatMessage({
                  id: 'account.productOrders.cancelledState',
                })}
              />
            </Card>
          ) : null}

          {canRequestRefund ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="default"
                  onClick={() => setRefundOpen(true)}
                  disabled={activeRefundExists}
                >
                  {intl.formatMessage({ id: 'refundRequests.request' })}
                </Button>
                {latestRefund ? (
                  <Descriptions column={1} size="small">
                    <Descriptions.Item
                      label={intl.formatMessage({
                        id: 'refundRequests.latest',
                      })}
                    >
                      {String(latestRefund.status || '-').toUpperCase()}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={intl.formatMessage({
                        id: 'refundRequests.reason',
                      })}
                    >
                      {latestRefund.reason || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={intl.formatMessage({
                        id: 'refundRequests.amount',
                      })}
                    >
                      {latestRefund.requested_amount || '-'}
                    </Descriptions.Item>
                  </Descriptions>
                ) : null}
              </Space>
            </Card>
          ) : null}

          {item.shipment && normalizedStatus !== 'shipping' ? (
            <Card
              variant="borderless"
              style={{ borderRadius: 20 }}
              title={intl.formatMessage({
                id: 'account.productOrders.shipment',
              })}
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
                  label={intl.formatMessage({
                    id: 'account.productOrders.shipment.note',
                  })}
                >
                  {item.shipment.shipped_note || '-'}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.shippedAt',
                  })}
                >
                  {item.shipped_at || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          ) : null}
        </Space>
      )}

      <Modal
        open={refundOpen}
        onCancel={() => setRefundOpen(false)}
        onOk={onSubmitRefund}
        confirmLoading={refundSubmitting}
        title={intl.formatMessage({ id: 'refundRequests.request' })}
      >
        <Form
          form={refundForm}
          layout="vertical"
          initialValues={{ requested_amount: item?.total_amount }}
        >
          <Form.Item
            name="reason"
            label={intl.formatMessage({ id: 'refundRequests.reason' })}
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="requested_amount"
            label={intl.formatMessage({ id: 'refundRequests.amount' })}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
