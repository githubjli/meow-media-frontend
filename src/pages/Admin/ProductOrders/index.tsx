import { markProductOrderSettled } from '@/services/productOrders';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import { Alert, Button, Card, Form, Input, message } from 'antd';

export default function AdminProductOrdersPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  const isAdmin = Boolean(
    initialState?.currentUser &&
      (initialState.currentUser.is_admin ||
        initialState.currentUser.is_staff ||
        initialState.currentUser.is_superuser ||
        initialState.currentUser.role === 'admin'),
  );

  if (!isAdmin) {
    history.replace('/home');
    return null;
  }

  const onSubmit = async () => {
    const values = await form.validateFields();
    try {
      await markProductOrderSettled(values.order_no, {});
      message.success(intl.formatMessage({ id: 'admin.productOrders.settleSuccess' }));
      form.resetFields();
    } catch (error: any) {
      message.error(
        error?.message || intl.formatMessage({ id: 'admin.productOrders.settleError' }),
      );
    }
  };

  return (
    <PageContainer title={false}>
      <Card variant="borderless" style={{ borderRadius: 20, marginBottom: 12 }}>
        <h3 style={{ marginBottom: 6 }}>{intl.formatMessage({ id: 'admin.productOrders.title' })}</h3>
        <span style={{ color: '#8c8c8c' }}>{intl.formatMessage({ id: 'admin.productOrders.subtitle' })}</span>
      </Card>
      <Alert showIcon type="info" style={{ marginBottom: 12 }} message={intl.formatMessage({ id: 'admin.productOrders.phase1Hint' })} />
      <Card variant="borderless" style={{ borderRadius: 20 }}>
        <Form layout="vertical" form={form}>
          <Form.Item
            name="order_no"
            label={intl.formatMessage({ id: 'account.productOrders.orderNo' })}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Button type="primary" onClick={onSubmit}>
            {intl.formatMessage({ id: 'account.productOrders.settlement' })}
          </Button>
        </Form>
      </Card>
    </PageContainer>
  );
}
