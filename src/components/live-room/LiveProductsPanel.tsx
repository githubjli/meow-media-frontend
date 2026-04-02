import type { LiveProductBinding } from '@/types/liveProduct';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import LiveProductCard from './LiveProductCard';

const { Text } = Typography;

export default function LiveProductsPanel({
  loading,
  errorMessage,
  products,
}: {
  loading: boolean;
  errorMessage: string;
  products: LiveProductBinding[];
}) {
  const intl = useIntl();

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 20 }}
      title={intl.formatMessage({ id: 'live.products.title' })}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Text type="secondary">
          {intl.formatMessage({ id: 'live.products.subtitle' })}
        </Text>

        {loading ? <Skeleton active paragraph={{ rows: 4 }} /> : null}
        {!loading && errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}
        {!loading && !errorMessage && products.length === 0 ? (
          <Empty
            description={intl.formatMessage({ id: 'live.products.empty' })}
          />
        ) : null}
        {!loading && !errorMessage && products.length > 0 ? (
          <Row gutter={[10, 10]}>
            {products.map((binding) => (
              <Col xs={24} sm={12} key={String(binding.binding_id)}>
                <LiveProductCard binding={binding} />
              </Col>
            ))}
          </Row>
        ) : null}
      </Space>
    </Card>
  );
}
