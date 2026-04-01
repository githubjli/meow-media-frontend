import ProductForm from '@/pages/Seller/Products/components/ProductForm';
import { createMyProduct } from '@/services/product';
import { getMyStore } from '@/services/store';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel } from '@umijs/max';
import { Alert, Card, Empty, Skeleton, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

const { Text, Title } = Typography;

export default function SellerProductCreatePage() {
  const intl = useIntl();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeMissing, setStoreMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  useEffect(() => {
    if (!isLoggedIn) {
      history.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    getMyStore()
      .then(() => {
        setStoreMissing(false);
      })
      .catch((error: any) => {
        if (error?.status === 404) {
          setStoreMissing(true);
          return;
        }
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'seller.product.error.loadStore' }),
        );
      })
      .finally(() => setLoading(false));
  }, [intl, isLoggedIn, location.pathname]);

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>
                {intl.formatMessage({ id: 'seller.product.create.title' })}
              </Title>
              <Text type="secondary">
                {intl.formatMessage({ id: 'seller.product.create.subtitle' })}
              </Text>
            </div>

            {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
            {!loading && errorMessage ? (
              <Alert type="error" showIcon message={errorMessage} />
            ) : null}
            {!loading && storeMissing ? (
              <Empty
                description={intl.formatMessage({
                  id: 'seller.product.empty.noStore',
                })}
              />
            ) : null}

            {!loading && !storeMissing && !errorMessage ? (
              <ProductForm
                submitLabel={intl.formatMessage({
                  id: 'seller.product.actions.create',
                })}
                loading={saving}
                onSubmit={async (values) => {
                  setSaving(true);
                  try {
                    await createMyProduct(values);
                    message.success(
                      intl.formatMessage({ id: 'seller.product.created' }),
                    );
                    history.push('/seller/products');
                  } catch (error: any) {
                    message.error(
                      error?.message ||
                        intl.formatMessage({
                          id: 'seller.product.error.create',
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
