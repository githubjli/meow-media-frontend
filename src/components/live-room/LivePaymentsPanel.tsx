import LivePaymentMethodCard from '@/components/live-room/LivePaymentMethodCard';
import type { LivePaymentMethod } from '@/types/livePaymentMethod';
import type { LiveProductBinding } from '@/types/liveProduct';
import type { PaymentOrder } from '@/types/paymentOrder';
import { useIntl } from '@umijs/max';
import { Alert, Empty, Skeleton, Space } from 'antd';
import { useMemo } from 'react';
import CreatePaymentOrderPanel from './CreatePaymentOrderPanel';

export default function LivePaymentsPanel({
  loading,
  errorMessage,
  items,
  onCopy,
  canCreateOrder,
  createOrderLoading,
  createOrderError,
  latestOrder,
  products,
  onRequireLogin,
  onCreateOrder,
  onMarkPaid,
  canMarkPaid,
}: {
  loading: boolean;
  errorMessage: string;
  items: LivePaymentMethod[];
  onCopy: (value: string, label: string) => void;
  canCreateOrder: boolean;
  createOrderLoading: boolean;
  createOrderError: string;
  latestOrder?: PaymentOrder | null;
  products: LiveProductBinding[];
  onRequireLogin: () => void;
  onCreateOrder: (values: any) => Promise<void>;
  onMarkPaid?: () => Promise<void>;
  canMarkPaid?: boolean;
}) {
  const intl = useIntl();
  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
      ),
    [items],
  );

  if (loading) {
    return <Skeleton active paragraph={{ rows: 4 }} />;
  }

  if (errorMessage) {
    return <Alert type="warning" showIcon message={errorMessage} />;
  }

  if (!sortedItems.length) {
    return (
      <Empty description={intl.formatMessage({ id: 'live.payments.empty' })} />
    );
  }

  return (
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      <CreatePaymentOrderPanel
        loading={createOrderLoading}
        isLoggedIn={canCreateOrder}
        paymentMethods={sortedItems}
        products={products}
        errorMessage={createOrderError}
        latestOrder={latestOrder}
        onRequireLogin={onRequireLogin}
        onCreate={onCreateOrder}
        canMarkPaid={canMarkPaid}
        onMarkPaid={onMarkPaid}
      />
      {sortedItems.map((item) => (
        <LivePaymentMethodCard
          key={String(item.id)}
          item={item}
          onCopy={onCopy}
        />
      ))}
    </Space>
  );
}
