import PageIntroCard from '@/components/PageIntroCard';
import QrCodePanel from '@/components/QrCodePanel';
import {
  getAccountProfile,
  updateAccountProfile,
  type AccountProfileResponse,
} from '@/services/accountProfile';
import {
  createMembershipOrder,
  getMembershipOrder,
  getMyMembershipStatus,
  listMembershipPlans,
  type MembershipOrder,
  type MembershipPlan,
  type MembershipStatus,
} from '@/services/membership';
import { runWalletPrototypePaymentFlow } from '@/services/walletPrototype';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Text, Title, Paragraph } = Typography;
const ORDER_POLL_INTERVAL_MS = 4000;

const formatDateTime = (locale: string, value?: string | null) => {
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

const formatCountdown = (expiresAt?: string | null) => {
  if (!expiresAt) return '--:--';
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return '--:--';
  const diffMs = Math.max(expiresMs - Date.now(), 0);
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}`;
};

const normalizeOrderStatus = (status?: string) =>
  String(status || 'pending').toLowerCase();

const getOrderStatusPresentation = (intl: any, status?: string) => {
  const normalized = normalizeOrderStatus(status);
  if (normalized === 'paid') {
    return {
      color: 'success' as const,
      icon: <CheckCircleOutlined />,
      text: intl.formatMessage({
        id: 'account.subscription.order.status.paid',
      }),
    };
  }

  if (
    normalized === 'paid_after_expiry' ||
    normalized === 'paid_after_expired' ||
    normalized === 'paid_after_expire'
  ) {
    return {
      color: 'warning' as const,
      icon: <ExclamationCircleOutlined />,
      text: intl.formatMessage({
        id: 'account.subscription.order.status.paidAfterExpiry',
      }),
    };
  }

  if (normalized === 'underpaid') {
    return {
      color: 'warning' as const,
      icon: <ExclamationCircleOutlined />,
      text: intl.formatMessage({
        id: 'account.subscription.order.status.underpaid',
      }),
    };
  }

  if (normalized === 'overpaid') {
    return {
      color: 'processing' as const,
      icon: <ExclamationCircleOutlined />,
      text: intl.formatMessage({
        id: 'account.subscription.order.status.overpaid',
      }),
    };
  }

  if (normalized === 'expired') {
    return {
      color: 'default' as const,
      icon: <ClockCircleOutlined />,
      text: intl.formatMessage({
        id: 'account.subscription.order.status.expired',
      }),
    };
  }

  return {
    color: 'processing' as const,
    icon: <ClockCircleOutlined />,
    text: intl.formatMessage({
      id: 'account.subscription.order.status.pending',
    }),
  };
};

const shouldPollOrder = (status?: string) => {
  const normalized = normalizeOrderStatus(status);
  return (
    normalized === 'pending' ||
    normalized === 'underpaid' ||
    normalized === 'overpaid'
  );
};

const getMembershipActive = (membership: MembershipStatus | null) => {
  if (!membership) return false;
  if (typeof membership.is_active === 'boolean') return membership.is_active;
  const status = String(membership.status || '').toLowerCase();
  return status === 'active' || status === 'valid';
};

const resolvePlanSettlementCurrency = (plan: MembershipPlan) =>
  String(
    plan.settlement_currency || plan.payment_currency || plan.currency || 'LTT',
  ).toUpperCase();

const resolvePlanDisplayPrice = (plan: MembershipPlan) => {
  const thbValue =
    plan.price_thb ||
    plan.display_price_thb ||
    plan.price_fiat_thb ||
    plan.thb_price;

  if (thbValue !== undefined && thbValue !== null && thbValue !== '') {
    return {
      labelKey: 'account.subscription.plan.price',
      value: `฿${thbValue}`,
      hasThb: true,
    };
  }

  return {
    labelKey: 'account.subscription.plan.price',
    value: `${plan.price_lbc ?? '-'} ${resolvePlanSettlementCurrency(plan)}`,
    hasThb: false,
  };
};

export default function AccountSubscriptionPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [plansLoading, setPlansLoading] = useState(true);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [profile, setProfile] = useState<AccountProfileResponse | null>(null);
  const [linkedWalletIdInput, setLinkedWalletIdInput] = useState('');
  const [primaryUserAddressInput, setPrimaryUserAddressInput] = useState('');
  const [submittingPlanId, setSubmittingPlanId] = useState<string>('');
  const [orderUiOpen, setOrderUiOpen] = useState(false);
  const [currentOrderNo, setCurrentOrderNo] = useState('');
  const [currentOrder, setCurrentOrder] = useState<MembershipOrder | null>(
    null,
  );
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [copyAddressCopied, setCopyAddressCopied] = useState(false);
  const [expiresCountdown, setExpiresCountdown] = useState('--:--');
  const [walletUnlockPassword, setWalletUnlockPassword] = useState('');
  const [sendingPayment, setSendingPayment] = useState(false);
  const [capturedTxid, setCapturedTxid] = useState('');
  const [txHintState, setTxHintState] = useState<
    'idle' | 'submitted' | 'failed'
  >('idle');
  const [txHintError, setTxHintError] = useState('');
  const [walletRelockWarning, setWalletRelockWarning] = useState('');

  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const locale = intl.locale || 'en-US';

  const loadMembershipStatus = async () => {
    setMembershipLoading(true);
    try {
      const payload = await getMyMembershipStatus().catch(() => null);
      setMembership(payload || null);
    } finally {
      setMembershipLoading(false);
    }
  };

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const payload = await getAccountProfile();
      setProfile(payload || null);
      setLinkedWalletIdInput(String(payload?.linked_wallet_id || ''));
      setPrimaryUserAddressInput(String(payload?.primary_user_address || ''));
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          intl.formatMessage({ id: 'account.subscription.error.load' }),
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const loadPlans = async () => {
    setPlansLoading(true);
    setErrorMessage('');
    try {
      const plansData = await listMembershipPlans();
      setPlans(plansData || []);
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          intl.formatMessage({ id: 'account.subscription.error.load' }),
      );
    } finally {
      setPlansLoading(false);
    }
  };

  const loadPageData = async () => {
    await Promise.all([loadPlans(), loadMembershipStatus(), loadProfile()]);
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

    loadPageData();
  }, [initialState?.authLoading, isLoggedIn]);

  useEffect(() => {
    if (!orderUiOpen || !currentOrder?.expires_at) {
      setExpiresCountdown('--:--');
      return;
    }

    setExpiresCountdown(formatCountdown(currentOrder.expires_at));
    const timer = window.setInterval(() => {
      setExpiresCountdown(formatCountdown(currentOrder.expires_at));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [orderUiOpen, currentOrder?.expires_at]);

  useEffect(() => {
    if (!orderUiOpen || !currentOrderNo) return;

    const poll = async () => {
      try {
        const latestOrder = await getMembershipOrder(currentOrderNo);
        setCurrentOrder(latestOrder);
        setOrderError('');
        const latestStatus = normalizeOrderStatus(latestOrder?.status);
        if (latestStatus === 'paid' || latestStatus === 'overpaid') {
          await loadMembershipStatus();
        }
      } catch (error: any) {
        setOrderError(
          error?.message ||
            intl.formatMessage({ id: 'account.subscription.order.poll.error' }),
        );
      }
    };

    poll();
    const timer = window.setInterval(() => {
      if (shouldPollOrder(currentOrder?.status)) {
        poll();
      }
    }, ORDER_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [orderUiOpen, currentOrderNo, currentOrder?.status, intl]);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort(
        (a, b) => Number(a.price_lbc || 0) - Number(b.price_lbc || 0),
      ),
    [plans],
  );

  const membershipActive = getMembershipActive(membership);
  const membershipPlanName =
    membership?.plan_name ||
    membership?.plan?.name ||
    intl.formatMessage({ id: 'account.subscription.current.unknownPlan' });
  const orderStatusPresentation = getOrderStatusPresentation(
    intl,
    currentOrder?.status,
  );

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
              onClick={loadPageData}
              loading={plansLoading || membershipLoading || profileLoading}
            >
              {intl.formatMessage({ id: 'common.refresh' })}
            </Button>
          }
        />

        {errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}

        <Card
          title={intl.formatMessage({
            id: 'account.subscription.current.title',
          })}
          variant="borderless"
          style={{ borderRadius: 20 }}
          loading={membershipLoading}
        >
          {!membership ? (
            <Empty
              description={intl.formatMessage({
                id: 'account.subscription.current.empty',
              })}
            />
          ) : (
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Title level={5} style={{ margin: 0 }}>
                {membershipPlanName}
              </Title>
              <Space wrap>
                <Tag color={membershipActive ? 'green' : 'default'}>
                  {String(membership?.status || '-').toUpperCase()}
                </Tag>
                {typeof membership.remaining_days === 'number' ? (
                  <Tag color="blue">
                    {intl.formatMessage(
                      { id: 'account.subscription.current.remainingDays' },
                      { days: membership.remaining_days },
                    )}
                  </Tag>
                ) : null}
              </Space>
              <Text type="secondary">
                {intl.formatMessage({
                  id: 'account.subscription.current.validUntil',
                })}
                : {formatDateTime(locale, membership.valid_until)}
              </Text>
            </Space>
          )}
        </Card>

        <Card
          title={intl.formatMessage({
            id: 'account.subscription.wallet.title',
          })}
          variant="borderless"
          style={{ borderRadius: 20 }}
          loading={profileLoading}
          extra={
            <Button
              icon={<SafetyCertificateOutlined />}
              loading={profileSaving}
              onClick={async () => {
                setProfileSaving(true);
                try {
                  const updated = await updateAccountProfile({
                    linked_wallet_id: linkedWalletIdInput,
                    primary_user_address: primaryUserAddressInput,
                  });
                  setProfile(updated || profile);
                  message.success(
                    intl.formatMessage({
                      id: 'account.subscription.wallet.save.success',
                    }),
                  );
                } catch (error: any) {
                  message.error(
                    error?.message ||
                      intl.formatMessage({
                        id: 'account.subscription.wallet.save.error',
                      }),
                  );
                } finally {
                  setProfileSaving(false);
                }
              }}
            >
              {intl.formatMessage({ id: 'common.save' })}
            </Button>
          }
        >
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Text type="secondary">
              {intl.formatMessage({
                id: 'account.subscription.wallet.link.status',
              })}
              : {profile?.wallet_link_status || '-'}
            </Text>
            <Text type="secondary">
              {intl.formatMessage({
                id: 'account.subscription.wallet.linkedAt',
              })}
              : {formatDateTime(locale, profile?.linked_at)}
            </Text>
            <Input
              prefix={<WalletOutlined />}
              value={linkedWalletIdInput}
              onChange={(event) => setLinkedWalletIdInput(event.target.value)}
              placeholder={intl.formatMessage({
                id: 'account.subscription.wallet.linkedWallet.placeholder',
              })}
            />
            <Input
              prefix={<WalletOutlined />}
              value={primaryUserAddressInput}
              onChange={(event) =>
                setPrimaryUserAddressInput(event.target.value)
              }
              placeholder={intl.formatMessage({
                id: 'account.subscription.wallet.primaryAddress.placeholder',
              })}
            />
          </Space>
        </Card>

        {plansLoading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </Card>
        ) : (
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
                              {plan.name || `Plan ${planId}`}
                            </Title>
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
                            {intl.formatMessage({
                              id: 'account.subscription.plan.price',
                            })}
                            : {resolvePlanDisplayPrice(plan).value}
                          </Text>
                          <Text type="secondary" style={{ display: 'block' }}>
                            {intl.formatMessage({
                              id: 'account.subscription.plan.duration',
                            })}
                            :{' '}
                            {intl.formatMessage(
                              {
                                id: 'account.subscription.plan.durationDays',
                              },
                              { days: plan.duration_days ?? '-' },
                            )}
                          </Text>
                          <Text type="secondary" style={{ display: 'block' }}>
                            {intl.formatMessage({
                              id: 'account.subscription.plan.payWithLtt',
                            })}
                          </Text>
                          <Text type="secondary" style={{ display: 'block' }}>
                            {intl.formatMessage({
                              id: 'account.subscription.plan.settlementCurrency',
                            })}
                            : {resolvePlanSettlementCurrency(plan)}
                          </Text>
                          {resolvePlanDisplayPrice(plan).hasThb ? (
                            <Text type="secondary" style={{ display: 'block' }}>
                              {intl.formatMessage({
                                id: 'account.subscription.plan.thb',
                              })}
                            </Text>
                          ) : null}
                        </div>
                        <Space direction="vertical" size={8} align="end">
                          <Button
                            type="primary"
                            icon={<DollarOutlined />}
                            loading={submittingPlanId === planId}
                            onClick={async () => {
                              setSubmittingPlanId(planId);
                              setOrderError('');
                              setCapturedTxid('');
                              setTxHintError('');
                              setWalletRelockWarning('');
                              setTxHintState('idle');
                              try {
                                if (!plan.code) {
                                  throw new Error(
                                    intl.formatMessage({
                                      id: 'account.subscription.create.error',
                                    }),
                                  );
                                }

                                const createdOrder =
                                  await createMembershipOrder({
                                    plan_code: String(plan.code),
                                  });
                                setCurrentOrder(createdOrder || null);
                                setCurrentOrderNo(
                                  String(createdOrder?.order_no || ''),
                                );
                                setCopyAddressCopied(false);
                                setOrderUiOpen(true);
                              } catch (error: any) {
                                const errorText =
                                  error?.message ||
                                  intl.formatMessage({
                                    id: 'account.subscription.create.error',
                                  });
                                setOrderError(errorText);
                                message.error(errorText);
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
        )}
      </Space>

      <Modal
        open={orderUiOpen}
        onCancel={() => {
          setOrderUiOpen(false);
          setOrderError('');
          setWalletUnlockPassword('');
        }}
        footer={null}
        title={intl.formatMessage({ id: 'account.subscription.order.title' })}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {orderError ? (
            <Alert type="warning" showIcon message={orderError} />
          ) : null}
          {orderLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : !currentOrder ? (
            <Empty
              description={intl.formatMessage({
                id: 'account.subscription.order.empty',
              })}
            />
          ) : (
            <>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Title level={5} style={{ margin: 0 }}>
                  {currentOrder.plan?.name ||
                    currentOrder.plan_name ||
                    intl.formatMessage({
                      id: 'account.subscription.current.unknownPlan',
                    })}
                </Title>
                <Space wrap>
                  <Tag
                    color={orderStatusPresentation.color}
                    icon={orderStatusPresentation.icon}
                  >
                    {orderStatusPresentation.text}
                  </Tag>
                  <Tag>{`#${currentOrder.order_no}`}</Tag>
                </Space>
                <Text>
                  {intl.formatMessage({
                    id: 'account.subscription.order.amount',
                  })}
                  :{' '}
                  <Text strong>{currentOrder.expected_amount_lbc ?? '-'}</Text>
                </Text>
                {currentOrder.actual_amount ? (
                  <Text>
                    {intl.formatMessage({
                      id: 'account.subscription.order.actualAmount',
                    })}
                    : <Text strong>{currentOrder.actual_amount}</Text>
                  </Text>
                ) : null}
                <Text>
                  {intl.formatMessage({
                    id: 'account.subscription.order.expiresIn',
                  })}
                  : <Text strong>{expiresCountdown}</Text>
                </Text>
                {currentOrder.paid_at ? (
                  <Text>
                    {intl.formatMessage({
                      id: 'account.subscription.order.paidAt',
                    })}
                    :{' '}
                    <Text strong>
                      {formatDateTime(locale, currentOrder.paid_at)}
                    </Text>
                  </Text>
                ) : null}
                {currentOrder.txid || capturedTxid ? (
                  <Text>
                    {intl.formatMessage({
                      id: 'account.subscription.order.txid',
                    })}
                    : <Text code>{currentOrder.txid || capturedTxid}</Text>
                  </Text>
                ) : null}
                {typeof currentOrder.confirmations === 'number' ? (
                  <Text>
                    {intl.formatMessage({
                      id: 'account.subscription.order.confirmations',
                    })}
                    : <Text strong>{currentOrder.confirmations}</Text>
                  </Text>
                ) : null}
              </Space>

              <Alert
                type={
                  normalizeOrderStatus(currentOrder.status) === 'paid' ||
                  normalizeOrderStatus(currentOrder.status) === 'overpaid'
                    ? 'success'
                    : 'info'
                }
                showIcon
                message={intl.formatMessage({
                  id: 'account.subscription.order.waitingMessage',
                })}
                description={formatDateTime(locale, currentOrder.expires_at)}
              />

              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text strong>
                  {intl.formatMessage({
                    id: 'account.subscription.order.address',
                  })}
                </Text>
                <Text copyable={false} style={{ wordBreak: 'break-all' }}>
                  {currentOrder.pay_to_address || '-'}
                </Text>
                <Button
                  icon={<CopyOutlined />}
                  disabled={!currentOrder.pay_to_address}
                  onClick={async () => {
                    if (!currentOrder.pay_to_address) return;
                    await navigator.clipboard.writeText(
                      currentOrder.pay_to_address,
                    );
                    setCopyAddressCopied(true);
                    message.success(
                      intl.formatMessage({
                        id: 'account.subscription.order.copy.success',
                      }),
                    );
                  }}
                >
                  {copyAddressCopied
                    ? intl.formatMessage({
                        id: 'account.subscription.order.copy.copied',
                      })
                    : intl.formatMessage({
                        id: 'account.subscription.order.copy.cta',
                      })}
                </Button>
              </Space>

              <Card size="small" style={{ borderRadius: 12 }}>
                <QrCodePanel
                  payload={
                    currentOrder.qr_text || currentOrder.pay_to_address || ''
                  }
                  size={220}
                  emptyText={intl.formatMessage({
                    id: 'account.subscription.qr.empty',
                  })}
                />
              </Card>

              <Card
                size="small"
                style={{ borderRadius: 12 }}
                title={intl.formatMessage({
                  id: 'account.subscription.wallet.auth.title',
                })}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text>
                    {intl.formatMessage({
                      id: 'account.subscription.wallet.linkedWallet',
                    })}
                    : <Text strong>{profile?.linked_wallet_id || '-'}</Text>
                  </Text>
                  <Text>
                    {intl.formatMessage({
                      id: 'account.subscription.wallet.primaryAddress',
                    })}
                    : <Text strong>{profile?.primary_user_address || '-'}</Text>
                  </Text>
                  <Alert
                    type="info"
                    showIcon
                    message={intl.formatMessage({
                      id: 'account.subscription.wallet.platformAddress.notice',
                    })}
                  />
                  <Input.Password
                    value={walletUnlockPassword}
                    onChange={(event) =>
                      setWalletUnlockPassword(event.target.value)
                    }
                    placeholder={intl.formatMessage({
                      id: 'account.subscription.wallet.unlock.placeholder',
                    })}
                    prefix={<LockOutlined />}
                  />
                  <Button
                    type="default"
                    icon={<WalletOutlined />}
                    loading={sendingPayment}
                    disabled={
                      !walletUnlockPassword ||
                      !currentOrder.pay_to_address ||
                      !currentOrder.expected_amount_lbc
                    }
                    onClick={async () => {
                      if (
                        !currentOrder.order_no ||
                        !currentOrder.pay_to_address
                      ) {
                        return;
                      }

                      setSendingPayment(true);
                      setTxHintError('');
                      setWalletRelockWarning('');
                      setTxHintState('idle');
                      try {
                        const paymentResult =
                          await runWalletPrototypePaymentFlow({
                            order_no: String(currentOrder.order_no),
                            wallet_id: String(profile?.linked_wallet_id || ''),
                            password: walletUnlockPassword,
                          });

                        if (paymentResult?.txid) {
                          setCapturedTxid(String(paymentResult.txid));
                        }
                        setTxHintState('submitted');
                        message.success(
                          intl.formatMessage({
                            id: 'account.subscription.wallet.txSubmitted',
                          }),
                        );

                        if (paymentResult?.wallet_relocked) {
                          message.success(
                            intl.formatMessage({
                              id: 'account.subscription.wallet.relocked',
                            }),
                          );
                        }

                        if (
                          paymentResult?.relock_warning ||
                          paymentResult?.warning
                        ) {
                          setWalletRelockWarning(
                            String(
                              paymentResult?.relock_warning ||
                                paymentResult?.warning ||
                                intl.formatMessage({
                                  id: 'account.subscription.wallet.relockWarning',
                                }),
                            ),
                          );
                        }

                        const latestOrder = await getMembershipOrder(
                          currentOrder.order_no,
                        );
                        setCurrentOrder(latestOrder);
                      } catch (error: any) {
                        setTxHintState('failed');
                        setTxHintError(
                          error?.message ||
                            intl.formatMessage({
                              id: 'account.subscription.wallet.paymentSubmissionFailed',
                            }),
                        );
                      } finally {
                        setWalletUnlockPassword('');
                        setSendingPayment(false);
                      }
                    }}
                  >
                    {intl.formatMessage({
                      id: 'account.subscription.wallet.sendPayment',
                    })}
                  </Button>

                  {capturedTxid ? (
                    <Alert
                      type="info"
                      showIcon
                      message={intl.formatMessage({
                        id: 'account.subscription.wallet.waitingBackendVerification',
                      })}
                      description={capturedTxid}
                    />
                  ) : null}
                  {txHintState === 'submitted' ? (
                    <Alert
                      type="success"
                      showIcon
                      message={intl.formatMessage({
                        id: 'account.subscription.wallet.submittingPayment',
                      })}
                    />
                  ) : null}
                  {txHintState === 'failed' ? (
                    <Alert type="warning" showIcon message={txHintError} />
                  ) : null}
                  {walletRelockWarning ? (
                    <Alert
                      type="warning"
                      showIcon
                      message={walletRelockWarning}
                    />
                  ) : null}
                </Space>
              </Card>

              {normalizeOrderStatus(currentOrder.status) === 'expired' ? (
                <Alert
                  type="warning"
                  showIcon
                  message={intl.formatMessage({
                    id: 'account.subscription.order.expired.recreate',
                  })}
                />
              ) : null}

              {normalizeOrderStatus(currentOrder.status) === 'paid' ||
              normalizeOrderStatus(currentOrder.status) === 'overpaid' ? (
                <Alert
                  type="success"
                  showIcon
                  message={intl.formatMessage({
                    id: 'account.subscription.wallet.backendConfirmed',
                  })}
                />
              ) : null}

              <Alert
                type="info"
                showIcon
                message={intl.formatMessage({
                  id: 'account.subscription.wallet.doNotClose',
                })}
              />

              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={async () => {
                    if (!currentOrder.order_no) return;
                    setOrderLoading(true);
                    try {
                      const latestOrder = await getMembershipOrder(
                        currentOrder.order_no,
                      );
                      setCurrentOrder(latestOrder);
                    } catch (error: any) {
                      setOrderError(
                        error?.message ||
                          intl.formatMessage({
                            id: 'account.subscription.order.poll.error',
                          }),
                      );
                    } finally {
                      setOrderLoading(false);
                    }
                  }}
                >
                  {intl.formatMessage({ id: 'common.refresh' })}
                </Button>
                <Button onClick={() => setOrderUiOpen(false)}>
                  {intl.formatMessage({ id: 'common.cancel' })}
                </Button>
              </Space>
            </>
          )}
        </Space>
      </Modal>
    </PageContainer>
  );
}
