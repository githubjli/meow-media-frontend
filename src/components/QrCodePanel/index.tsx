import { Empty, Image, Space, Typography } from 'antd';

const { Text } = Typography;

type QrCodePanelProps = {
  payload?: unknown;
  size?: number;
  emptyText?: string;
};

const resolveQrPayload = (payload?: unknown) => {
  if (typeof payload === 'string') return payload;
  if (!payload) return '';
  try {
    return JSON.stringify(payload);
  } catch (error) {
    return String(payload);
  }
};

const buildQrImageUrl = (payload: string, size: number) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    payload,
  )}`;

export default function QrCodePanel({
  payload,
  size = 220,
  emptyText = 'QR code is not available yet.',
}: QrCodePanelProps) {
  const qrValue = resolveQrPayload(payload);
  const hasPayload = Boolean(qrValue);
  const previewUrl = hasPayload ? buildQrImageUrl(qrValue, size) : '';

  if (!previewUrl) {
    return (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
    );
  }

  return (
    <Space
      direction="vertical"
      size={10}
      style={{ width: '100%' }}
      align="center"
    >
      <Image
        src={previewUrl}
        alt="QR code"
        width={size}
        height={size}
        style={{ objectFit: 'contain', borderRadius: 10 }}
        preview={false}
      />
      {hasPayload ? <Text type="secondary">{qrValue}</Text> : null}
    </Space>
  );
}
