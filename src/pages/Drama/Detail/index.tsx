import EpisodeGrid from '@/components/drama/EpisodeGrid';
import PageIntroCard from '@/components/PageIntroCard';
import {
  favoriteDrama,
  getDramaDetail,
  getDramaEpisodes,
  unfavoriteDrama,
} from '@/services/drama';
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

  const cover =
    series?.cover_url ||
    series?.cover ||
    series?.poster_url ||
    series?.thumbnail_url ||
    '/logo_black.svg';

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <PageIntroCard
          title={
            series?.title || intl.formatMessage({ id: 'drama.detail.title' })
          }
          description={intl.formatMessage({ id: 'drama.detail.subtitle' })}
          extra={
            isLoggedIn ? (
              <Button
                loading={togglingFavorite}
                icon={
                  series?.is_favorited ? <HeartFilled /> : <HeartOutlined />
                }
                onClick={onToggleFavorite}
              >
                {series?.is_favorited
                  ? intl.formatMessage({ id: 'drama.detail.unfavorite' })
                  : intl.formatMessage({ id: 'drama.detail.favorite' })}
              </Button>
            ) : null
          }
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
                    {series.total_episodes ||
                      series.episodes_count ||
                      episodes.length}
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
                  {firstWatchableEpisode ? (
                    <Button
                      type="primary"
                      onClick={() =>
                        history.push(
                          `/drama/${series.id}/episodes/${firstWatchableEpisode.id}`,
                        )
                      }
                    >
                      {intl.formatMessage({ id: 'drama.detail.startWatching' })}
                    </Button>
                  ) : null}
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
                <EpisodeGrid seriesId={series.id} episodes={episodes} />
              )}
            </Card>
          </>
        )}
      </Space>
    </PageContainer>
  );
}
