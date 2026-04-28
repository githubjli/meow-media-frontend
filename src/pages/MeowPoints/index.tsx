import PageIntroCard from '@/components/PageIntroCard';
import {
  getMeowPointLedger,
  getMeowPointPackages,
  getMeowPointWallet,
} from '@/services/meowPoints';
import type {
  MeowPointLedgerEntry,
  MeowPointPackage,
  MeowPointWallet,
} from '@/types/meowPoints';
import { DollarOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Text, Title } = Typography;

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveBalance = (wallet: MeowPointWallet | null) => {
  return toNumber(wallet?.balance ?? wallet?.available_balance) ?? 0;
};

const resolvePackagePoints = (item: MeowPointPackage) => {
  return (
    toNumber(item.total_points) ??
    (toNumber(item.points) ?? 0) + (toNumber(item.bonus_points) ?? 0)
  );
};

const resolveLedgerDelta = (row: MeowPointLedgerEntry) => {
  const value = toNumber(row.delta ?? row.amount) ?? 0;
  return value;
};

export default function MeowPointsPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const locale = intl.locale || 'en-US';

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [wallet, setWallet] = useState<MeowPointWallet | null>(null);
  const [packages, setPackages] = useState<MeowPointPackage[]>([]);
  const [ledger, setLedger] = useState<MeowPointLedgerEntry[]>([]);

  const formatNumber = (value: number | string | null | undefined) => {
    const parsed = toNumber(value);
    if (parsed === null) return '-';
    return new Intl.NumberFormat(locale).format(parsed);
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  };

  const walletStats = useMemo(
    () => [
      {
        key: 'total-purchased',
        label: intl.formatMessage({ id: 'meowPoints.wallet.totalPurchased' }),
        value: wallet?.total_purchased,
      },
      {
        key: 'total-bonus',
        label: intl.formatMessage({ id: 'meowPoints.wallet.totalBonus' }),
        value: wallet?.total_bonus,
      },
      {
        key: 'total-spent',
        label: intl.formatMessage({ id: 'meowPoints.wallet.totalSpent' }),
        value: wallet?.total_spent,
      },
    ],
    [intl, wallet?.total_bonus, wallet?.total_purchased, wallet?.total_spent],
  ).filter(
    (item) =>
      item.value !== undefined && item.value !== null && item.value !== '',
  );

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(`/login?redirect=${encodeURIComponent('/meow-points')}`);
      return;
    }

    if (!isLoggedIn) return;

    setLoading(true);
    setErrorMessage('');

    Promise.all([
      getMeowPointWallet(),
      getMeowPointPackages(),
      getMeowPointLedger({ page_size: 10 }),
    ])
      .then(([walletData, packageData, ledgerData]) => {
        setWallet(walletData || null);
        setPackages(packageData || []);
        setLedger(ledgerData || []);
      })
      .catch((error: any) => {
        setErrorMessage(
          error?.message || intl.formatMessage({ id: 'meowPoints.error.load' }),
        );
      })
      .finally(() => setLoading(false));
  }, [initialState?.authLoading, intl, isLoggedIn]);

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <PageIntroCard
          title={intl.formatMessage({ id: 'meowPoints.title' })}
          description={intl.formatMessage({ id: 'meowPoints.subtitle' })}
          extra={
            <Button icon={<DollarOutlined />} disabled>
              {intl.formatMessage({ id: 'meowPoints.actions.recharge' })}
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
              <Space direction="vertical" size={6}>
                <Text type="secondary">
                  {intl.formatMessage({
                    id: 'meowPoints.wallet.currentBalance',
                  })}
                </Text>
                <Title level={2} style={{ margin: 0 }}>
                  {formatNumber(resolveBalance(wallet))}
                </Title>
                {walletStats.length > 0 ? (
                  <Space wrap size={[16, 8]}>
                    {walletStats.map((item) => (
                      <Tag key={item.key} color="gold">
                        {item.label}: {formatNumber(item.value)}
                      </Tag>
                    ))}
                  </Space>
                ) : null}
              </Space>
            </Card>

            <Card
              title={intl.formatMessage({ id: 'meowPoints.packages.title' })}
              variant="borderless"
              style={{ borderRadius: 20 }}
            >
              {packages.length === 0 ? (
                <Empty
                  description={intl.formatMessage({
                    id: 'meowPoints.packages.empty',
                  })}
                />
              ) : (
                <Row gutter={[16, 16]}>
                  {packages.map((item) => (
                    <Col
                      xs={24}
                      sm={12}
                      md={8}
                      key={String(item.id || item.code || item.name)}
                    >
                      <Card size="small" style={{ borderRadius: 12 }}>
                        <Space
                          direction="vertical"
                          size={4}
                          style={{ width: '100%' }}
                        >
                          <Text strong>{item.title || item.name || '-'}</Text>
                          <Text type="secondary">
                            {item.description || '-'}
                          </Text>
                          <Text>
                            {intl.formatMessage({
                              id: 'meowPoints.packages.points',
                            })}
                            : {formatNumber(resolvePackagePoints(item))}
                          </Text>
                          <Text>
                            {intl.formatMessage({
                              id: 'meowPoints.packages.price',
                            })}
                            :{' '}
                            {item.price_thb !== undefined &&
                            item.price_thb !== null
                              ? `฿${item.price_thb}`
                              : `${item.price ?? '-'} ${
                                  item.currency || ''
                                }`.trim()}
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>

            <Card
              title={intl.formatMessage({ id: 'meowPoints.ledger.title' })}
              extra={
                <Button
                  type="link"
                  onClick={() => history.push('/meow-points/ledger')}
                >
                  {intl.formatMessage({ id: 'meowPoints.ledger.viewAll' })}
                </Button>
              }
              variant="borderless"
              style={{ borderRadius: 20 }}
            >
              {ledger.length === 0 ? (
                <Empty
                  description={intl.formatMessage({
                    id: 'meowPoints.ledger.empty',
                  })}
                />
              ) : (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  {ledger.map((entry) => {
                    const delta = resolveLedgerDelta(entry);
                    const isCredit = delta >= 0;
                    return (
                      <Card
                        key={String(
                          entry.id || `${entry.created_at}-${entry.reference}`,
                        )}
                        size="small"
                      >
                        <Space
                          direction="vertical"
                          size={2}
                          style={{ width: '100%' }}
                        >
                          <Space
                            style={{
                              width: '100%',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text strong>
                              {entry.description ||
                                entry.note ||
                                entry.type ||
                                entry.category ||
                                '-'}
                            </Text>
                            <Text type={isCredit ? 'success' : 'danger'}>
                              {isCredit ? '+' : ''}
                              {formatNumber(delta)}
                            </Text>
                          </Space>
                          <Text type="secondary">
                            {formatDateTime(entry.created_at)}
                          </Text>
                          {entry.balance_after !== undefined &&
                          entry.balance_after !== null ? (
                            <Text type="secondary">
                              {intl.formatMessage({
                                id: 'meowPoints.ledger.balanceAfter',
                              })}
                              : {formatNumber(entry.balance_after)}
                            </Text>
                          ) : null}
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
    </PageContainer>
  );
}
