import PageIntroCard from '@/components/PageIntroCard';
import QrCodePanel from '@/components/QrCodePanel';
import {
  cancelBillingSubscription,
  createBillingSubscription,
  getMyBillingSubscription,
  listBillingPlans,
  type BillingPlan,
  type BillingSubscription,
} from '@/services/billing';
import {
  DollarOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Modal,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Text, Title, Paragraph } = Typography;

const formatDate = (locale: string, value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
};

export default function AccountSubscriptionPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(
    null,
  );
  const [submittingPlanId, setSubmittingPlanId] = useState<string>('');
  const [cancelling, setCancelling] = useState(false);
  const [qrPayload, setQrPayload] = useState('');
  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const locale = intl.locale || 'en-US';

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const [subscriptionData, plansData] = await Promise.all([
        getMyBillingSubscription().catch(() => null),
        listBillingPlans(),
      ]);
      setSubscription(subscriptionData || null);
      setPlans(plansData || []);
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          intl.formatMessage({ id: 'account.subscription.error.load' }),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(
        `/login?redirect=${encodeURIComponent('/account/subscription')}`,
      );
      return;
    }

    if (!isLoggedIn) {
      return;
    }

    loadData();
  }, [initialState?.authLoading, isLoggedIn, intl]);

  const activePlanId = String(subscription?.plan?.id || '');
  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) => Number(a.amount || 0) - Number(b.amount || 0)),
    [plans],
  );
  const activeStatus = String(subscription?.status || '').toLowerCase();
  const isActive =
    activeStatus === 'active' ||
    activeStatus === 'trialing' ||
    activeStatus === 'cancel_at_period_end';

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <PageIntroCard
          title={intl.formatMessage({ id: 'account.subscription.title' })}
          description={intl.formatMessage({
            id: 'account.subscription.subtitle',
          })}
          actions={
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
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
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ) : (
          <>
            <Card
              title={intl.formatMessage({
                id: 'account.subscription.current.title',
              })}
              variant="borderless"
              style={{ borderRadius: 20 }}
            >
              {!subscription ? (
                <Empty
                  description={intl.formatMessage({
                    id: 'account.subscription.current.empty',
                  })}
                />
              ) : (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Title level={5} style={{ margin: 0 }}>
                    {subscription?.plan?.name ||
                      intl.formatMessage({
                        id: 'account.subscription.current.unknownPlan',
                      })}
                  </Title>
                  <Space wrap>
                    <Tag color={isActive ? 'green' : 'default'}>
                      {String(subscription.status || '-').toUpperCase()}
                    </Tag>
                    {subscription.auto_renew ? (
                      <Tag color="blue">
                        {intl.formatMessage({
                          id: 'account.subscription.current.autoRenew',
                        })}
                      </Tag>
                    ) : null}
                  </Space>
                  <Text type="secondary">
                    {intl.formatMessage({
                      id: 'account.subscription.current.period',
                    })}
                    : {formatDate(locale, subscription.current_period_start)} -{' '}
                    {formatDate(locale, subscription.current_period_end)}
                  </Text>
                  {subscription.cancel_at ? (
                    <Text type="secondary">
                      {intl.formatMessage({
                        id: 'account.subscription.current.cancelAt',
                      })}
                      : {formatDate(locale, subscription.cancel_at)}
                    </Text>
                  ) : null}
                  <Space>
                    <Button
                      danger
                      icon={<StopOutlined />}
                      loading={cancelling}
                      disabled={!subscription?.id || !isActive}
                      onClick={async () => {
                        if (!subscription?.id) return;
                        setCancelling(true);
                        try {
                          const next = await cancelBillingSubscription(
                            subscription.id,
                          );
                          setSubscription(next || subscription);
                          message.success(
                            intl.formatMessage({
                              id: 'account.subscription.cancel.success',
                            }),
                          );
                        } catch (error: any) {
                          message.error(
                            error?.message ||
                              intl.formatMessage({
                                id: 'account.subscription.cancel.error',
                              }),
                          );
                        } finally {
                          setCancelling(false);
                        }
                      }}
                    >
                      {intl.formatMessage({
                        id: 'account.subscription.cancel.cta',
                      })}
                    </Button>
                  </Space>
                </Space>
              )}
            </Card>

            <Card
              title={intl.formatMessage({
                id: 'account.subscription.plans.title',
              })}
              variant="borderless"
              style={{ borderRadius: 20 }}
            >
              {sortedPlans.length === 0 ? (
                <Empty
                  description={intl.formatMessage({
                    id: 'account.subscription.plans.empty',
                  })}
                />
              ) : (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {sortedPlans.map((plan) => {
                    const planId = String(plan.id);
                    const isCurrent = Boolean(
                      activePlanId && activePlanId === planId,
                    );
                    return (
                      <Card
                        key={planId}
                        size="small"
                        style={{ borderRadius: 12 }}
                        styles={{ body: { padding: 14 } }}
                      >
                        <Space
                          align="start"
                          style={{
                            width: '100%',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <Space align="center" size={8}>
                              <Title level={5} style={{ margin: 0 }}>
                                {plan.name || plan.code || `Plan ${planId}`}
                              </Title>
                              {isCurrent ? (
                                <Tag color="green">
                                  {intl.formatMessage({
                                    id: 'account.subscription.plans.current',
                                  })}
                                </Tag>
                              ) : null}
                            </Space>
                            <Paragraph
                              type="secondary"
                              style={{ marginBottom: 0 }}
                            >
                              {plan.description ||
                                intl.formatMessage({
                                  id: 'account.subscription.plans.noDescription',
                                })}
                            </Paragraph>
                            <Text strong>
                              {`${plan.amount ?? '-'} ${
                                plan.currency || ''
                              }`.trim()}{' '}
                              /{' '}
                              {plan.interval ||
                                intl.formatMessage({
                                  id: 'account.subscription.plans.interval.month',
                                })}
                            </Text>
                            {plan.wallet_address ? (
                              <Text
                                type="secondary"
                                style={{ display: 'block', marginTop: 4 }}
                              >
                                {intl.formatMessage({
                                  id: 'account.subscription.walletAddress',
                                })}
                                : {plan.wallet_address}
                              </Text>
                            ) : null}
                          </div>
                          <Space direction="vertical" size={8} align="end">
                            {plan.wallet_address ? (
                              <Button
                                icon={<QrcodeOutlined />}
                                onClick={() =>
                                  setQrPayload(
                                    String(plan.wallet_address || ''),
                                  )
                                }
                              >
                                {intl.formatMessage({
                                  id: 'account.subscription.qr.cta',
                                })}
                              </Button>
                            ) : null}
                            <Button
                              type={isCurrent ? 'default' : 'primary'}
                              icon={<DollarOutlined />}
                              loading={submittingPlanId === planId}
                              disabled={isCurrent}
                              onClick={async () => {
                                setSubmittingPlanId(planId);
                                try {
                                  const next = await createBillingSubscription({
                                    plan_id: plan.id,
                                  });
                                  setSubscription(next || null);
                                  message.success(
                                    intl.formatMessage({
                                      id: 'account.subscription.create.success',
                                    }),
                                  );
                                } catch (error: any) {
                                  message.error(
                                    error?.message ||
                                      intl.formatMessage({
                                        id: 'account.subscription.create.error',
                                      }),
                                  );
                                } finally {
                                  setSubmittingPlanId('');
                                }
                              }}
                            >
                              {intl.formatMessage({
                                id: 'account.subscription.create.cta',
                              })}
                            </Button>
                          </Space>
                        </Space>
                      </Card>
                    );
                  })}
                </Space>
              )}
            </Card>
          </>
        )}
      </Space>

      <Modal
        open={Boolean(qrPayload)}
        footer={null}
        onCancel={() => setQrPayload('')}
        title={intl.formatMessage({ id: 'account.subscription.qr.title' })}
      >
        <QrCodePanel
          payload={qrPayload}
          size={220}
          emptyText={intl.formatMessage({
            id: 'account.subscription.qr.empty',
          })}
        />
      </Modal>
    </PageContainer>
  );
}
