import {
  createSellerPayoutAddress,
  deleteSellerPayoutAddress,
  listSellerPayoutAddresses,
  updateSellerPayoutAddress,
} from '@/services/payoutAddresses';
import type { PayoutAddress } from '@/types/payoutAddress';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import { Button, Card, Form, Input, Modal, Space, Switch, Table, message } from 'antd';
import { useEffect, useState } from 'react';

export default function SellerPayoutAddressesPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [items, setItems] = useState<PayoutAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PayoutAddress | null>(null);
  const [form] = Form.useForm();
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  const load = () => {
    setLoading(true);
    listSellerPayoutAddresses()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(`/login?redirect=${encodeURIComponent('/seller/payout-addresses')}`);
      return;
    }
    if (!isLoggedIn) return;
    load();
  }, [initialState?.authLoading, isLoggedIn]);

  const onSubmit = async () => {
    const values = await form.validateFields();
    if (editing?.id) {
      await updateSellerPayoutAddress(editing.id, values);
    } else {
      await createSellerPayoutAddress(values);
    }
    message.success(intl.formatMessage({ id: 'common.save' }));
    setOpen(false);
    setEditing(null);
    load();
  };

  return (
    <PageContainer title={false}>
      <Card
        variant="borderless"
        style={{ borderRadius: 20, marginBottom: 12 }}
        extra={<Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>{intl.formatMessage({ id: 'common.add' })}</Button>}
      >
        <h3 style={{ margin: 0 }}>{intl.formatMessage({ id: 'seller.payoutAddresses.title' })}</h3>
      </Card>
      <Card variant="borderless" style={{ borderRadius: 20 }}>
        <Table
          loading={loading}
          rowKey="id"
          dataSource={items}
          columns={[
            { title: intl.formatMessage({ id: 'seller.payoutAddresses.blockchain' }), dataIndex: 'blockchain' },
            { title: intl.formatMessage({ id: 'seller.payoutAddresses.token' }), dataIndex: 'token_symbol' },
            { title: intl.formatMessage({ id: 'seller.payoutAddresses.address' }), dataIndex: 'address' },
            { title: intl.formatMessage({ id: 'seller.payoutAddresses.default' }), render: (_, row) => <Switch checked={Boolean(row.is_default)} disabled /> },
            {
              title: intl.formatMessage({ id: 'common.actions' }),
              render: (_, row) => (
                <Space>
                  <Button type="link" onClick={() => { setEditing(row); form.setFieldsValue(row); setOpen(true); }}>{intl.formatMessage({ id: 'common.edit' })}</Button>
                  <Button type="link" danger onClick={async () => { await deleteSellerPayoutAddress(row.id); load(); }}>{intl.formatMessage({ id: 'common.delete' })}</Button>
                </Space>
              ),
            },
          ]}
          pagination={false}
        />
      </Card>

      <Modal open={open} onCancel={() => setOpen(false)} onOk={onSubmit} title={intl.formatMessage({ id: 'seller.payoutAddresses.title' })}>
        <Form layout="vertical" form={form} initialValues={{ blockchain: 'LTT', token_symbol: 'THB-LTT', is_default: false, is_active: true }}>
          <Form.Item name="blockchain" label={intl.formatMessage({ id: 'seller.payoutAddresses.blockchain' })}><Input /></Form.Item>
          <Form.Item name="token_symbol" label={intl.formatMessage({ id: 'seller.payoutAddresses.token' })}><Input /></Form.Item>
          <Form.Item name="address" label={intl.formatMessage({ id: 'seller.payoutAddresses.address' })} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="label" label={intl.formatMessage({ id: 'seller.payoutAddresses.label' })}><Input /></Form.Item>
          <Form.Item name="is_default" label={intl.formatMessage({ id: 'seller.payoutAddresses.default' })} valuePropName="checked"><Switch /></Form.Item>
          <Form.Item name="is_active" label={intl.formatMessage({ id: 'common.active' })} valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
