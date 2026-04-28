import PageIntroCard from '@/components/PageIntroCard';
import {
  getMeowPointOrder,
  submitMeowPointTxHint,
} from '@/services/meowPoints';
import type { MeowPointOrder } from '@/types/meowPoints';
import {
  CheckCircleOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';

const { Text } = Typography;

const POLL_INTERVAL_MS = 12000;

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStatus = (value?: string) =>
  String(value || 'pending').toLowerCase();

const resolveTotalPoints = (order: MeowPointOrder | null) => {
  const total = toNumber(order?.total_points);
  if (total !== null) return total;
  const points = toNumber(order?.points_amount) ?? 0;
  const bonus = toNumber(order?.bonus_points) ?? 0;
  return points + bonus;
};

export default function MeowPointsOrderDetailPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const params = useParams<{ orderNo: string }>();
  const orderNo = String(params?.orderNo || '').trim();
  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const locale = intl.locale || 'en-US';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [order, setOrder] = useState<MeowPointOrder | null>(null);
  const [txid, setTxid] = useState('');
  const [submittingTxHint, setSubmittingTxHint] = useState(false);

  const formatNumber = (value: number | string | null | undefined) => {
    const parsed = toNumber(value);
    if (parsed === null) return '-';
    return new Intl.NumberFormat(locale).format(parsed);
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  };

  const status = normalizeStatus(order?.status);
  const isPending = ['pending', 'underpaid', 'overpaid'].includes(status);
  const isPaid = status === 'paid';
  const isFailedLike = ['expired', 'cancelled', 'failed'].includes(status);

  const loadOrder = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!orderNo) return;

      const isSilent = Boolean(options?.silent);
      if (isSilent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await getMeowPointOrder(orderNo);
        setOrder(data || null);
        setErrorMessage('');
      } catch (error: any) {
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'meowPoints.order.error.load' }),
        );
      } finally {
        if (isSilent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [intl, orderNo],
  );

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(
        `/login?redirect=${encodeURIComponent(
          `/meow-points/orders/${orderNo}`,
        )}`,
      );
      return;
    }

    if (!isLoggedIn) return;

    void loadOrder();
  }, [initialState?.authLoading, isLoggedIn, loadOrder, orderNo]);

  useEffect(() => {
    if (!isPending || !orderNo) return;
    const timer = window.setInterval(() => {
      void loadOrder({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isPending, loadOrder, orderNo]);

  const onCopy = async (value?: string | null) => {
    const content = String(value || '').trim();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      message.success(intl.formatMessage({ id: 'meowPoints.order.copied' }));
    } catch (error) {
      message.error(intl.formatMessage({ id: 'meowPoints.order.copyFailed' }));
    }
  };

  const onSubmitTxHint = async () => {
    const value = String(txid || '').trim();
    if (!value || !orderNo || submittingTxHint) return;

    setSubmittingTxHint(true);
    try {
      const latest = await submitMeowPointTxHint(orderNo, value);
      setOrder(latest || null);
      setTxid('');
      message.success(
        intl.formatMessage({ id: 'meowPoints.order.txHintSent' }),
      );
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'meowPoints.order.error.txHint' }),
      );
    } finally {
      setSubmittingTxHint(false);
    }
  };

  const packageName =
    order?.package_snapshot?.title ||
    order?.package_snapshot?.name ||
    order?.package_name ||
    '-';

  const packageCode =
    order?.package_snapshot?.code || order?.package_code || '-';

  const paymentAmount =
    order?.payment_amount ?? order?.price_amount ?? order?.amount ?? null;
  const paymentCurrency = String(
    order?.payment_currency || order?.currency || 'THB-LTT',
  ).toUpperCase();

  const statusTag = useMemo(() => {
    if (isPaid) {
      return (
        <Tag color="green">{String(order?.status || 'PAID').toUpperCase()}</Tag>
      );
    }
    if (isFailedLike) {
      return <Tag color="red">{String(order?.status || '').toUpperCase()}</Tag>;
    }
    if (status === 'underpaid' || status === 'overpaid') {
      return (
        <Tag color="orange">{String(order?.status || '').toUpperCase()}</Tag>
      );
    }
    return (
      <Tag color="gold">{String(order?.status || 'PENDING').toUpperCase()}</Tag>
    );
  }, [isFailedLike, isPaid, order?.status, status]);

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <PageIntroCard
          title={intl.formatMessage({ id: 'meowPoints.order.title' })}
          description={intl.formatMessage(
            { id: 'meowPoints.order.subtitle' },
            { orderNo: orderNo || '-' },
          )}
          extra={
            <Button
              icon={<ReloadOutlined />}
              loading={refreshing}
              onClick={() => loadOrder({ silent: true })}
            >
              {intl.formatMessage({ id: 'common.refresh' })}
            </Button>
          }
        />

        {errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}

        {loading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Spin />
          </Card>
        ) : (
          <>
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({ id: 'meowPoints.order.orderNo' })}
                  </Text>
                  <Space>
                    <Text code>{order?.order_no || '-'}</Text>
                    <Button
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() => onCopy(order?.order_no)}
                    >
                      {intl.formatMessage({ id: 'common.copy' })}
                    </Button>
                  </Space>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({ id: 'meowPoints.order.status' })}
                  </Text>
                  {statusTag}
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({ id: 'meowPoints.order.package' })}
                  </Text>
                  <Text>{packageName}</Text>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({ id: 'meowPoints.order.packageCode' })}
                  </Text>
                  <Text>{packageCode}</Text>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({
                      id: 'meowPoints.order.pointsAmount',
                    })}
                  </Text>
                  <Text>{formatNumber(order?.points_amount)}</Text>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({ id: 'meowPoints.order.bonusPoints' })}
                  </Text>
                  <Text>{formatNumber(order?.bonus_points)}</Text>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({ id: 'meowPoints.order.totalPoints' })}
                  </Text>
                  <Text>{formatNumber(resolveTotalPoints(order))}</Text>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({
                      id: 'meowPoints.order.paymentAmount',
                    })}
                  </Text>
                  <Text>
                    {formatNumber(paymentAmount)} {paymentCurrency}
                  </Text>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({
                      id: 'meowPoints.order.payToAddress',
                    })}
                  </Text>
                  <Space>
                    <Text code>{order?.pay_to_address || '-'}</Text>
                    {order?.pay_to_address ? (
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => onCopy(order?.pay_to_address)}
                      >
                        {intl.formatMessage({ id: 'common.copy' })}
                      </Button>
                    ) : null}
                  </Space>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({ id: 'meowPoints.order.txid' })}
                  </Text>
                  <Text code>{order?.txid || '-'}</Text>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({
                      id: 'meowPoints.order.confirmations',
                    })}
                  </Text>
                  <Text>{order?.confirmations ?? '-'}</Text>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({ id: 'meowPoints.order.expiresAt' })}
                  </Text>
                  <Text>{formatDateTime(order?.expires_at)}</Text>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({ id: 'meowPoints.order.paidAt' })}
                  </Text>
                  <Text>{formatDateTime(order?.paid_at)}</Text>
                </Space>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Text strong>
                    {intl.formatMessage({ id: 'meowPoints.order.creditedAt' })}
                  </Text>
                  <Text>{formatDateTime(order?.credited_at)}</Text>
                </Space>
              </Space>
            </Card>

            {isPending ? (
              <Card variant="borderless" style={{ borderRadius: 20 }}>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Alert
                    type="info"
                    showIcon
                    message={intl.formatMessage({
                      id: 'meowPoints.order.pending',
                    })}
                  />
                  <Text type="secondary">
                    {intl.formatMessage({ id: 'meowPoints.order.pendingHint' })}
                  </Text>
                  {!order?.txid ? (
                    <Space
                      direction="vertical"
                      size={8}
                      style={{ width: '100%' }}
                    >
                      <Input
                        value={txid}
                        onChange={(event) => setTxid(event.target.value)}
                        placeholder={intl.formatMessage({
                          id: 'meowPoints.order.txHintPlaceholder',
                        })}
                      />
                      <Button
                        onClick={onSubmitTxHint}
                        loading={submittingTxHint}
                        disabled={!String(txid || '').trim()}
                      >
                        {intl.formatMessage({
                          id: 'meowPoints.order.submitTxHint',
                        })}
                      </Button>
                    </Space>
                  ) : null}
                </Space>
              </Card>
            ) : null}

            {isPaid ? (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message={intl.formatMessage({ id: 'meowPoints.order.paid' })}
                action={
                  <Button
                    type="primary"
                    onClick={() => history.push('/meow-points')}
                  >
                    {intl.formatMessage({
                      id: 'meowPoints.order.backToWallet',
                    })}
                  </Button>
                }
              />
            ) : null}

            {isFailedLike ? (
              <Alert
                type="error"
                showIcon
                icon={<ExclamationCircleOutlined />}
                message={intl.formatMessage({
                  id: 'meowPoints.order.failedLike',
                })}
                action={
                  <Button onClick={() => history.push('/meow-points/recharge')}>
                    {intl.formatMessage({
                      id: 'meowPoints.order.backToRecharge',
                    })}
                  </Button>
                }
              />
            ) : null}
          </>
        )}
      </Space>
    </PageContainer>
  );
}
