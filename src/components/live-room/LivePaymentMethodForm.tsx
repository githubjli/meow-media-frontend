import type {
  LivePaymentMethodType,
  ManageLivePaymentMethod,
} from '@/types/livePaymentMethod';
import { useIntl } from '@umijs/max';
import { Button, Form, Input, InputNumber, Select, Space, Switch } from 'antd';
import { useMemo } from 'react';

const qrMethods: LivePaymentMethodType[] = [
  'watch_qr',
  'pay_qr',
  'paid_program_qr',
];

export default function LivePaymentMethodForm({
  loading,
  initialValues,
  submitLabelId,
  onSubmit,
  onCancel,
}: {
  loading: boolean;
  initialValues?: Partial<ManageLivePaymentMethod>;
  submitLabelId: string;
  onSubmit: (values: Partial<ManageLivePaymentMethod>) => Promise<void>;
  onCancel?: () => void;
}) {
  const intl = useIntl();
  const [form] = Form.useForm();
  const methodType = Form.useWatch('method_type', form) as
    | LivePaymentMethodType
    | undefined;
  const showQrFields = useMemo(
    () => qrMethods.includes(methodType || 'watch_qr'),
    [methodType],
  );
  const showWallet = methodType === 'crypto_address';

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        sort_order: 0,
        is_active: true,
        ...initialValues,
      }}
      onFinish={onSubmit}
    >
      <Form.Item
        name="method_type"
        label={intl.formatMessage({ id: 'live.payments.fields.methodType' })}
        rules={[{ required: true }]}
      >
        <Select
          options={[
            'watch_qr',
            'pay_qr',
            'paid_program_qr',
            'crypto_address',
          ].map((value) => ({
            value,
            label: intl.formatMessage({ id: `live.payments.method.${value}` }),
          }))}
        />
      </Form.Item>

      <Form.Item
        name="title"
        label={intl.formatMessage({ id: 'live.payments.fields.title' })}
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>

      {showQrFields ? (
        <>
          <Form.Item
            name="qr_image_url"
            label={intl.formatMessage({
              id: 'live.payments.fields.qrImageUrl',
            })}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="qr_text"
            label={intl.formatMessage({ id: 'live.payments.fields.qrText' })}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </>
      ) : null}

      {showWallet ? (
        <Form.Item
          name="wallet_address"
          label={intl.formatMessage({
            id: 'live.payments.fields.walletAddress',
          })}
        >
          <Input.TextArea rows={2} />
        </Form.Item>
      ) : null}

      <Space size={10} wrap>
        <Form.Item
          name="sort_order"
          label={intl.formatMessage({ id: 'live.payments.fields.sortOrder' })}
        >
          <InputNumber style={{ width: 120 }} />
        </Form.Item>
        <Form.Item
          name="is_active"
          valuePropName="checked"
          label={intl.formatMessage({ id: 'live.payments.fields.isActive' })}
        >
          <Switch />
        </Form.Item>
      </Space>

      <Space>
        <Button type="primary" htmlType="submit" loading={loading}>
          {intl.formatMessage({ id: submitLabelId })}
        </Button>
        {onCancel ? (
          <Button onClick={onCancel}>
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
        ) : null}
      </Space>
    </Form>
  );
}
