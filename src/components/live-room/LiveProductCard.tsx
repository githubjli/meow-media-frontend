import BuyNowButton from '@/components/product-order/BuyNowButton';
import type { LiveProductBinding } from '@/types/liveProduct';
import { PushpinFilled, ShopOutlined } from '@ant-design/icons';
import { history, useIntl } from '@umijs/max';
import { Button, Card, Space, Tag, Typography } from 'antd';

const { Title, Text, Paragraph } = Typography;

export default function LiveProductCard({
  binding,
}: {
  binding: LiveProductBinding;
}) {
  const intl = useIntl();
  const product = binding.product;
  const store = product.store;

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 16 }}
      bodyStyle={{ padding: 10 }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            borderRadius: 12,
            background: product.cover_image_url
              ? `url(${product.cover_image_url}) center/cover`
              : '#f3eee4',
          }}
        />
        <Space size={6} wrap>
          {binding.is_pinned ? (
            <Tag icon={<PushpinFilled />} color="gold">
              {intl.formatMessage({ id: 'live.products.pinned' })}
            </Tag>
          ) : null}
          {store?.name ? <Tag icon={<ShopOutlined />}>{store.name}</Tag> : null}
        </Space>
        <Title level={5} style={{ margin: 0 }} ellipsis={{ rows: 2 }}>
          {product.title}
        </Title>
        {product.description ? (
          <Paragraph
            type="secondary"
            style={{ marginBottom: 0 }}
            ellipsis={{ rows: 2 }}
          >
            {product.description}
          </Paragraph>
        ) : null}
        <Text strong>
          {`${product.price_amount || '-'} ${
            product.price_currency || ''
          }`.trim()}
        </Text>
        <Space size={8} wrap>
          <BuyNowButton productId={product.id} buttonType="default" />
          {store?.slug ? (
            <Button
              type="link"
              style={{ paddingInline: 0 }}
              onClick={() => history.push(`/store/${store.slug}`)}
            >
              {intl.formatMessage({ id: 'live.products.viewStore' })}
            </Button>
          ) : null}
        </Space>
      </Space>
    </Card>
  );
}
