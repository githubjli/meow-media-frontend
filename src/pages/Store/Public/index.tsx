import { getPublicStore } from '@/services/store';
import type { SellerStore } from '@/types/store';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useParams } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

const { Text, Title, Paragraph } = Typography;

export default function PublicStorePage() {
  const intl = useIntl();
  const params = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<SellerStore | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!params.slug) {
      setLoading(false);
      return;
    }

    getPublicStore(params.slug)
      .then(setStore)
      .catch((error: any) => {
        if (error?.status === 404) {
          setStore(null);
          return;
        }

        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'store.public.error.load' }),
        );
      })
      .finally(() => setLoading(false));
  }, [intl, params.slug]);

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '8px 0 24px' }}>
        {loading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        ) : errorMessage ? (
          <Alert type="error" showIcon message={errorMessage} />
        ) : !store ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Empty
              description={intl.formatMessage({ id: 'store.public.notFound' })}
            />
          </Card>
        ) : (
          <Card
            variant="borderless"
            style={{ borderRadius: 20, overflow: 'hidden' }}
          >
            <div
              style={{
                width: '100%',
                aspectRatio: '16/4',
                borderRadius: 14,
                background: store.banner
                  ? `url(${store.banner}) center/cover`
                  : '#f5ecdd',
                marginBottom: 16,
              }}
            />
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Space align="center" size={12}>
                <Avatar size={56} src={store.logo || undefined}>
                  {store.name?.charAt(0)?.toUpperCase()}
                </Avatar>
                <div>
                  <Title level={3} style={{ margin: 0 }}>
                    {store.name}
                  </Title>
                  <Text type="secondary">@{store.slug}</Text>
                </div>
              </Space>

              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {store.description ||
                  intl.formatMessage({
                    id: 'store.public.descriptionFallback',
                  })}
              </Paragraph>

              <Button
                type="primary"
                onClick={() => history.push(`/store/${store.slug}/products`)}
              >
                {intl.formatMessage({ id: 'store.public.viewProducts' })}
              </Button>
            </Space>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
