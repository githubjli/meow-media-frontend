import {
  getSellerProductOrderDetail,
  shipSellerProductOrder,
} from '@/services/productOrders';
import type { ProductOrder } from '@/types/productOrder';
import { CopyOutlined } from '@ant-design/icons';
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

const isObject = (value: any) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

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
          error?.message ||
            intl.formatMessage({ id: 'seller.orders.error.detail' }),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(
        `/login?redirect=${encodeURIComponent(
          `/seller/orders/${params.order_no || ''}`,
        )}`,
      );
      return;
    }
    if (!isLoggedIn) return;
    loadDetail();
  }, [initialState?.authLoading, isLoggedIn, params.order_no]);

  const buyerSummary = useMemo(
    () => ({
      name: readFirst(item, [
        'buyer_name',
        'buyer_display_name',
        'buyer_username',
      ]),
      email: readFirst(item, ['buyer_email']),
      phone: readFirst(item, ['buyer_phone']),
    }),
    [item],
  );

  const shippingAddressSummary = useMemo(() => {
    const rawSnapshot = item?.shipping_address_snapshot;
    let snapshot: any = null;

    if (isObject(rawSnapshot)) {
      snapshot = rawSnapshot;
    } else if (typeof rawSnapshot === 'string') {
      try {
        const parsed = JSON.parse(rawSnapshot);
        if (isObject(parsed)) snapshot = parsed;
      } catch (error) {
        snapshot = null;
      }
    }

    return {
      receiver_name:
        readFirst(snapshot, ['receiver_name']) ||
        readFirst(item, ['shipping_receiver_name', 'receiver_name_snapshot']),
      phone:
        readFirst(snapshot, ['phone']) ||
        readFirst(item, ['shipping_phone', 'phone_snapshot']),
      street_address: readFirst(snapshot, ['street_address']),
      district: readFirst(snapshot, ['district']),
      city: readFirst(snapshot, ['city']),
      province: readFirst(snapshot, ['province']),
      country: readFirst(snapshot, ['country']),
      postal_code: readFirst(snapshot, ['postal_code']),
      fallbackAddressText: readFirst(item, ['shipping_address_text']),
    };
  }, [item]);

  const payoutSummary = useMemo(
    () => item?.seller_payout || item?.payout || null,
    [item],
  );

  const normalizedStatus = String(item?.status || '').toLowerCase();
  const canShip = normalizedStatus === 'paid';

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

  const copyValue = async (value?: string | null) => {
    if (!value) return;
    await navigator.clipboard.writeText(String(value));
    message.success(intl.formatMessage({ id: 'common.copied' }));
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
          <Empty
            description={intl.formatMessage({ id: 'seller.orders.empty' })}
          />
        </Card>
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Descriptions
              column={1}
              title={intl.formatMessage({ id: 'seller.orders.detailTitle' })}
            >
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.orderNo',
                })}
              >
                {item.order_no}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.product',
                })}
              >
                {item.product_title_snapshot || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.status',
                })}
              >
                <Tag>{String(item.status || '-').toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'seller.orders.quantity' })}
              >
                {item.quantity ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.amount',
                })}
              >
                {item.total_amount}{' '}
                {item.currency ||
                  intl.formatMessage({
                    id: 'account.productOrders.currency.thbLtt',
                  })}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.expectedAmount',
                })}
              >
                {item.expected_amount}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.payToAddress',
                })}
              >
                <Text copyable>{item.pay_to_address || '-'}</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {String(item.status || '').toLowerCase() === 'cancelled' &&
          String(item.cancel_reason || '').toLowerCase() ===
            'payment_timeout' ? (
            <Alert
              showIcon
              type="warning"
              message={intl.formatMessage({
                id: 'account.productOrders.paymentTimeout',
              })}
            />
          ) : null}

          <Card
            variant="borderless"
            style={{ borderRadius: 20 }}
            title={intl.formatMessage({ id: 'seller.orders.paymentSummary' })}
          >
            <Descriptions column={1}>
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
                {String(item.payment_status || '-').toUpperCase()}
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
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.expectedAmount',
                })}
              >
                {item.expected_amount ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.actualAmount',
                })}
              >
                {item.actual_amount ?? '-'}
              </Descriptions.Item>
            </Descriptions>
            {isObject(item.payment_order) ? (
              <Descriptions
                column={1}
                size="small"
                style={{ marginTop: 12 }}
                title={intl.formatMessage({ id: 'seller.orders.paymentOrder' })}
              >
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.status',
                  })}
                >
                  {String(item.payment_order?.status || '-').toUpperCase()}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.txid',
                  })}
                >
                  {item.payment_order?.txid ? (
                    <Text copyable>{String(item.payment_order.txid)}</Text>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.confirmations',
                  })}
                >
                  {item.payment_order?.confirmations ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.expectedAmount',
                  })}
                >
                  {item.payment_order?.expected_amount_lbc ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.actualAmount',
                  })}
                >
                  {item.payment_order?.actual_amount_lbc ?? '-'}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.paidAt',
                  })}
                >
                  {item.payment_order?.paid_at || '-'}
                </Descriptions.Item>
              </Descriptions>
            ) : null}
          </Card>

          <Card
            variant="borderless"
            style={{ borderRadius: 20 }}
            title={intl.formatMessage({ id: 'seller.orders.buyerSummary' })}
          >
            <Descriptions column={1}>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'seller.orders.buyer.name' })}
              >
                {buyerSummary.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'seller.orders.buyer.email' })}
              >
                {buyerSummary.email || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'seller.orders.buyer.phone' })}
              >
                {buyerSummary.phone || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            variant="borderless"
            style={{ borderRadius: 20 }}
            title={intl.formatMessage({
              id: 'seller.orders.shippingAddressSnapshot',
            })}
          >
            <Descriptions column={1}>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.shippingAddresses.receiver',
                })}
              >
                {shippingAddressSummary.receiver_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.shippingAddresses.phone',
                })}
              >
                {shippingAddressSummary.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.shippingAddresses.address',
                })}
              >
                {shippingAddressSummary.street_address ||
                shippingAddressSummary.district ||
                shippingAddressSummary.city ||
                shippingAddressSummary.province ||
                shippingAddressSummary.country ||
                shippingAddressSummary.postal_code ? (
                  <Space
                    direction="vertical"
                    size={0}
                    style={{ width: '100%' }}
                  >
                    <Text style={{ wordBreak: 'break-word' }}>
                      {shippingAddressSummary.street_address || '-'}
                    </Text>
                    <Text type="secondary" style={{ wordBreak: 'break-word' }}>
                      {[
                        shippingAddressSummary.district,
                        shippingAddressSummary.city,
                      ]
                        .filter(Boolean)
                        .join(', ') || '-'}
                    </Text>
                    <Text type="secondary" style={{ wordBreak: 'break-word' }}>
                      {[
                        shippingAddressSummary.province,
                        shippingAddressSummary.country,
                        shippingAddressSummary.postal_code,
                      ]
                        .filter(Boolean)
                        .join(' ') || '-'}
                    </Text>
                  </Space>
                ) : shippingAddressSummary.fallbackAddressText ? (
                  <Text style={{ wordBreak: 'break-word' }}>
                    {shippingAddressSummary.fallbackAddressText}
                  </Text>
                ) : (
                  <Text type="secondary">
                    {intl.formatMessage({
                      id: 'seller.orders.shippingAddressUnavailable',
                    })}
                  </Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            variant="borderless"
            style={{ borderRadius: 20 }}
            title={intl.formatMessage({ id: 'seller.orders.shipmentSummary' })}
          >
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
                {item.shipment?.shipped_at || item.shipped_at || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            variant="borderless"
            style={{ borderRadius: 20 }}
            title={intl.formatMessage({ id: 'seller.orders.payoutSummary' })}
          >
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {normalizedStatus === 'completed' &&
              !(payoutSummary?.payout_txid || payoutSummary?.txid) ? (
                <Alert
                  showIcon
                  type="info"
                  message={intl.formatMessage({
                    id: 'seller.orders.payout.waitingSettlement',
                  })}
                />
              ) : null}
              {normalizedStatus === 'settled' ? (
                <Alert
                  showIcon
                  type="success"
                  message={intl.formatMessage({
                    id: 'seller.orders.payout.settled',
                  })}
                />
              ) : null}
              {payoutSummary ? (
                <Descriptions column={1}>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'seller.orders.payoutStatus',
                    })}
                  >
                    {String(payoutSummary?.status || '-').toUpperCase()}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'seller.orders.payoutTxid',
                    })}
                  >
                    {payoutSummary?.payout_txid || payoutSummary?.txid ? (
                      <Space wrap>
                        <Text>
                          {String(
                            payoutSummary?.payout_txid ||
                              payoutSummary?.txid ||
                              '-',
                          )}
                        </Text>
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() =>
                            copyValue(
                              String(
                                payoutSummary?.payout_txid ||
                                  payoutSummary?.txid ||
                                  '',
                              ),
                            )
                          }
                        >
                          {intl.formatMessage({
                            id: 'account.productOrders.copyTxid',
                          })}
                        </Button>
                      </Space>
                    ) : (
                      '-'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'seller.orders.payoutAddressLabel',
                    })}
                  >
                    {payoutSummary?.payout_address ? (
                      <Space wrap>
                        <Text style={{ wordBreak: 'break-word' }}>
                          {payoutSummary?.payout_address || '-'}
                        </Text>
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() =>
                            copyValue(
                              String(payoutSummary?.payout_address || ''),
                            )
                          }
                        >
                          {intl.formatMessage({ id: 'common.copy' })}
                        </Button>
                      </Space>
                    ) : (
                      '-'
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'account.productOrders.paidAt',
                    })}
                  >
                    {payoutSummary?.paid_at || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item
                    label={intl.formatMessage({
                      id: 'seller.orders.payoutFailureNote',
                    })}
                  >
                    <Text style={{ wordBreak: 'break-word' }}>
                      {payoutSummary?.failure_note || '-'}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Alert
                  showIcon
                  type="info"
                  message={intl.formatMessage({
                    id: 'seller.orders.payout.noRecord',
                  })}
                />
              )}
            </Space>
          </Card>

          <Card
            variant="borderless"
            style={{ borderRadius: 20 }}
            title={intl.formatMessage({ id: 'seller.orders.markShipped' })}
          >
            {normalizedStatus === 'pending_payment' ? (
              <Alert
                showIcon
                type="info"
                message={intl.formatMessage({
                  id: 'seller.orders.waitingBuyerPayment',
                })}
                style={{ marginBottom: 12 }}
              />
            ) : normalizedStatus === 'paid' ? (
              <Form layout="vertical" form={form}>
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
                  label={intl.formatMessage({
                    id: 'account.productOrders.trackingNumber',
                  })}
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
                  label={intl.formatMessage({
                    id: 'account.productOrders.shipment.note',
                  })}
                >
                  <Input.TextArea rows={3} />
                </Form.Item>
                <Button
                  type="primary"
                  onClick={onShip}
                  loading={shippingLoading}
                >
                  {intl.formatMessage({ id: 'seller.orders.markShipped' })}
                </Button>
              </Form>
            ) : normalizedStatus === 'shipping' ? (
              <Alert
                showIcon
                type="info"
                message={intl.formatMessage({
                  id: 'seller.orders.shippingInProgress',
                })}
              />
            ) : normalizedStatus === 'completed' ||
              normalizedStatus === 'settled' ? (
              <Alert
                showIcon
                type="success"
                message={intl.formatMessage({
                  id: 'seller.orders.finalStatusReached',
                })}
              />
            ) : (
              <Alert
                showIcon
                type="info"
                message={intl.formatMessage({
                  id: 'seller.orders.shipOnlyWhenPaid',
                })}
              />
            )}
          </Card>
        </Space>
      )}
    </PageContainer>
  );
}
