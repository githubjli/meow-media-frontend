import type { LivePaymentMethod } from '@/types/livePaymentMethod';
import { CopyOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import { Button, Image, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

const methodTypeLabel = (methodType: string, intl: any) =>
  intl.formatMessage({ id: `live.payments.method.${methodType}` });

export default function LivePaymentMethodCard({
  item,
  onCopy,
}: {
  item: LivePaymentMethod;
  onCopy: (value: string, label: string) => void;
}) {
  const intl = useIntl();

  return (
    <div
      style={{
        border: '1px solid rgba(15, 23, 42, 0.08)',
        borderRadius: 12,
        padding: 10,
        background: '#fffaf2',
      }}
    >
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space style={{ justifyContent: 'space-between', width: '100%' }}>
          <Text strong>{item.title}</Text>
          <Tag>{methodTypeLabel(item.method_type, intl)}</Tag>
        </Space>

        {item.qr_image_url ? (
          <Image
            src={item.qr_image_url}
            alt={item.title}
            width={160}
            style={{ borderRadius: 8 }}
          />
        ) : null}

        {item.qr_text ? (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text type="secondary" style={{ wordBreak: 'break-all' }}>
              {item.qr_text}
            </Text>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() =>
                onCopy(
                  item.qr_text || '',
                  intl.formatMessage({ id: 'live.payments.qrText' }),
                )
              }
            />
          </Space>
        ) : null}

        {item.wallet_address ? (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text code style={{ wordBreak: 'break-all' }}>
              {item.wallet_address}
            </Text>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() =>
                onCopy(
                  item.wallet_address || '',
                  intl.formatMessage({ id: 'live.payments.walletAddress' }),
                )
              }
            />
          </Space>
        ) : null}
      </Space>
    </div>
  );
}
