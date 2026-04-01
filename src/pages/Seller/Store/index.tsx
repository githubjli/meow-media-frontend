import { createMyStore, getMyStore, updateMyStore } from '@/services/store';
import type { SellerStore } from '@/types/store';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Skeleton,
  Space,
  Switch,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

const { Text, Title } = Typography;

export default function SellerStorePage() {
  const intl = useIntl();
  const location = useLocation();
  const { initialState, setInitialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<SellerStore | null>(null);
  const [storeMissing, setStoreMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  useEffect(() => {
    if (!isLoggedIn) {
      history.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    let active = true;

    getMyStore()
      .then((data) => {
        if (!active) return;
        setStore(data);
        setStoreMissing(false);
      })
      .catch((error: any) => {
        if (!active) return;

        if (error?.status === 404) {
          setStore(null);
          setStoreMissing(true);
          return;
        }

        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'seller.store.error.load' }),
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [intl, isLoggedIn, location.pathname]);

  const onSubmit = async (values: Partial<SellerStore>) => {
    setSaving(true);
    setErrorMessage('');
    try {
      const next = storeMissing
        ? await createMyStore(values)
        : await updateMyStore(values);
      setStore(next);
      setStoreMissing(false);
      setInitialState((prev: any) => ({ ...prev, sellerHasStore: true }));
      message.success(
        intl.formatMessage({
          id: storeMissing ? 'seller.store.created' : 'seller.store.updated',
        }),
      );
    } catch (error: any) {
      setErrorMessage(
        error?.message || intl.formatMessage({ id: 'seller.store.error.save' }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>
                {intl.formatMessage({ id: 'seller.store.title' })}
              </Title>
              <Text type="secondary">
                {intl.formatMessage({
                  id: storeMissing
                    ? 'seller.store.subtitle.create'
                    : 'seller.store.subtitle.edit',
                })}
              </Text>
            </div>

            {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}

            {!loading && errorMessage ? (
              <Alert type="error" showIcon message={errorMessage} />
            ) : null}

            {!loading ? (
              <Form
                layout="vertical"
                initialValues={{
                  name: store?.name,
                  slug: store?.slug,
                  description: store?.description,
                  logo: store?.logo || '',
                  banner: store?.banner || '',
                  is_active: store?.is_active ?? true,
                }}
                onFinish={onSubmit}
              >
                <Form.Item
                  name="name"
                  label={intl.formatMessage({ id: 'seller.store.fields.name' })}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="slug"
                  label={intl.formatMessage({ id: 'seller.store.fields.slug' })}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="description"
                  label={intl.formatMessage({
                    id: 'seller.store.fields.description',
                  })}
                >
                  <Input.TextArea rows={4} />
                </Form.Item>
                <Form.Item
                  name="logo"
                  label={intl.formatMessage({ id: 'seller.store.fields.logo' })}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="banner"
                  label={intl.formatMessage({
                    id: 'seller.store.fields.banner',
                  })}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="is_active"
                  valuePropName="checked"
                  label={intl.formatMessage({
                    id: 'seller.store.fields.active',
                  })}
                >
                  <Switch />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={saving}>
                  {intl.formatMessage({
                    id: storeMissing
                      ? 'seller.store.actions.create'
                      : 'seller.store.actions.update',
                  })}
                </Button>
              </Form>
            ) : null}
          </Space>
        </Card>
      </div>
    </PageContainer>
  );
}
