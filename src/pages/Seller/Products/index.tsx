import { deleteMyProduct, getMyProducts } from '@/services/product';
import { getMyStore } from '@/services/store';
import type { Product } from '@/types/product';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Image,
  Popconfirm,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

const { Text, Title } = Typography;

const formatDate = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

export default function SellerProductsPage() {
  const intl = useIntl();
  const location = useLocation();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [storeMissing, setStoreMissing] = useState(false);
  const [items, setItems] = useState<Product[]>([]);

  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  const columns: ColumnsType<Product> = useMemo(
    () => [
      {
        title: intl.formatMessage({ id: 'seller.product.fields.coverImage' }),
        dataIndex: 'cover_image',
        key: 'cover_image',
        width: 120,
        render: (value: string | null | undefined, row) =>
          value ? (
            <Image
              src={value}
              width={88}
              height={50}
              style={{ objectFit: 'cover', borderRadius: 8 }}
              preview={false}
            />
          ) : (
            <div
              style={{
                width: 88,
                height: 50,
                borderRadius: 8,
                background: '#f3eee4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#948261',
                fontSize: 11,
              }}
            >
              {row.title?.charAt(0) || '#'}
            </div>
          ),
      },
      {
        title: intl.formatMessage({ id: 'seller.product.fields.title' }),
        dataIndex: 'title',
        key: 'title',
      },
      {
        title: intl.formatMessage({ id: 'seller.product.fields.priceAmount' }),
        key: 'price',
        render: (_, item) => `${item.price_amount} ${item.price_currency}`,
      },
      {
        title: intl.formatMessage({ id: 'seller.product.fields.stock' }),
        dataIndex: 'stock_quantity',
        key: 'stock_quantity',
      },
      {
        title: intl.formatMessage({ id: 'seller.product.fields.status' }),
        dataIndex: 'status',
        key: 'status',
        render: (status: string) => (
          <Tag>
            {intl.formatMessage({ id: `seller.product.status.${status}` })}
          </Tag>
        ),
      },
      {
        title: intl.formatMessage({ id: 'seller.product.fields.updatedAt' }),
        dataIndex: 'updated_at',
        key: 'updated_at',
        render: (value: string) => formatDate(value),
      },
      {
        title: intl.formatMessage({ id: 'seller.product.actions.column' }),
        key: 'actions',
        render: (_, item) => (
          <Space>
            <Button
              type="link"
              onClick={() => history.push(`/seller/products/${item.id}/edit`)}
            >
              {intl.formatMessage({ id: 'seller.product.actions.edit' })}
            </Button>
            <Popconfirm
              title={intl.formatMessage({
                id: 'seller.product.actions.delete',
              })}
              onConfirm={async () => {
                await deleteMyProduct(item.id);
                setItems((prev) =>
                  prev.filter((entry) => entry.id !== item.id),
                );
                message.success(
                  intl.formatMessage({ id: 'seller.product.deleted' }),
                );
              }}
            >
              <Button type="link" danger>
                {intl.formatMessage({ id: 'seller.product.actions.delete' })}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [intl],
  );

  useEffect(() => {
    if (!isLoggedIn) {
      history.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        await getMyStore();
      } catch (error: any) {
        if (!active) return;

        if (error?.status === 404) {
          setStoreMissing(true);
          setItems([]);
          setLoading(false);
          return;
        }

        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'seller.product.error.loadStore' }),
        );
        setLoading(false);
        return;
      }

      try {
        const response = await getMyProducts();
        if (!active) return;
        setStoreMissing(false);
        setItems(response.results || []);
      } catch (error: any) {
        if (active) {
          setErrorMessage(
            error?.message ||
              intl.formatMessage({ id: 'seller.product.error.loadList' }),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [intl, isLoggedIn, location.pathname]);

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Space
            align="start"
            style={{ width: '100%', justifyContent: 'space-between' }}
            wrap
          >
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>
                {intl.formatMessage({ id: 'seller.product.title' })}
              </Title>
              <Text type="secondary">
                {intl.formatMessage({ id: 'seller.product.subtitle' })}
              </Text>
            </div>
            <Button
              type="primary"
              onClick={() => history.push('/seller/products/new')}
            >
              {intl.formatMessage({ id: 'seller.product.actions.create' })}
            </Button>
          </Space>
        </Card>

        <div style={{ marginTop: 14 }}>
          {loading ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Card>
          ) : errorMessage ? (
            <Alert type="error" showIcon message={errorMessage} />
          ) : storeMissing ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Empty
                description={intl.formatMessage({
                  id: 'seller.product.empty.noStore',
                })}
              >
                <Button
                  type="primary"
                  onClick={() => history.push('/seller/store')}
                >
                  {intl.formatMessage({
                    id: 'seller.product.actions.setupStore',
                  })}
                </Button>
              </Empty>
            </Card>
          ) : items.length === 0 ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Empty
                description={intl.formatMessage({
                  id: 'seller.product.empty.list',
                })}
              >
                <Button
                  type="primary"
                  onClick={() => history.push('/seller/products/new')}
                >
                  {intl.formatMessage({ id: 'seller.product.actions.create' })}
                </Button>
              </Empty>
            </Card>
          ) : (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={items}
                pagination={false}
              />
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
