import type { IntlShape } from '@umijs/max';

export const getProductOrderStatusLabel = (
  status: string | null | undefined,
  intl: IntlShape,
) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending_payment') {
    return intl.formatMessage({
      id: 'account.productOrders.status.pendingPayment',
    });
  }
  if (normalized === 'paid') {
    return intl.formatMessage({
      id: 'account.productOrders.status.paidReadyToShip',
    });
  }
  if (normalized === 'shipping') {
    return intl.formatMessage({ id: 'account.productOrders.status.shipping' });
  }
  if (normalized === 'completed') {
    return intl.formatMessage({ id: 'account.productOrders.status.completed' });
  }
  if (normalized === 'settled') {
    return intl.formatMessage({ id: 'account.productOrders.status.settled' });
  }
  if (normalized === 'cancelled') {
    return intl.formatMessage({ id: 'account.productOrders.status.cancelled' });
  }
  return String(status || '-').toUpperCase();
};

export const getPaymentOrderStatusLabel = (
  status: string | null | undefined,
  txid: string | null | undefined,
  intl: IntlShape,
) => {
  const normalized = String(status || '').toLowerCase();
  const hasTxid = Boolean(String(txid || '').trim());
  if (normalized === 'pending' && !hasTxid) {
    return intl.formatMessage({
      id: 'account.productOrders.status.pendingPayment',
    });
  }
  if (normalized === 'pending' && hasTxid) {
    return intl.formatMessage({
      id: 'account.productOrders.payment.submittedConfirming',
    });
  }
  if (normalized === 'paid') {
    return intl.formatMessage({ id: 'account.productOrders.status.paid' });
  }
  if (normalized === 'failed') {
    return intl.formatMessage({ id: 'account.productOrders.payment.failed' });
  }
  if (normalized === 'expired') {
    return intl.formatMessage({ id: 'account.productOrders.paymentExpired' });
  }
  if (normalized === 'underpaid') {
    return intl.formatMessage({
      id: 'account.productOrders.payment.underpaid',
    });
  }
  if (normalized === 'overpaid') {
    return intl.formatMessage({ id: 'account.productOrders.payment.overpaid' });
  }
  if (normalized === 'cancelled') {
    return intl.formatMessage({ id: 'account.productOrders.status.cancelled' });
  }
  return String(status || '-').toUpperCase();
};

export const getSellerPayoutStatusLabel = (
  status: string | null | undefined,
  intl: IntlShape,
) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pending') {
    return intl.formatMessage({ id: 'seller.orders.payout.waitingSettlement' });
  }
  if (normalized === 'paid') {
    return intl.formatMessage({ id: 'account.productOrders.status.paid' });
  }
  if (normalized === 'failed') {
    return intl.formatMessage({ id: 'seller.orders.payout.failed' });
  }
  return String(status || '-').toUpperCase();
};
