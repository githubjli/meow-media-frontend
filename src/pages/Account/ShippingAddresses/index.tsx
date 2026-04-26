import {
  createShippingAddress,
  deleteShippingAddress,
  listShippingAddresses,
  updateShippingAddress,
} from '@/services/shippingAddress';
import type {
  ShippingAddress,
  ShippingAddressPayload,
} from '@/types/shippingAddress';
import { PageContainer } from '@ant-design/pro-components';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

const REQUIRED_FIELDS: Array<keyof ShippingAddressPayload> = [
  'receiver_name',
  'phone',
  'country',
  'province',
  'city',
  'district',
  'street_address',
  'postal_code',
];

export default function ShippingAddressesPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState<ShippingAddress[]>([]);
  const [editing, setEditing] = useState<ShippingAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<ShippingAddressPayload>();
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  const loadAddresses = () => {
    setLoading(true);
    setErrorMessage('');
    listShippingAddresses()
      .then((data) => setItems(data))
      .catch((error: any) => {
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'account.shippingAddresses.error.load' }),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!initialState?.authLoading && !isLoggedIn) {
      history.replace(
        `/login?redirect=${encodeURIComponent('/account/shipping-addresses')}`,
      );
      return;
    }
    if (!isLoggedIn) return;
    loadAddresses();
  }, [initialState?.authLoading, isLoggedIn]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('is_default', items.length === 0);
    setOpen(true);
  };

  const openEdit = (row: ShippingAddress) => {
    setEditing(row);
    form.setFieldsValue({ ...row });
    setOpen(true);
  };

  const onSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing?.id) {
        await updateShippingAddress(editing.id, values);
      } else {
        await createShippingAddress(values);
      }
      message.success(
        intl.formatMessage({ id: 'account.shippingAddresses.message.saved' }),
      );
      setOpen(false);
      loadAddresses();
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'account.shippingAddresses.error.save' }),
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string | number) => {
    try {
      await deleteShippingAddress(id);
      message.success(
        intl.formatMessage({ id: 'account.shippingAddresses.message.deleted' }),
      );
      setItems((prev) => prev.filter((row) => row.id !== id));
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'account.shippingAddresses.error.delete' }),
      );
    }
  };

  const onSetDefault = async (row: ShippingAddress, checked: boolean) => {
    try {
      await updateShippingAddress(row.id, { is_default: checked });
      loadAddresses();
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'account.shippingAddresses.error.save' }),
      );
    }
  };

  return (
    <PageContainer title={false}>
      <Card
        variant="borderless"
        style={{ borderRadius: 20, marginBottom: 12 }}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {intl.formatMessage({ id: 'account.shippingAddresses.create' })}
          </Button>
        }
      >
        <Space direction="vertical" size={4}>
          <h3 style={{ margin: 0 }}>
            {intl.formatMessage({ id: 'account.shippingAddresses.title' })}
          </h3>
          <span style={{ color: '#8c8c8c' }}>
            {intl.formatMessage({ id: 'account.shippingAddresses.subtitle' })}
          </span>
        </Space>
      </Card>

      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

      {loading ? (
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Spin />
        </Card>
      ) : items.length === 0 ? (
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Empty
            description={intl.formatMessage({ id: 'account.shippingAddresses.empty' })}
          >
            <Button type="primary" onClick={openCreate}>
              {intl.formatMessage({ id: 'account.shippingAddresses.create' })}
            </Button>
          </Empty>
        </Card>
      ) : (
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Table
            rowKey="id"
            pagination={false}
            dataSource={items}
            columns={[
              {
                title: intl.formatMessage({ id: 'account.shippingAddresses.receiver' }),
                render: (_, row) => (
                  <Space>
                    <span>{row.receiver_name}</span>
                    {row.is_default ? (
                      <Tag color="gold">
                        {intl.formatMessage({ id: 'account.shippingAddresses.default' })}
                      </Tag>
                    ) : null}
                  </Space>
                ),
              },
              {
                title: intl.formatMessage({ id: 'account.shippingAddresses.phone' }),
                dataIndex: 'phone',
              },
              {
                title: intl.formatMessage({ id: 'account.shippingAddresses.address' }),
                render: (_, row) =>
                  [
                    row.street_address,
                    row.district,
                    row.city,
                    row.province,
                    row.country,
                    row.postal_code,
                  ]
                    .filter(Boolean)
                    .join(', '),
              },
              {
                title: intl.formatMessage({ id: 'account.shippingAddresses.default' }),
                render: (_, row) => (
                  <Switch
                    checked={row.is_default}
                    onChange={(checked) => onSetDefault(row, checked)}
                  />
                ),
              },
              {
                title: intl.formatMessage({ id: 'common.actions' }),
                render: (_, row) => (
                  <Space>
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(row)}
                    >
                      {intl.formatMessage({ id: 'common.edit' })}
                    </Button>
                    <Popconfirm
                      title={intl.formatMessage({ id: 'common.delete' })}
                      onConfirm={() => onDelete(row.id)}
                    >
                      <Button type="link" danger>
                        {intl.formatMessage({ id: 'common.delete' })}
                      </Button>
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      )}

      <Modal
        title={intl.formatMessage({
          id: editing
            ? 'account.shippingAddresses.edit'
            : 'account.shippingAddresses.create',
        })}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical">
          {REQUIRED_FIELDS.map((field) => (
            <Form.Item
              key={field}
              name={field}
              label={intl.formatMessage({ id: `account.shippingAddresses.fields.${field}` })}
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({ id: 'common.required' }),
                },
              ]}
            >
              <Input />
            </Form.Item>
          ))}
          <Form.Item
            name="is_default"
            label={intl.formatMessage({ id: 'account.shippingAddresses.default' })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
