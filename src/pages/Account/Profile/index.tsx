import PageIntroCard from '@/components/PageIntroCard';
import {
  getAccountProfile,
  updateAccountProfile,
  type AccountProfileResponse,
} from '@/services/accountProfile';
import {
  DeleteOutlined,
  SaveOutlined,
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
  Divider,
  Empty,
  Form,
  Input,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Text, Paragraph, Title } = Typography;

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function AccountProfilePage() {
  const intl = useIntl();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [profile, setProfile] = useState<AccountProfileResponse | null>(null);
  const [form] = Form.useForm();
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null,
  );
  const [avatarRemoved, setAvatarRemoved] = useState(false);

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
      .then((data) => {
        setProfile(data || null);
        form.setFieldsValue({
          display_name: data?.display_name || '',
          bio: data?.bio || '',
        });
      })
      .catch((error: any) =>
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'account.profile.error.load' }),
        ),
      )
      .finally(() => setLoading(false));
  }, [form, initialState?.authLoading, intl, isLoggedIn]);

  const displayName =
    profile?.display_name ||
    profile?.username ||
    profile?.email ||
    intl.formatMessage({ id: 'account.profile.identity.fallbackName' });
  const secondaryIdentity =
    profile?.email && profile.email !== displayName ? profile.email : '';
  const avatarPreview = useMemo(() => {
    if (!selectedAvatarFile) {
      return avatarRemoved
        ? undefined
        : profile?.avatar_url || profile?.avatar || undefined;
    }
    return URL.createObjectURL(selectedAvatarFile);
  }, [avatarRemoved, profile?.avatar, profile?.avatar_url, selectedAvatarFile]);

  useEffect(() => {
    return () => {
      if (selectedAvatarFile && avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview, selectedAvatarFile]);

  const isAdmin = Boolean(profile?.is_admin);
  const isCreator = Boolean(profile?.is_creator);
  const isSeller = Boolean(profile?.is_seller);
  const canCreateLive = Boolean(
    profile?.can_create_live || profile?.is_creator,
  );
  const canUseGoLive = isLoggedIn ? canCreateLive : true;
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

  const handleSaveProfile = async (values: {
    display_name?: string;
    bio?: string;
  }) => {
    setSaving(true);
    try {
      const updated = await updateAccountProfile({
        display_name: values.display_name || '',
        bio: values.bio || '',
        avatar: avatarRemoved ? null : selectedAvatarFile,
        avatar_clear: avatarRemoved,
      });
      const mergedProfile = {
        ...(profile || {}),
        ...(updated || {}),
        avatar_url:
          updated?.avatar_url ??
          updated?.avatar ??
          profile?.avatar_url ??
          profile?.avatar ??
          null,
        avatar:
          updated?.avatar ??
          updated?.avatar_url ??
          profile?.avatar ??
          profile?.avatar_url ??
          null,
      } as AccountProfileResponse;
      setProfile(mergedProfile);
      await setInitialState((prev) => ({
        ...prev,
        currentUser: {
          ...(prev?.currentUser || {}),
          display_name:
            updated?.display_name ?? profile?.display_name ?? undefined,
          username: updated?.username ?? profile?.username ?? undefined,
          bio: updated?.bio ?? profile?.bio ?? undefined,
          avatar_url:
            updated?.avatar_url ??
            updated?.avatar ??
            profile?.avatar_url ??
            profile?.avatar ??
            undefined,
        },
      }));
      form.setFieldsValue({
        display_name: mergedProfile?.display_name || '',
        bio: mergedProfile?.bio || '',
      });
      setSelectedAvatarFile(null);
      setAvatarRemoved(false);
      message.success(
        intl.formatMessage({ id: 'account.profile.edit.success' }),
      );
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'account.profile.edit.error' }),
      );
    } finally {
      setSaving(false);
    }
  };

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
                  {profile.email && profile.email !== displayName ? (
                    <Text type="secondary">
                      {intl.formatMessage({
                        id: 'account.profile.identity.email',
                      })}
                      : {profile.email}
                    </Text>
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
              title={intl.formatMessage({ id: 'account.profile.edit.title' })}
              variant="borderless"
              style={{ borderRadius: 20 }}
            >
              <Form
                layout="vertical"
                form={form}
                onFinish={handleSaveProfile}
                initialValues={{
                  display_name: profile?.display_name || '',
                  bio: profile?.bio || '',
                }}
              >
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  <Space align="center" size={16}>
                    <Avatar
                      size={56}
                      src={avatarPreview}
                      icon={<UserOutlined />}
                    />
                    <Space wrap>
                      <Upload
                        showUploadList={false}
                        accept="image/*"
                        beforeUpload={(file) => {
                          setSelectedAvatarFile(file);
                          setAvatarRemoved(false);
                          return false;
                        }}
                      >
                        <Button>
                          {intl.formatMessage({
                            id: 'account.profile.avatar.change',
                          })}
                        </Button>
                      </Upload>
                      <Button
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          setSelectedAvatarFile(null);
                          setAvatarRemoved(true);
                        }}
                      >
                        {intl.formatMessage({
                          id: 'account.profile.avatar.remove',
                        })}
                      </Button>
                    </Space>
                  </Space>

                  <Form.Item
                    name="display_name"
                    label={intl.formatMessage({
                      id: 'account.profile.edit.displayName',
                    })}
                  >
                    <Input
                      placeholder={intl.formatMessage({
                        id: 'account.profile.edit.displayName.placeholder',
                      })}
                    />
                  </Form.Item>
                  <Form.Item
                    name="bio"
                    label={intl.formatMessage({
                      id: 'account.profile.edit.bio',
                    })}
                  >
                    <Input.TextArea
                      rows={3}
                      placeholder={intl.formatMessage({
                        id: 'account.profile.edit.bio.placeholder',
                      })}
                    />
                  </Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={saving}
                    >
                      {intl.formatMessage({ id: 'account.profile.edit.save' })}
                    </Button>
                    <Button
                      onClick={() => {
                        form.setFieldsValue({
                          display_name: profile?.display_name || '',
                          bio: profile?.bio || '',
                        });
                        setSelectedAvatarFile(null);
                        setAvatarRemoved(false);
                      }}
                    >
                      {intl.formatMessage({
                        id: 'account.profile.edit.cancel',
                      })}
                    </Button>
                  </Space>
                </Space>
              </Form>
            </Card>

            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <Text strong>
                  {intl.formatMessage({ id: 'account.profile.counts.title' })}
                </Text>
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

                <Divider style={{ margin: '2px 0' }} />

                <Text strong>
                  {intl.formatMessage({
                    id: 'account.profile.quickActions.title',
                  })}
                </Text>
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
                    disabled={!canUseGoLive}
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
              </Space>
            </Card>
          </Space>
        )}
      </Space>
    </PageContainer>
  );
}
