import type { DramaSeries } from '@/types/drama';
import { history, useIntl } from '@umijs/max';
import { Card, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

const resolvePointsPrice = (item: DramaSeries) => {
  const value =
    item.meow_points_price !== undefined && item.meow_points_price !== null
      ? item.meow_points_price
      : item.points_price !== undefined && item.points_price !== null
      ? item.points_price
      : item.coin_price;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function DramaCard({ item }: { item: DramaSeries }) {
  const intl = useIntl();
  const cover =
    item.cover_url ||
    item.cover ||
    item.poster_url ||
    item.thumbnail_url ||
    '/logo_black.svg';
  const pointsPrice = resolvePointsPrice(item);
  const totalEpisodes = item.total_episodes || item.episodes_count || 0;

  return (
    <Card
      hoverable
      onClick={() => history.push(`/drama/${item.id}`)}
      style={{ borderRadius: 16, overflow: 'hidden', height: '100%' }}
      bodyStyle={{ padding: 10 }}
      cover={
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingTop: '140%',
            background: '#f5ede0',
          }}
        >
          <img
            src={cover}
            alt={item.title || '-'}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      }
    >
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong ellipsis={{ tooltip: item.title || '-' }}>
          {item.title || '-'}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {item.category_display || item.category || '-'}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {intl.formatMessage({ id: 'drama.totalEpisodes' })}: {totalEpisodes}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {intl.formatMessage({ id: 'drama.views' })}: {item.view_count || 0} ·{' '}
          {intl.formatMessage({ id: 'drama.favorites' })}:{' '}
          {item.favorite_count || 0}
        </Text>
        <Space size={4} wrap>
          {item.is_free ? (
            <Tag color="green">
              {intl.formatMessage({ id: 'drama.badge.free' })}
            </Tag>
          ) : null}
          {item.is_vip ? (
            <Tag color="purple">
              {intl.formatMessage({ id: 'drama.badge.vip' })}
            </Tag>
          ) : null}
          {item.is_locked ? (
            <Tag color="red">
              {intl.formatMessage({ id: 'drama.badge.locked' })}
            </Tag>
          ) : null}
          {pointsPrice !== null ? (
            <Tag color="gold">
              {intl.formatMessage({ id: 'drama.badge.meowPoints' })}:{' '}
              {pointsPrice}
            </Tag>
          ) : null}
        </Space>
      </Space>
    </Card>
  );
}
