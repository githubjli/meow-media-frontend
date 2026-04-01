import type { LiveProductBinding } from '@/types/liveProduct';
import type { Product } from '@/types/product';
import { DeleteOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Form,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';

const { Text } = Typography;

export default function ManageLiveProductsDrawer({
  open,
  loading,
  errorMessage,
  bindings,
  sellerProducts,
  onClose,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  loading: boolean;
  errorMessage: string;
  bindings: LiveProductBinding[];
  sellerProducts: Product[];
  onClose: () => void;
  onRefresh: () => void;
  onCreate: (payload: {
    product_id: string | number;
    sort_order?: number;
    is_pinned?: boolean;
    is_active?: boolean;
  }) => Promise<void>;
  onUpdate: (
    bindingId: string | number,
    payload: {
      sort_order?: number;
      is_pinned?: boolean;
      is_active?: boolean;
    },
  ) => Promise<void>;
  onDelete: (bindingId: string | number) => Promise<void>;
}) {
  const intl = useIntl();

  return (
    <Drawer
      open={open}
      title={intl.formatMessage({ id: 'live.products.manage.title' })}
      width={480}
      onClose={onClose}
      extra={
        <Button onClick={onRefresh}>
          {intl.formatMessage({ id: 'common.refresh' })}
        </Button>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Form
          layout="vertical"
          onFinish={async (values) => {
            await onCreate({
              product_id: values.product_id,
              sort_order: values.sort_order,
              is_pinned: values.is_pinned,
              is_active: values.is_active,
            });
          }}
        >
          <Form.Item
            name="product_id"
            label={intl.formatMessage({
              id: 'live.products.manage.addProduct',
            })}
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              options={sellerProducts.map((item) => ({
                label: `${item.title} (${item.price_amount} ${item.price_currency})`,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Space size={10} wrap>
            <Form.Item
              name="sort_order"
              label={intl.formatMessage({
                id: 'live.products.manage.sortOrder',
              })}
              style={{ width: 120 }}
            >
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              name="is_pinned"
              valuePropName="checked"
              label={intl.formatMessage({ id: 'live.products.manage.pinned' })}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="is_active"
              valuePropName="checked"
              label={intl.formatMessage({ id: 'live.products.manage.active' })}
            >
              <Switch />
            </Form.Item>
          </Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {intl.formatMessage({ id: 'live.products.manage.bind' })}
          </Button>
        </Form>

        {errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}

        {bindings.length === 0 ? (
          <Empty
            description={intl.formatMessage({
              id: 'live.products.manage.empty',
            })}
          />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {bindings.map((item) => (
              <div
                key={String(item.binding_id)}
                style={{
                  border: '1px solid rgba(15,23,42,0.08)',
                  borderRadius: 12,
                  padding: 10,
                }}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Space
                    style={{ justifyContent: 'space-between', width: '100%' }}
                  >
                    <Text strong>{item.product?.title}</Text>
                    <Text>{`${item.product?.price_amount || '-'} ${
                      item.product?.price_currency || ''
                    }`}</Text>
                  </Space>
                  <Space wrap>
                    {item.is_pinned ? (
                      <Tag color="gold">
                        {intl.formatMessage({ id: 'live.products.pinned' })}
                      </Tag>
                    ) : null}
                    {typeof item.is_active === 'boolean' ? (
                      <Tag>
                        {item.is_active
                          ? intl.formatMessage({
                              id: 'live.products.manage.active',
                            })
                          : intl.formatMessage({
                              id: 'live.products.manage.inactive',
                            })}
                      </Tag>
                    ) : null}
                  </Space>
                  <Form
                    layout="inline"
                    initialValues={{
                      sort_order: item.sort_order,
                      is_pinned: item.is_pinned,
                      is_active: item.is_active,
                    }}
                    onFinish={async (values) => {
                      await onUpdate(item.binding_id, values);
                    }}
                  >
                    <Form.Item name="sort_order" style={{ width: 110 }}>
                      <InputNumber
                        style={{ width: '100%' }}
                        placeholder={intl.formatMessage({
                          id: 'live.products.manage.sortOrder',
                        })}
                      />
                    </Form.Item>
                    <Form.Item name="is_pinned" valuePropName="checked">
                      <Switch
                        checkedChildren={intl.formatMessage({
                          id: 'live.products.manage.pinned',
                        })}
                        unCheckedChildren={intl.formatMessage({
                          id: 'live.products.manage.pinned',
                        })}
                      />
                    </Form.Item>
                    {typeof item.is_active === 'boolean' ? (
                      <Form.Item name="is_active" valuePropName="checked">
                        <Switch
                          checkedChildren={intl.formatMessage({
                            id: 'live.products.manage.active',
                          })}
                          unCheckedChildren={intl.formatMessage({
                            id: 'live.products.manage.inactive',
                          })}
                        />
                      </Form.Item>
                    ) : null}
                    <Form.Item>
                      <Button htmlType="submit">
                        {intl.formatMessage({ id: 'common.save' })}
                      </Button>
                    </Form.Item>
                    <Form.Item>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => onDelete(item.binding_id)}
                      >
                        {intl.formatMessage({
                          id: 'seller.product.actions.delete',
                        })}
                      </Button>
                    </Form.Item>
                  </Form>
                </Space>
              </div>
            ))}
          </Space>
        )}
      </Space>
    </Drawer>
  );
}
