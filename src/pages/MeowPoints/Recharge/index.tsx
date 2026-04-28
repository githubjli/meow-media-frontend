import PageIntroCard from '@/components/PageIntroCard';
import {
  createMeowPointOrder,
  getMeowPointPackages,
} from '@/services/meowPoints';
import type { MeowPointPackage } from '@/types/meowPoints';
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
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

const { Text } = Typography;

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolvePackageCode = (item: MeowPointPackage) =>
  String(item.code || item.id || '').trim();

const resolvePackagePoints = (item: MeowPointPackage) =>
  toNumber(item.total_points) ??
  (toNumber(item.points_amount ?? item.points) ?? 0) +
    (toNumber(item.bonus_points) ?? 0);

const resolvePriceAmount = (item: MeowPointPackage) =>
  item.price_amount ?? item.price_thb ?? item.price;

const resolvePriceCurrency = (item: MeowPointPackage) =>
  String(item.price_currency || item.currency || 'THB-LTT').toUpperCase();

export default function MeowPointsRechargePage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const locale = intl.locale || 'en-US';

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState<MeowPointPackage[]>([]);
  const [creatingCode, setCreatingCode] = useState('');

  const formatNumber = (value: number | string | null | undefined) => {
    const parsed = toNumber(value);
    if (parsed === null) return '-';
    return new Intl.NumberFormat(locale).format(parsed);
  };

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(
        `/login?redirect=${encodeURIComponent('/meow-points/recharge')}`,
      );
      return;
    }

    if (!isLoggedIn) return;

    setLoading(true);
    setErrorMessage('');

    getMeowPointPackages()
      .then((data) => {
        const activeItems = data.filter((item) => item.active !== false);
        setItems(activeItems);
      })
      .catch((error: any) => {
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'meowPoints.recharge.error.load' }),
        );
      })
      .finally(() => setLoading(false));
  }, [initialState?.authLoading, intl, isLoggedIn]);

  const onCreateOrder = async (item: MeowPointPackage) => {
    const packageCode = resolvePackageCode(item);
    if (!packageCode || creatingCode) return;

    setCreatingCode(packageCode);
    setErrorMessage('');
    try {
      const order = await createMeowPointOrder(packageCode);
      const orderNo = String(order?.order_no || '').trim();
      if (!orderNo) {
        throw new Error(
          intl.formatMessage({ id: 'meowPoints.recharge.error.create' }),
        );
      }
      history.push(`/meow-points/orders/${orderNo}`);
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          intl.formatMessage({ id: 'meowPoints.recharge.error.create' }),
      );
    } finally {
      setCreatingCode('');
    }
  };

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <PageIntroCard
          title={intl.formatMessage({ id: 'meowPoints.recharge.title' })}
          description={intl.formatMessage({
            id: 'meowPoints.recharge.subtitle',
          })}
        />

        {errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}

        {loading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Spin />
          </Card>
        ) : items.length === 0 ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Empty
              description={intl.formatMessage({
                id: 'meowPoints.recharge.empty',
              })}
            />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {items.map((item) => {
              const packageCode = resolvePackageCode(item);
              const isSubmitting = creatingCode === packageCode;
              return (
                <Col
                  key={String(item.id || packageCode || item.name)}
                  xs={24}
                  sm={12}
                  md={8}
                >
                  <Card variant="borderless" style={{ borderRadius: 20 }}>
                    <Space
                      direction="vertical"
                      size={4}
                      style={{ width: '100%' }}
                    >
                      <Text strong>{item.title || item.name || '-'}</Text>
                      <Text type="secondary">{item.description || '-'}</Text>
                      <Text>
                        {intl.formatMessage({
                          id: 'meowPoints.packages.points',
                        })}
                        : {formatNumber(item.points_amount ?? item.points)}
                      </Text>
                      <Text>
                        {intl.formatMessage({
                          id: 'meowPoints.order.bonusPoints',
                        })}
                        : {formatNumber(item.bonus_points)}
                      </Text>
                      <Text>
                        {intl.formatMessage({
                          id: 'meowPoints.order.totalPoints',
                        })}
                        : {formatNumber(resolvePackagePoints(item))}
                      </Text>
                      <Text>
                        {intl.formatMessage({
                          id: 'meowPoints.packages.price',
                        })}
                        : {formatNumber(resolvePriceAmount(item))}{' '}
                        {resolvePriceCurrency(item)}
                      </Text>
                      <Button
                        type="primary"
                        icon={<DollarOutlined />}
                        disabled={!packageCode || Boolean(creatingCode)}
                        loading={isSubmitting}
                        onClick={() => onCreateOrder(item)}
                      >
                        {intl.formatMessage({
                          id: 'meowPoints.recharge.buyNow',
                        })}
                      </Button>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Space>
    </PageContainer>
  );
}
