import type { Product, ProductStatus } from '@/types/product';
import { useIntl } from '@umijs/max';
import {
  Button,
  Form,
  Image,
  Input,
  InputNumber,
  Select,
  Space,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useState } from 'react';

type ProductFormValues = {
  title: string;
  slug: string;
  description?: string;
  cover_image?: string | File;
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
  const [form] = Form.useForm<ProductFormValues>();
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <Form<ProductFormValues>
      form={form}
      layout="vertical"
      initialValues={{
        price_currency: 'USD',
        stock_quantity: 0,
        status: 'draft',
        ...initialValues,
      }}
      onFinish={async (values) => {
        const payload = { ...values } as ProductFormValues;
        const coverFile = coverFileList[0]?.originFileObj;
        if (coverFile) {
          payload.cover_image = coverFile as File;
        } else {
          delete payload.cover_image;
        }
        await onSubmit(payload);
      }}
    >
      <Form.Item
        name="title"
        label={intl.formatMessage({ id: 'seller.product.fields.title' })}
        rules={[{ required: true }]}
      >
        <Input
          onChange={(event) => {
            if (slugEdited) return;
            const nextSlug = slugify(event.target.value || '');
            form.setFieldValue('slug', nextSlug);
          }}
        />
      </Form.Item>
      <Form.Item
        name="slug"
        label={intl.formatMessage({ id: 'seller.product.fields.slug' })}
        extra={intl.formatMessage({ id: 'seller.product.fields.slugHint' })}
        rules={[
          { required: true },
          {
            pattern: /^[a-z0-9_-]+$/,
            message: intl.formatMessage({
              id: 'seller.product.fields.slugInvalid',
            }),
          },
        ]}
      >
        <Input onChange={() => setSlugEdited(true)} />
      </Form.Item>
      <Form.Item
        name="description"
        label={intl.formatMessage({ id: 'seller.product.fields.description' })}
      >
        <Input.TextArea rows={4} />
      </Form.Item>
      <Form.Item
        label={intl.formatMessage({ id: 'seller.product.fields.coverImage' })}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {typeof initialValues?.cover_image === 'string' &&
          initialValues.cover_image ? (
            <Image
              src={initialValues.cover_image}
              alt="product-cover"
              width={120}
              style={{ borderRadius: 8 }}
            />
          ) : null}
          <Upload
            maxCount={1}
            beforeUpload={() => false}
            fileList={coverFileList}
            onChange={({ fileList }) => setCoverFileList(fileList)}
            accept="image/*"
          >
            <Button>{intl.formatMessage({ id: 'common.upload' })}</Button>
          </Upload>
        </Space>
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-{2,}/g, '-');
}
