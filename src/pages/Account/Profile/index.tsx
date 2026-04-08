import PageIntroCard from '@/components/PageIntroCard';
import {
  getAccountProfile,
  type AccountProfileResponse,
} from '@/services/accountProfile';
import {
  ShopOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Text, Paragraph, Title } = Typography;

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function AccountProfilePage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [profile, setProfile] = useState<AccountProfileResponse | null>(null);

  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(`/login?redirect=${encodeURIComponent('/profile')}`);
      return;
    }

    if (!isLoggedIn) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    getAccountProfile()
      .then((data) => setProfile(data || null))
      .catch((error: any) =>
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'account.profile.error.load' }),
        ),
      )
      .finally(() => setLoading(false));
  }, [initialState?.authLoading, intl, isLoggedIn]);

  const displayName =
    profile?.display_name ||
    [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    profile?.email ||
    intl.formatMessage({ id: 'account.profile.identity.fallbackName' });
  const secondaryIdentity =
    profile?.email && profile.email !== displayName ? profile.email : '';

  const isAdmin = Boolean(profile?.is_admin);
  const isCreator = Boolean(profile?.is_creator);
  const isSeller = Boolean(profile?.is_seller);
  const canCreateLive = Boolean(
    profile?.can_create_live || profile?.is_creator,
  );
  const canManageStore = Boolean(
    profile?.can_manage_store || profile?.seller_store,
  );
  const canAcceptPayments = Boolean(profile?.can_accept_payments);
  const hasStore = Boolean(profile?.seller_store);
  const sellerStore = profile?.seller_store || null;

  const profileTags = useMemo(() => {
    const tags = [];
    if (isCreator) {
      tags.push({
        key: 'creator',
        label: intl.formatMessage({ id: 'account.profile.role.creator' }),
      });
    }
    if (isSeller || hasStore || canManageStore) {
      tags.push({
        key: 'seller',
        label: intl.formatMessage({ id: 'account.profile.role.seller' }),
      });
    }
    if (isAdmin) {
      tags.push({
        key: 'admin',
        label: intl.formatMessage({ id: 'account.profile.role.admin' }),
      });
    }
    if (!tags.length) {
      tags.push({
        key: 'member',
        label: intl.formatMessage({ id: 'account.profile.role.member' }),
      });
    }
    return tags;
  }, [canManageStore, hasStore, intl, isAdmin, isCreator, isSeller]);

  const countCards = [
    {
      key: 'videos',
      label: intl.formatMessage({ id: 'account.profile.count.videos' }),
      value: toNumber(profile?.counts?.videos),
    },
    {
      key: 'liveSessions',
      label: intl.formatMessage({ id: 'account.profile.count.liveSessions' }),
      value: toNumber(profile?.counts?.live_streams),
    },
    {
      key: 'products',
      label: intl.formatMessage({ id: 'account.profile.count.products' }),
      value: toNumber(profile?.counts?.products),
    },
    {
      key: 'paymentMethods',
      label: intl.formatMessage({ id: 'account.profile.count.paymentMethods' }),
      value: toNumber(profile?.counts?.payment_methods),
    },
    {
      key: 'orders',
      label: intl.formatMessage({ id: 'account.profile.count.orders' }),
      value: toNumber(profile?.counts?.orders),
    },
  ];

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <PageIntroCard
          title={intl.formatMessage({ id: 'account.profile.title' })}
          description={intl.formatMessage({ id: 'account.profile.subtitle' })}
        />

        {errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}

        {loading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 7 }} />
          </Card>
        ) : !profile ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Empty
              description={intl.formatMessage({ id: 'account.profile.empty' })}
            />
          </Card>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Space size={14} align="start">
                <Avatar
                  size={64}
                  src={profile.avatar_url || profile.avatar || undefined}
                  icon={<UserOutlined />}
                />
                <Space direction="vertical" size={5}>
                  <Title level={4} style={{ margin: 0 }}>
                    {displayName}
                  </Title>
                  {secondaryIdentity ? (
                    <Text type="secondary">{secondaryIdentity}</Text>
                  ) : null}
                  {profile.bio ? (
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      {profile.bio}
                    </Paragraph>
                  ) : (
                    <Text type="secondary">
                      {intl.formatMessage({
                        id: 'account.profile.identity.noBio',
                      })}
                    </Text>
                  )}
                  <Space size={6} wrap>
                    {profileTags.map((item) => (
                      <Tag key={item.key} bordered={false} color="gold">
                        {item.label}
                      </Tag>
                    ))}
                  </Space>
                </Space>
              </Space>
            </Card>

            {hasStore ? (
              <Card
                title={intl.formatMessage({
                  id: 'account.profile.seller.title',
                })}
                variant="borderless"
                style={{ borderRadius: 20 }}
              >
                <Space direction="vertical" size={4}>
                  <Text strong>
                    {sellerStore?.name ||
                      intl.formatMessage({
                        id: 'account.profile.seller.fallbackName',
                      })}
                  </Text>
                  <Text type="secondary">
                    {sellerStore?.slug
                      ? `/${sellerStore.slug}`
                      : intl.formatMessage({
                          id: 'account.profile.seller.noSlug',
                        })}
                  </Text>
                </Space>
              </Card>
            ) : null}

            <Card
              title={intl.formatMessage({ id: 'account.profile.counts.title' })}
              variant="borderless"
              style={{ borderRadius: 20 }}
            >
              <Row gutter={[12, 12]}>
                {countCards.map((item) => (
                  <Col xs={12} md={6} key={item.key}>
                    <Card size="small" style={{ borderRadius: 12 }}>
                      <Text type="secondary">{item.label}</Text>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>
                        {item.value}
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            <Card
              title={intl.formatMessage({
                id: 'account.profile.quickActions.title',
              })}
              variant="borderless"
              style={{ borderRadius: 20 }}
            >
              <Space wrap>
                <Button onClick={() => history.push('/videos/mine')}>
                  {intl.formatMessage({ id: 'nav.myVideos' })}
                </Button>
                <Button onClick={() => history.push('/videos/upload')}>
                  {intl.formatMessage({ id: 'nav.uploadVideo' })}
                </Button>
                <Button
                  type="primary"
                  icon={<VideoCameraOutlined />}
                  disabled={!canCreateLive}
                  onClick={() =>
                    history.push(
                      isLoggedIn
                        ? '/live/create'
                        : `/login?redirect=${encodeURIComponent(
                            '/live/create',
                          )}`,
                    )
                  }
                >
                  {intl.formatMessage({ id: 'nav.goLive' })}
                </Button>
                {canManageStore ? (
                  <Button
                    icon={<ShopOutlined />}
                    onClick={() => history.push('/seller/store')}
                  >
                    {intl.formatMessage({ id: 'nav.myStore' })}
                  </Button>
                ) : null}
                {canAcceptPayments ? (
                  <Button
                    onClick={() => history.push('/account/payment-orders')}
                  >
                    {intl.formatMessage({ id: 'nav.myPaymentOrders' })}
                  </Button>
                ) : null}
              </Space>
            </Card>
          </Space>
        )}
      </Space>
    </PageContainer>
  );
}
