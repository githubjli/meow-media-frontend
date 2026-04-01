import ProductForm from '@/pages/Seller/Products/components/ProductForm';
import { getMyProductDetail, updateMyProduct } from '@/services/product';
import type { Product } from '@/types/product';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel, useParams } from '@umijs/max';
import { Alert, Card, Skeleton, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

const { Text, Title } = Typography;

export default function SellerProductEditPage() {
  const intl = useIntl();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [item, setItem] = useState<Product | null>(null);

  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  useEffect(() => {
    if (!isLoggedIn) {
      history.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    if (!params.id) {
      setErrorMessage(
        intl.formatMessage({ id: 'seller.product.error.notFound' }),
      );
      setLoading(false);
      return;
    }

    getMyProductDetail(params.id)
      .then((data) => setItem(data))
      .catch((error: any) => {
        if (error?.status === 404) {
          setErrorMessage(
            intl.formatMessage({ id: 'seller.product.error.notFound' }),
          );
          return;
        }

        if (error?.status === 401 || error?.status === 403) {
          setErrorMessage(
            intl.formatMessage({ id: 'seller.product.error.forbidden' }),
          );
          return;
        }

        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'seller.product.error.loadDetail' }),
        );
      })
      .finally(() => setLoading(false));
  }, [intl, isLoggedIn, location.pathname, params.id]);

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>
                {intl.formatMessage({ id: 'seller.product.edit.title' })}
              </Title>
              <Text type="secondary">
                {intl.formatMessage({ id: 'seller.product.edit.subtitle' })}
              </Text>
            </div>

            {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
            {!loading && errorMessage ? (
              <Alert type="error" showIcon message={errorMessage} />
            ) : null}

            {!loading && item && !errorMessage ? (
              <ProductForm
                loading={saving}
                submitLabel={intl.formatMessage({
                  id: 'seller.product.actions.update',
                })}
                initialValues={item}
                onSubmit={async (values) => {
                  setSaving(true);
                  try {
                    await updateMyProduct(item.id, values);
                    message.success(
                      intl.formatMessage({ id: 'seller.product.updated' }),
                    );
                    history.push('/seller/products');
                  } catch (error: any) {
                    message.error(
                      error?.message ||
                        intl.formatMessage({
                          id: 'seller.product.error.update',
                        }),
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            ) : null}
          </Space>
        </Card>
      </div>
    </PageContainer>
  );
}
