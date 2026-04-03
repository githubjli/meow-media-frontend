import type { LivePaymentMethod } from '@/types/livePaymentMethod';
import type { LiveProductBinding } from '@/types/liveProduct';
import type { PaymentOrder } from '@/types/paymentOrder';
import { useIntl } from '@umijs/max';
import { Alert, Button, Form, InputNumber, Select, Space } from 'antd';
import { useMemo } from 'react';
import PaymentOrderDetailCard from './PaymentOrderDetailCard';

export default function CreatePaymentOrderPanel({
  loading,
  isLoggedIn,
  paymentMethods,
  products,
  errorMessage,
  latestOrder,
  onRequireLogin,
  onCreate,
  onMarkPaid,
  canMarkPaid,
}: {
  loading: boolean;
  isLoggedIn: boolean;
  paymentMethods: LivePaymentMethod[];
  products: LiveProductBinding[];
  errorMessage: string;
  latestOrder?: PaymentOrder | null;
  onRequireLogin: () => void;
  onCreate: (values: any) => Promise<void>;
  onMarkPaid?: () => Promise<void>;
  canMarkPaid?: boolean;
}) {
  const intl = useIntl();
  const [form] = Form.useForm();
  const orderType = Form.useWatch('order_type', form);
  const isProductOrder = orderType === 'product';

  const paymentMethodOptions = useMemo(
    () =>
      paymentMethods.map((item) => ({
        value: item.id,
        label: item.title,
      })),
    [paymentMethods],
  );

  const productOptions = useMemo(
    () =>
      products.map((binding) => ({
        value: binding.product.id,
        label: binding.product.title,
      })),
    [products],
  );

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {!isLoggedIn ? (
        <Alert
          type="info"
          showIcon
          action={
            <Button size="small" onClick={onRequireLogin}>
              {intl.formatMessage({ id: 'nav.logIn' })}
            </Button>
          }
          message={intl.formatMessage({ id: 'live.orders.loginRequired' })}
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          initialValues={{ order_type: 'tip', amount: 1, currency: 'USD' }}
          onFinish={onCreate}
        >
          <Form.Item
            name="order_type"
            label={intl.formatMessage({ id: 'live.orders.orderType' })}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                {
                  value: 'tip',
                  label: intl.formatMessage({ id: 'live.orders.type.tip' }),
                },
                {
                  value: 'product',
                  label: intl.formatMessage({ id: 'live.orders.type.product' }),
                },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="stream_payment_method"
            label={intl.formatMessage({ id: 'live.orders.paymentMethod' })}
          >
            <Select allowClear options={paymentMethodOptions} />
          </Form.Item>
          {isProductOrder ? (
            <Form.Item
              name="product"
              label={intl.formatMessage({ id: 'live.orders.product' })}
              rules={[{ required: true }]}
            >
              <Select options={productOptions} />
            </Form.Item>
          ) : null}
          <Space size={10} wrap>
            <Form.Item
              name="amount"
              label={intl.formatMessage({ id: 'live.orders.amount' })}
              rules={[{ required: true }]}
            >
              <InputNumber min={0.01} step={0.01} />
            </Form.Item>
            <Form.Item
              name="currency"
              label={intl.formatMessage({ id: 'live.orders.currency' })}
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 110 }}
                options={[
                  { value: 'USD', label: 'USD' },
                  { value: 'USDT', label: 'USDT' },
                ]}
              />
            </Form.Item>
          </Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {intl.formatMessage({ id: 'live.orders.create' })}
          </Button>
        </Form>
      )}

      {errorMessage ? (
        <Alert type="warning" showIcon message={errorMessage} />
      ) : null}

      {latestOrder ? (
        <PaymentOrderDetailCard
          order={latestOrder}
          canMarkPaid={canMarkPaid}
          onMarkPaid={onMarkPaid}
        />
      ) : null}
    </Space>
  );
}
