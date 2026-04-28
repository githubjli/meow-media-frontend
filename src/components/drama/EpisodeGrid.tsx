import type { DramaEpisode } from '@/types/drama';
import { history, useIntl } from '@umijs/max';
import { Button, Space, Tag, Typography } from 'antd';

const { Text } = Typography;

const resolvePointsPrice = (item: DramaEpisode) => {
  const value =
    item.meow_points_price !== undefined && item.meow_points_price !== null
      ? item.meow_points_price
      : item.points_price !== undefined && item.points_price !== null
      ? item.points_price
      : item.coin_price;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveState = (episode: DramaEpisode) => {
  const unlockType = String(episode.unlock_type || '').toLowerCase();
  if (episode.can_watch && (episode.is_unlocked || unlockType === 'free'))
    return 'unlocked';
  if (unlockType === 'free') return 'free';
  if (unlockType === 'membership' && episode.can_watch) return 'vip';
  if (episode.can_watch) return 'unlocked';
  return unlockType === 'membership' ? 'vip' : 'locked';
};

export default function EpisodeGrid({
  seriesId,
  episodes,
}: {
  seriesId: string | number;
  episodes: DramaEpisode[];
}) {
  const intl = useIntl();

  return (
    <Space size={[8, 8]} wrap>
      {episodes.map((episode) => {
        const number = episode.episode_no || episode.number || 0;
        const state = resolveState(episode);
        const points = resolvePointsPrice(episode);

        return (
          <Button
            key={String(episode.id)}
            onClick={() =>
              history.push(`/drama/${seriesId}/episodes/${episode.id}`)
            }
            style={{ height: 'auto', padding: '8px 10px' }}
          >
            <Space direction="vertical" size={2} align="start">
              <Text style={{ fontSize: 12, fontWeight: 600 }}>
                EP {number} {episode.title || ''}
              </Text>
              <Space size={4} wrap>
                {state === 'free' ? (
                  <Tag color="green">
                    {intl.formatMessage({ id: 'drama.badge.free' })}
                  </Tag>
                ) : null}
                {state === 'unlocked' ? (
                  <Tag color="blue">
                    {intl.formatMessage({ id: 'drama.badge.unlocked' })}
                  </Tag>
                ) : null}
                {state === 'vip' ? (
                  <Tag color="purple">
                    {intl.formatMessage({ id: 'drama.badge.vip' })}
                  </Tag>
                ) : null}
                {state === 'locked' ? (
                  <Tag color="red">
                    {intl.formatMessage({ id: 'drama.badge.locked' })}
                  </Tag>
                ) : null}
                {state === 'locked' && points !== null ? (
                  <Tag color="gold">
                    {intl.formatMessage({ id: 'drama.badge.meowPoints' })}:{' '}
                    {points}
                  </Tag>
                ) : null}
              </Space>
            </Space>
          </Button>
        );
      })}
    </Space>
  );
}
