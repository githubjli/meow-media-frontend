import LivePaymentMethodForm from '@/components/live-room/LivePaymentMethodForm';
import type { ManageLivePaymentMethod } from '@/types/livePaymentMethod';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Drawer,
  Empty,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';

const { Text } = Typography;

export default function ManageLivePaymentsDrawer({
  open,
  loading,
  errorMessage,
  items,
  onClose,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  loading: boolean;
  errorMessage: string;
  items: ManageLivePaymentMethod[];
  onClose: () => void;
  onRefresh: () => void;
  onCreate: (payload: Partial<ManageLivePaymentMethod>) => Promise<void>;
  onUpdate: (
    id: string | number,
    payload: Partial<ManageLivePaymentMethod>,
  ) => Promise<void>;
  onDelete: (id: string | number) => Promise<void>;
}) {
  const intl = useIntl();
  const [editingItem, setEditingItem] =
    useState<ManageLivePaymentMethod | null>(null);

  return (
    <Drawer
      open={open}
      width={520}
      title={intl.formatMessage({ id: 'live.payments.manage.title' })}
      onClose={() => {
        setEditingItem(null);
        onClose();
      }}
      extra={
        <Button onClick={onRefresh}>
          {intl.formatMessage({ id: 'common.refresh' })}
        </Button>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <LivePaymentMethodForm
          loading={loading}
          initialValues={editingItem || undefined}
          submitLabelId={
            editingItem
              ? 'live.payments.manage.update'
              : 'live.payments.manage.create'
          }
          onSubmit={async (values) => {
            if (editingItem?.id !== undefined) {
              await onUpdate(editingItem.id, values);
              setEditingItem(null);
              return;
            }
            await onCreate(values);
          }}
          onCancel={editingItem ? () => setEditingItem(null) : undefined}
        />

        {errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}

        {items.length === 0 ? (
          <Empty
            description={intl.formatMessage({
              id: 'live.payments.manage.empty',
            })}
          />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {items.map((item) => (
              <div
                key={String(item.id)}
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
                    <Text strong>{item.title}</Text>
                    <Text type="secondary">{`${intl.formatMessage({
                      id: 'live.payments.fields.sortOrder',
                    })}: ${item.sort_order || 0}`}</Text>
                  </Space>
                  <Space wrap>
                    <Tag>
                      {intl.formatMessage({
                        id: `live.payments.method.${item.method_type}`,
                      })}
                    </Tag>
                    {typeof item.is_active === 'boolean' ? (
                      <Tag color={item.is_active ? 'green' : 'default'}>
                        {item.is_active
                          ? intl.formatMessage({ id: 'live.payments.active' })
                          : intl.formatMessage({
                              id: 'live.payments.inactive',
                            })}
                      </Tag>
                    ) : null}
                  </Space>
                  {item.qr_text ? (
                    <Text type="secondary">{item.qr_text}</Text>
                  ) : null}
                  {item.wallet_address ? (
                    <Text code style={{ wordBreak: 'break-all' }}>
                      {item.wallet_address}
                    </Text>
                  ) : null}
                  <Space>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => setEditingItem(item)}
                    >
                      {intl.formatMessage({
                        id: 'seller.product.actions.edit',
                      })}
                    </Button>
                    <Popconfirm
                      title={intl.formatMessage({
                        id: 'seller.product.actions.delete',
                      })}
                      onConfirm={() => onDelete(item.id)}
                    >
                      <Button danger icon={<DeleteOutlined />}>
                        {intl.formatMessage({
                          id: 'seller.product.actions.delete',
                        })}
                      </Button>
                    </Popconfirm>
                  </Space>
                </Space>
              </div>
            ))}
          </Space>
        )}
      </Space>
    </Drawer>
  );
}
