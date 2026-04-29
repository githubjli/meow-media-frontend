import type { DramaEpisode } from '@/types/drama';
import { LockOutlined } from '@ant-design/icons';
import { history, useIntl } from '@umijs/max';
import { Button, Space, Tooltip } from 'antd';

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

const isWatchableEpisode = (episode: DramaEpisode) =>
  Boolean(episode.can_watch || episode.is_free || episode.is_unlocked);

const isLockedEpisode = (episode: DramaEpisode) =>
  Boolean(episode.is_locked || !isWatchableEpisode(episode));

export default function EpisodeGrid({
  seriesId,
  episodes,
  selectedEpisodeId,
  onLockedClick,
}: {
  seriesId: string | number;
  episodes: DramaEpisode[];
  selectedEpisodeId?: string | number;
  onLockedClick?: (episode: DramaEpisode) => void;
}) {
  const intl = useIntl();

  return (
    <Space size={[8, 8]} wrap>
      {episodes.map((episode, index) => {
        const number = episode.episode_no || episode.number || index + 1;
        const locked = isLockedEpisode(episode);
        const watchable = isWatchableEpisode(episode);
        const points = resolvePointsPrice(episode);
        const isSelected =
          selectedEpisodeId !== undefined &&
          selectedEpisodeId !== null &&
          (String(episode.id) === String(selectedEpisodeId) ||
            String(episode.episode_no) === String(selectedEpisodeId));
        const lockedTitle =
          points !== null && points > 0
            ? intl.formatMessage(
                { id: 'drama.episode.unlockForPoints' },
                { points },
              )
            : intl.formatMessage({ id: 'drama.badge.locked' });
        const ariaLabel = locked
          ? intl.formatMessage(
              { id: 'drama.episode.lockedTooltip' },
              { number, points: points ?? 0 },
            )
          : intl.formatMessage(
              { id: 'drama.episode.numberLabel' },
              { number: String(number) },
            );

        return (
          <Tooltip key={String(episode.id)} title={locked ? lockedTitle : null}>
            <Button
              onClick={() => {
                if (locked && !watchable) {
                  onLockedClick?.(episode);
                  return;
                }
                history.push(`/drama/${seriesId}/episodes/${episode.id}`);
              }}
              type={isSelected ? 'primary' : 'default'}
              aria-label={ariaLabel}
              title={ariaLabel}
              style={{
                minWidth: 44,
                height: 36,
                paddingInline: 10,
                borderRadius: 10,
                ...(locked
                  ? {
                      background: '#f3eee6',
                      color: '#8b7d6b',
                      borderColor: '#e6dccd',
                    }
                  : {}),
              }}
            >
              {number}
              {locked ? (
                <span style={{ marginLeft: 4, fontSize: 11 }}>
                  <LockOutlined />
                </span>
              ) : null}
            </Button>
          </Tooltip>
        );
      })}
    </Space>
  );
}
