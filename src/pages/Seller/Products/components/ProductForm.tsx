import type { Product, ProductStatus } from '@/types/product';
import { useIntl } from '@umijs/max';
import { Button, Form, Input, InputNumber, Select, Space } from 'antd';

type ProductFormValues = {
  title: string;
  slug: string;
  description?: string;
  cover_image?: string;
  price_amount: string;
  price_currency: string;
  stock_quantity: number;
  status: ProductStatus;
};

export type ProductPayload = Omit<Product, 'id'>;

export default function ProductForm({
  initialValues,
  loading,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<ProductFormValues>;
  loading?: boolean;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}) {
  const intl = useIntl();

  return (
    <Form<ProductFormValues>
      layout="vertical"
      initialValues={{
        price_currency: 'USD',
        stock_quantity: 0,
        status: 'draft',
        ...initialValues,
      }}
      onFinish={onSubmit}
    >
      <Form.Item
        name="title"
        label={intl.formatMessage({ id: 'seller.product.fields.title' })}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="slug"
        label={intl.formatMessage({ id: 'seller.product.fields.slug' })}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="description"
        label={intl.formatMessage({ id: 'seller.product.fields.description' })}
      >
        <Input.TextArea rows={4} />
      </Form.Item>
      <Form.Item
        name="cover_image"
        label={intl.formatMessage({ id: 'seller.product.fields.coverImage' })}
      >
        <Input />
      </Form.Item>
      <Space size={12} style={{ width: '100%' }} align="start" wrap>
        <Form.Item
          name="price_amount"
          label={intl.formatMessage({
            id: 'seller.product.fields.priceAmount',
          })}
          rules={[{ required: true }]}
          style={{ flex: 1, minWidth: 180 }}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="price_currency"
          label={intl.formatMessage({ id: 'seller.product.fields.currency' })}
          rules={[{ required: true }]}
          style={{ width: 160 }}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="stock_quantity"
          label={intl.formatMessage({ id: 'seller.product.fields.stock' })}
          rules={[{ required: true }]}
          style={{ width: 160 }}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      </Space>
      <Form.Item
        name="status"
        label={intl.formatMessage({ id: 'seller.product.fields.status' })}
        rules={[{ required: true }]}
      >
        <Select
          options={[
            {
              label: intl.formatMessage({ id: 'seller.product.status.draft' }),
              value: 'draft',
            },
            {
              label: intl.formatMessage({ id: 'seller.product.status.active' }),
              value: 'active',
            },
            {
              label: intl.formatMessage({
                id: 'seller.product.status.inactive',
              }),
              value: 'inactive',
            },
          ]}
        />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>
        {submitLabel}
      </Button>
    </Form>
  );
}
