import { createProductOrder } from '@/services/productOrders';
import { listShippingAddresses } from '@/services/shippingAddress';
import type { ShippingAddress } from '@/types/shippingAddress';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import { Button, List, Modal, Typography, message } from 'antd';
import { useState, type MouseEvent } from 'react';

const { Text } = Typography;
const BUY_NOW_MESSAGE_KEY = 'buy-now-product-order';

export default function BuyNowButton({
  productId,
  buttonType = 'primary',
}: {
  productId: string | number;
  buttonType?: 'primary' | 'default' | 'link';
}) {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ShippingAddress[]>([]);

  const clearBuyNowMessage = () => {
    message.destroy(BUY_NOW_MESSAGE_KEY);
  };

  const onBuyNow = async (event?: MouseEvent) => {
    event?.stopPropagation();
    clearBuyNowMessage();

    if (!isLoggedIn) {
      history.push(
        `/login?redirect=${encodeURIComponent(history.location.pathname)}`,
      );
      return;
    }

    setLoading(true);
    try {
      const addresses = await listShippingAddresses();
      if (!addresses.length) {
        message.info({
          key: BUY_NOW_MESSAGE_KEY,
          content: intl.formatMessage({ id: 'buyNow.noAddress' }),
        });
        history.push('/account/shipping-addresses');
        return;
      }

      setItems(addresses);
      clearBuyNowMessage();
      setOpen(true);
    } catch (error: any) {
      message.error({
        key: BUY_NOW_MESSAGE_KEY,
        content:
          error?.message || intl.formatMessage({ id: 'buyNow.error.loadAddress' }),
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (shippingAddressId: string | number) => {
    setLoading(true);
    clearBuyNowMessage();

    try {
      const created = await createProductOrder({
        product_id: productId,
        quantity: 1,
        shipping_address_id: shippingAddressId,
      });

      setOpen(false);
      setItems([]);
      clearBuyNowMessage();
      history.push(`/account/product-orders/${created.order_no}`);
    } catch (error: any) {
      message.error({
        key: BUY_NOW_MESSAGE_KEY,
        content:
          error?.message || intl.formatMessage({ id: 'buyNow.error.createOrder' }),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type={buttonType}
        icon={<ShoppingCartOutlined />}
        onClick={onBuyNow}
        loading={loading}
      >
        {intl.formatMessage({ id: 'buyNow.action' })}
      </Button>
      <Modal
        title={intl.formatMessage({ id: 'buyNow.selectShippingAddress' })}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
      >
        <List
          dataSource={items}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key={item.id}
                  type="primary"
                  size="small"
                  onClick={() => createOrder(item.id)}
                >
                  {intl.formatMessage({ id: 'buyNow.useAddress' })}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    {item.receiver_name} ({item.phone}){' '}
                    {item.is_default
                      ? `• ${intl.formatMessage({
                          id: 'account.shippingAddresses.default',
                        })}`
                      : ''}
                  </span>
                }
                description={
                  <Text type="secondary">
                    {[
                      item.street_address,
                      item.district,
                      item.city,
                      item.province,
                      item.country,
                      item.postal_code,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
}
