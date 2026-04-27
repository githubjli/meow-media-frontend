import {
  getAdminProductOrderDetail,
  listAdminProductOrders,
  markProductOrderSettled,
} from '@/services/productOrders';
import type { ProductOrder } from '@/types/productOrder';
import {
  getPaymentOrderStatusLabel,
  getProductOrderStatusLabel,
  getSellerPayoutStatusLabel,
} from '@/utils/productOrderStatus';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

export default function AdminProductOrdersPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);
  const [settleForm] = Form.useForm<{
    payout_address: string;
    txid: string;
    note: string;
  }>();

  const isAdmin = Boolean(
    initialState?.currentUser &&
      (initialState.currentUser.is_admin ||
        initialState.currentUser.is_staff ||
        initialState.currentUser.is_superuser ||
        initialState.currentUser.role === 'admin'),
  );

  const loadOrders = () => {
    setLoading(true);
    listAdminProductOrders()
      .then((data) => setOrders(data))
      .catch((error: any) => {
        message.error(
          error?.message ||
            intl.formatMessage({ id: 'admin.productOrders.listError' }),
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAdmin) {
      history.replace('/home');
      return;
    }
    loadOrders();
  }, [isAdmin]);

  const openDetail = async (orderNo: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    settleForm.resetFields();
    try {
      const detail = await getAdminProductOrderDetail(orderNo);
      setSelectedOrder(detail);
      settleForm.setFieldsValue({
        payout_address:
          detail?.seller_payout?.payout_address ||
          detail?.payout?.payout_address ||
          '',
        txid: detail?.seller_payout?.payout_txid || detail?.payout?.txid || '',
        note: detail?.seller_payout?.note || '',
      });
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'admin.productOrders.detailError' }),
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!selectedOrder?.order_no) return;
    if (String(selectedOrder.status || '').toLowerCase() !== 'completed')
      return;
    const values = await settleForm.validateFields();

    Modal.confirm({
      title: intl.formatMessage({ id: 'admin.productOrders.confirmTitle' }),
      content: intl.formatMessage({ id: 'admin.productOrders.confirmContent' }),
      okText: intl.formatMessage({ id: 'common.yes' }),
      cancelText: intl.formatMessage({ id: 'common.cancel' }),
      onOk: async () => {
        setSubmitLoading(true);
        try {
          await markProductOrderSettled(selectedOrder.order_no, {
            payout_address: values.payout_address || undefined,
            txid: values.txid || undefined,
            note: values.note || undefined,
          });
          message.success(
            intl.formatMessage({ id: 'admin.productOrders.settleSuccess' }),
          );
          const refreshed = await getAdminProductOrderDetail(
            selectedOrder.order_no,
          );
          setSelectedOrder(refreshed);
          loadOrders();
        } catch (error: any) {
          message.error(
            error?.message ||
              intl.formatMessage({ id: 'admin.productOrders.settleError' }),
          );
          throw error;
        } finally {
          setSubmitLoading(false);
        }
      },
    });
  };

  const columns = useMemo(
    () => [
      {
        title: intl.formatMessage({ id: 'account.productOrders.orderNo' }),
        dataIndex: 'order_no',
        key: 'order_no',
      },
      {
        title: intl.formatMessage({ id: 'account.productOrders.status' }),
        key: 'status',
        render: (_: any, record: ProductOrder) => (
          <Tag>{getProductOrderStatusLabel(record.status, intl)}</Tag>
        ),
      },
      {
        title: intl.formatMessage({ id: 'admin.productOrders.payoutStatus' }),
        key: 'payout_status',
        render: (_: any, record: ProductOrder) =>
          getSellerPayoutStatusLabel(
            record?.seller_payout?.status || record?.payout?.status,
            intl,
          ),
      },
      {
        title: intl.formatMessage({ id: 'common.actions' }),
        key: 'actions',
        render: (_: any, record: ProductOrder) => {
          const status = String(record.status || '').toLowerCase();
          if (status === 'completed') {
            return (
              <Button type="link" onClick={() => openDetail(record.order_no)}>
                {intl.formatMessage({ id: 'admin.productOrders.markSettled' })}
              </Button>
            );
          }
          if (status === 'settled') {
            return (
              <Space size={8}>
                <Tag color="success">
                  {intl.formatMessage({ id: 'admin.productOrders.settled' })}
                </Tag>
                <Button type="link" onClick={() => openDetail(record.order_no)}>
                  {intl.formatMessage({ id: 'common.view' })}
                </Button>
              </Space>
            );
          }
          return (
            <Button type="link" onClick={() => openDetail(record.order_no)}>
              {intl.formatMessage({ id: 'common.view' })}
            </Button>
          );
        },
      },
    ],
    [intl],
  );

  const normalizedSelectedStatus = String(
    selectedOrder?.status || '',
  ).toLowerCase();
  const payoutSummary =
    selectedOrder?.seller_payout || selectedOrder?.payout || null;
  const sellerStoreName =
    selectedOrder?.seller_store?.name ||
    selectedOrder?.seller_store_name ||
    selectedOrder?.store_name ||
    '-';
  const buyerName =
    selectedOrder?.buyer_name ||
    selectedOrder?.buyer?.name ||
    selectedOrder?.buyer_email ||
    '-';
  const paymentOrderStatus = String(
    selectedOrder?.payment_order?.status ||
      selectedOrder?.payment_status ||
      '-',
  );

  if (!isAdmin) return null;

  return (
    <PageContainer title={false}>
      <Card variant="borderless" style={{ borderRadius: 20, marginBottom: 12 }}>
        <h3 style={{ marginBottom: 6 }}>
          {intl.formatMessage({ id: 'admin.productOrders.title' })}
        </h3>
        <span style={{ color: '#8c8c8c' }}>
          {intl.formatMessage({ id: 'admin.productOrders.subtitle' })}
        </span>
      </Card>
      <Table<ProductOrder>
        rowKey="order_no"
        loading={loading}
        dataSource={orders}
        columns={columns as any}
      />

      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        title={intl.formatMessage({
          id: 'admin.productOrders.settlementTitle',
        })}
        footer={
          normalizedSelectedStatus === 'completed' ? (
            <Button type="primary" loading={submitLoading} onClick={onSubmit}>
              {intl.formatMessage({ id: 'admin.productOrders.markSettled' })}
            </Button>
          ) : null
        }
      >
        {detailLoading || !selectedOrder ? (
          <Alert
            showIcon
            type="info"
            message={intl.formatMessage({ id: 'admin.productOrders.loading' })}
          />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.orderNo',
                })}
              >
                {selectedOrder.order_no}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'admin.productOrders.sellerStore',
                })}
              >
                {sellerStoreName}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({ id: 'admin.productOrders.buyer' })}
              >
                {buyerName}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'account.productOrders.product',
                })}
              >
                {selectedOrder.product_title_snapshot || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'admin.productOrders.amountCurrency',
                })}
              >
                {selectedOrder.total_amount} {selectedOrder.currency || '-'}
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'admin.productOrders.productOrderStatus',
                })}
              >
                <Tag>
                  {getProductOrderStatusLabel(selectedOrder.status, intl)}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'admin.productOrders.paymentOrderStatus',
                })}
              >
                <Tag>
                  {getPaymentOrderStatusLabel(
                    paymentOrderStatus,
                    selectedOrder?.txid,
                    intl,
                  )}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={intl.formatMessage({
                  id: 'admin.productOrders.payoutStatus',
                })}
              >
                <Tag>
                  {getSellerPayoutStatusLabel(payoutSummary?.status, intl)}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Form form={settleForm} layout="vertical">
              <Form.Item
                name="payout_address"
                label={intl.formatMessage({
                  id: 'seller.orders.payoutAddressLabel',
                })}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="txid"
                label={intl.formatMessage({ id: 'seller.orders.payoutTxid' })}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="note"
                label={intl.formatMessage({ id: 'admin.productOrders.note' })}
              >
                <Input.TextArea rows={3} />
              </Form.Item>
            </Form>

            {normalizedSelectedStatus === 'settled' ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item
                  label={intl.formatMessage({ id: 'seller.orders.payoutTxid' })}
                >
                  {String(
                    payoutSummary?.payout_txid || payoutSummary?.txid || '-',
                  )}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'seller.orders.payoutAddressLabel',
                  })}
                >
                  {String(payoutSummary?.payout_address || '-')}
                </Descriptions.Item>
                <Descriptions.Item
                  label={intl.formatMessage({
                    id: 'account.productOrders.paidAt',
                  })}
                >
                  {String(payoutSummary?.paid_at || '-')}
                </Descriptions.Item>
              </Descriptions>
            ) : null}
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
