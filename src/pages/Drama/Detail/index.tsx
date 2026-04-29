import EpisodeGrid from '@/components/drama/EpisodeGrid';
import UnlockEpisodeModal from '@/components/drama/UnlockEpisodeModal';
import PageIntroCard from '@/components/PageIntroCard';
import {
  favoriteDrama,
  getDramaDetail,
  getDramaEpisodes,
  unfavoriteDrama,
  unlockDramaEpisode,
} from '@/services/drama';
import { getMeowPointWallet } from '@/services/meowPoints';
import type { DramaEpisode, DramaSeries } from '@/types/drama';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Paragraph, Text, Title } = Typography;

export default function DramaDetailPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const params = useParams<{ id: string }>();
  const dramaId = String(params?.id || '').trim();
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [series, setSeries] = useState<DramaSeries | null>(null);
  const [episodes, setEpisodes] = useState<DramaEpisode[]>([]);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<DramaEpisode | null>(null);

  useEffect(() => {
    if (!dramaId) return;

    setLoading(true);
    setErrorMessage('');

    Promise.all([getDramaDetail(dramaId), getDramaEpisodes(dramaId)])
      .then(([detail, episodeList]) => {
        setSeries(detail || null);
        setEpisodes(episodeList || []);
      })
      .catch((error: any) => {
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'drama.error.loadDetail' }),
        );
      })
      .finally(() => setLoading(false));
  }, [dramaId, intl]);

  const firstWatchableEpisode = useMemo(() => {
    return episodes.find((episode) => episode.can_watch) || episodes[0] || null;
  }, [episodes]);
  const unlockTargetPoints = useMemo(() => {
    const value =
      unlockTarget?.meow_points_price ??
      unlockTarget?.points_price ??
      unlockTarget?.coin_price;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [unlockTarget]);

  useEffect(() => {
    if (!unlockTarget || !isLoggedIn) return;
    getMeowPointWallet()
      .then((wallet) => {
        const value = Number(wallet?.balance ?? wallet?.available_balance);
        setWalletBalance(Number.isFinite(value) ? value : null);
      })
      .catch(() => setWalletBalance(null));
  }, [isLoggedIn, unlockTarget]);

  const onToggleFavorite = async () => {
    if (!isLoggedIn) {
      history.push(
        `/login?redirect=${encodeURIComponent(`/drama/${dramaId}`)}`,
      );
      return;
    }
    if (!series || togglingFavorite) return;

    setTogglingFavorite(true);
    try {
      if (series.is_favorited) {
        await unfavoriteDrama(dramaId);
      } else {
        await favoriteDrama(dramaId);
      }
      setSeries((prev) =>
        prev
          ? {
              ...prev,
              is_favorited: !prev.is_favorited,
              favorite_count:
                (prev.favorite_count || 0) + (prev.is_favorited ? -1 : 1),
            }
          : prev,
      );
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'drama.error.favoriteOperation' }),
      );
    } finally {
      setTogglingFavorite(false);
    }
  };

  const onLockedEpisodeClick = (episode: DramaEpisode) => {
    if (!isLoggedIn) {
      history.push(
        `/login?redirect=${encodeURIComponent(`/drama/${dramaId}`)}`,
      );
      return;
    }
    setUnlockTarget(episode);
  };

  const onUnlock = async () => {
    if (!unlockTarget?.id || unlocking) return;
    setUnlocking(true);
    try {
      await unlockDramaEpisode(unlockTarget.id);
      const latestEpisodes = await getDramaEpisodes(dramaId);
      setEpisodes(latestEpisodes || []);
      message.success(intl.formatMessage({ id: 'drama.unlock.success' }));
      history.push(`/drama/${dramaId}/episodes/${unlockTarget.id}`);
    } catch (error: any) {
      message.error(
        error?.message || intl.formatMessage({ id: 'drama.unlock.failed' }),
      );
    } finally {
      setUnlocking(false);
      setUnlockTarget(null);
    }
  };

  const cover =
    series?.cover_url ||
    series?.cover ||
    series?.poster_url ||
    series?.thumbnail_url ||
    '/logo_black.svg';
  const totalEpisodes = Number(series?.total_episodes);
  const fallbackEpisodesCount = Number(series?.episodes_count);

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <PageIntroCard
          title={
            series?.title || intl.formatMessage({ id: 'drama.detail.title' })
          }
          description={intl.formatMessage({ id: 'drama.detail.subtitle' })}
        />

        {errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}

        {loading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Spin />
          </Card>
        ) : !series ? (
          <Empty description={intl.formatMessage({ id: 'drama.empty' })} />
        ) : (
          <>
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Space size={16} align="start" style={{ width: '100%' }}>
                <img
                  src={cover}
                  alt={series.title || '-'}
                  style={{ width: 160, borderRadius: 12, objectFit: 'cover' }}
                />
                <Space direction="vertical" size={4} style={{ flex: 1 }}>
                  <Title level={4} style={{ margin: 0 }}>
                    {series.title || '-'}
                  </Title>
                  <Text type="secondary">
                    {series.category_display || series.category || '-'}
                  </Text>
                  <Text>
                    {intl.formatMessage({ id: 'drama.totalEpisodes' })}:{' '}
                    {totalEpisodes > 0
                      ? totalEpisodes
                      : fallbackEpisodesCount > 0
                      ? fallbackEpisodesCount
                      : episodes.length}
                  </Text>
                  <Text>
                    {intl.formatMessage({ id: 'drama.views' })}:{' '}
                    {series.view_count || 0} ·{' '}
                    {intl.formatMessage({ id: 'drama.favorites' })}:{' '}
                    {series.favorite_count || 0}
                  </Text>
                  <Paragraph style={{ marginTop: 4 }}>
                    {series.description || '-'}
                  </Paragraph>
                  <Space size={8} wrap>
                    {firstWatchableEpisode ? (
                      <Button
                        type="primary"
                        onClick={() =>
                          history.push(
                            `/drama/${series.id}/episodes/${firstWatchableEpisode.id}`,
                          )
                        }
                      >
                        {intl.formatMessage({
                          id: 'drama.detail.startWatching',
                        })}
                      </Button>
                    ) : null}
                    <Button
                      loading={togglingFavorite}
                      icon={
                        series?.is_favorited ? (
                          <HeartFilled />
                        ) : (
                          <HeartOutlined />
                        )
                      }
                      onClick={onToggleFavorite}
                    >
                      {series?.is_favorited
                        ? intl.formatMessage({ id: 'drama.detail.favorited' })
                        : intl.formatMessage({ id: 'drama.detail.favorite' })}
                    </Button>
                  </Space>
                </Space>
              </Space>
            </Card>

            <Card
              title={intl.formatMessage({ id: 'drama.detail.episodes' })}
              variant="borderless"
              style={{ borderRadius: 20 }}
            >
              {episodes.length === 0 ? (
                <Empty
                  description={intl.formatMessage({
                    id: 'drama.detail.noEpisodes',
                  })}
                />
              ) : (
                <EpisodeGrid
                  seriesId={series.id}
                  episodes={episodes}
                  onLockedClick={onLockedEpisodeClick}
                />
              )}
            </Card>
          </>
        )}
      </Space>
      <UnlockEpisodeModal
        open={Boolean(unlockTarget)}
        episodeTitle={
          unlockTarget?.title ||
          intl.formatMessage(
            { id: 'drama.episode.numberLabel' },
            { number: unlockTarget?.episode_no || '-' },
          )
        }
        requiredPoints={unlockTargetPoints}
        walletBalance={walletBalance}
        unlocking={unlocking}
        onConfirm={onUnlock}
        onRecharge={() => history.push('/meow-points/recharge')}
        onCancel={() => setUnlockTarget(null)}
      />
    </PageContainer>
  );
}
