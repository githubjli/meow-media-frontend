import { createMyStore, getMyStore, updateMyStore } from '@/services/store';
import type { SellerStore } from '@/types/store';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  Image,
  Input,
  Skeleton,
  Space,
  Switch,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
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
  const [logoFileList, setLogoFileList] = useState<UploadFile[]>([]);
  const [bannerFileList, setBannerFileList] = useState<UploadFile[]>([]);

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
      const payload: Partial<SellerStore> = {
        name: values.name,
        slug: values.slug,
        description: values.description,
        is_active: values.is_active,
      };
      const logoFile = logoFileList[0]?.originFileObj;
      const bannerFile = bannerFileList[0]?.originFileObj;
      if (logoFile) {
        payload.logo = logoFile as File;
      }
      if (bannerFile) {
        payload.banner = bannerFile as File;
      }

      const next = storeMissing
        ? await createMyStore(payload)
        : await updateMyStore(payload);
      setStore(next);
      setStoreMissing(false);
      setInitialState((prev: any) => ({ ...prev, sellerHasStore: true }));
      message.success(
        intl.formatMessage({
          id: storeMissing ? 'seller.store.created' : 'seller.store.updated',
        }),
      );
    } catch (error: any) {
      const fieldError = extractFieldErrorMessage(error?.data);
      setErrorMessage(
        fieldError ||
          error?.message ||
          intl.formatMessage({ id: 'seller.store.error.save' }),
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
                  label={intl.formatMessage({ id: 'seller.store.fields.logo' })}
                >
                  {typeof store?.logo === 'string' && store.logo ? (
                    <Image
                      src={store.logo}
                      alt="store-logo"
                      width={96}
                      style={{ borderRadius: 8, marginBottom: 8 }}
                    />
                  ) : null}
                  <Upload
                    maxCount={1}
                    beforeUpload={() => false}
                    fileList={logoFileList}
                    onChange={({ fileList }) => setLogoFileList(fileList)}
                    accept="image/*"
                  >
                    <Button>
                      {intl.formatMessage({ id: 'common.upload' })}
                    </Button>
                  </Upload>
                </Form.Item>
                <Form.Item
                  label={intl.formatMessage({
                    id: 'seller.store.fields.banner',
                  })}
                >
                  {typeof store?.banner === 'string' && store.banner ? (
                    <Image
                      src={store.banner}
                      alt="store-banner"
                      width={180}
                      style={{ borderRadius: 8, marginBottom: 8 }}
                    />
                  ) : null}
                  <Upload
                    maxCount={1}
                    beforeUpload={() => false}
                    fileList={bannerFileList}
                    onChange={({ fileList }) => setBannerFileList(fileList)}
                    accept="image/*"
                  >
                    <Button>
                      {intl.formatMessage({ id: 'common.upload' })}
                    </Button>
                  </Upload>
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

function extractFieldErrorMessage(payload: any): string {
  if (!payload || typeof payload !== 'object') return '';
  const firstArrayEntry = Object.values(payload).find(
    (value) => Array.isArray(value) && value.length,
  ) as any;
  if (Array.isArray(firstArrayEntry) && firstArrayEntry[0]) {
    return String(firstArrayEntry[0]);
  }
  if (payload.detail) return String(payload.detail);
  if (payload.message) return String(payload.message);
  return '';
}
