import { useIntl } from '@umijs/max';
import { Button, Modal, Space, Typography } from 'antd';

const { Text } = Typography;

export default function UnlockEpisodeModal({
  open,
  episodeTitle,
  requiredPoints,
  walletBalance,
  unlocking,
  onConfirm,
  onRecharge,
  onCancel,
}: {
  open: boolean;
  episodeTitle?: string;
  requiredPoints: number;
  walletBalance?: number | null;
  unlocking?: boolean;
  onConfirm: () => void;
  onRecharge: () => void;
  onCancel: () => void;
}) {
  const intl = useIntl();
  const balance = Number(walletBalance || 0);
  const insufficient =
    walletBalance !== undefined &&
    walletBalance !== null &&
    balance < requiredPoints;

  return (
    <Modal
      title={intl.formatMessage({ id: 'drama.unlock.title' })}
      open={open}
      onCancel={onCancel}
      footer={null}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Text>
          {intl.formatMessage({ id: 'drama.unlock.episode' })}:{' '}
          {episodeTitle || '-'}
        </Text>
        <Text>
          {intl.formatMessage({ id: 'drama.unlock.requiredPoints' })}:{' '}
          {requiredPoints}
        </Text>
        <Text>
          {intl.formatMessage({ id: 'drama.unlock.walletBalance' })}:{' '}
          {walletBalance === undefined || walletBalance === null
            ? '-'
            : walletBalance}
        </Text>

        <Space>
          <Button type="primary" loading={unlocking} onClick={onConfirm}>
            {intl.formatMessage({ id: 'drama.unlock.confirm' })}
          </Button>
          {insufficient ? (
            <Button onClick={onRecharge}>
              {intl.formatMessage({ id: 'drama.unlock.recharge' })}
            </Button>
          ) : null}
        </Space>
      </Space>
    </Modal>
  );
}
