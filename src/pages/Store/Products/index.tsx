import { getPublicStoreProducts } from '@/services/product';
import { getPublicStore } from '@/services/store';
import type { Product } from '@/types/product';
import type { SellerStore } from '@/types/store';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useParams } from '@umijs/max';
import {
  Alert,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

const { Text, Title, Paragraph } = Typography;

export default function PublicStoreProductsPage() {
  const intl = useIntl();
  const params = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<SellerStore | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!params.slug) {
      setLoading(false);
      return;
    }

    let active = true;

    Promise.all([
      getPublicStore(params.slug),
      getPublicStoreProducts(params.slug),
    ])
      .then(([storeData, productsData]) => {
        if (!active) return;
        setStore(storeData);
        setItems(productsData.results || []);
      })
      .catch((error: any) => {
        if (!active) return;

        if (error?.status === 404) {
          setStore(null);
          setItems([]);
          return;
        }

        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'store.products.error.load' }),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [intl, params.slug]);

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card
          variant="borderless"
          style={{ borderRadius: 20, marginBottom: 16 }}
        >
          <Space direction="vertical" size={4}>
            <Title level={3} style={{ margin: 0 }}>
              {store?.name ||
                intl.formatMessage({ id: 'store.products.title' })}
            </Title>
            <Text type="secondary">
              {intl.formatMessage({ id: 'store.products.subtitle' })}
            </Text>
          </Space>
        </Card>

        {loading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        ) : errorMessage ? (
          <Alert type="error" showIcon message={errorMessage} />
        ) : !store ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Empty
              description={intl.formatMessage({ id: 'store.public.notFound' })}
            />
          </Card>
        ) : items.length === 0 ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Empty
              description={intl.formatMessage({ id: 'store.products.empty' })}
            />
          </Card>
        ) : (
          <Row gutter={[12, 14]}>
            {items.map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                <Card
                  hoverable
                  style={{ borderRadius: 16 }}
                  bodyStyle={{ padding: 10 }}
                  onClick={() => history.push(`/store/${store.slug}`)}
                  cover={
                    <div
                      style={{
                        aspectRatio: '16/10',
                        borderRadius: 12,
                        margin: 10,
                        marginBottom: 0,
                        background: item.cover_image
                          ? `url(${item.cover_image}) center/cover`
                          : '#f4ebdc',
                      }}
                    />
                  }
                >
                  <Space
                    direction="vertical"
                    size={4}
                    style={{ width: '100%' }}
                  >
                    <Title
                      level={5}
                      style={{ margin: 0 }}
                      ellipsis={{ rows: 2 }}
                    >
                      {item.title}
                    </Title>
                    <Paragraph
                      type="secondary"
                      style={{ marginBottom: 0 }}
                      ellipsis={{ rows: 2 }}
                    >
                      {item.description}
                    </Paragraph>
                    <Text
                      strong
                    >{`${item.price_amount} ${item.price_currency}`}</Text>
                    <Tag>
                      {item.stock_quantity > 0
                        ? intl.formatMessage({ id: 'store.products.inStock' })
                        : intl.formatMessage({ id: 'store.products.soldOut' })}
                    </Tag>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </PageContainer>
  );
}
