import EpisodeGrid from '@/components/drama/EpisodeGrid';
import UnlockEpisodeModal from '@/components/drama/UnlockEpisodeModal';
import {
  getDramaEpisodes,
  unlockDramaEpisode,
  updateDramaProgress,
} from '@/services/drama';
import { getMeowPointWallet } from '@/services/meowPoints';
import type { DramaEpisode } from '@/types/drama';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const { Text } = Typography;

const POLL_PROGRESS_MS = 12000;

const toNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolvePlaybackUrl = (episode?: DramaEpisode | null) => {
  if (!episode || !episode.can_watch) return '';
  return String(
    episode.playback_url || episode.hls_url || episode.video_url || '',
  );
};

const resolvePointsPrice = (episode?: DramaEpisode | null) => {
  const value =
    episode?.meow_points_price !== undefined &&
    episode?.meow_points_price !== null
      ? episode.meow_points_price
      : episode?.points_price !== undefined && episode?.points_price !== null
      ? episode.points_price
      : episode?.coin_price;
  return toNumber(value) ?? 0;
};

export default function DramaWatchPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const params = useParams<{ seriesId: string; episodeId: string }>();
  const seriesId = String(params?.seriesId || '').trim();
  const episodeId = String(params?.episodeId || '').trim();
  const isLoggedIn = Boolean(initialState?.currentUser?.email);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [episodes, setEpisodes] = useState<DramaEpisode[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const selectedEpisode = useMemo(
    () => episodes.find((item) => String(item.id) === episodeId) || null,
    [episodeId, episodes],
  );

  const playbackUrl = resolvePlaybackUrl(selectedEpisode);
  const isLocked = Boolean(
    selectedEpisode && (!selectedEpisode.can_watch || !playbackUrl),
  );
  const pointsPrice = resolvePointsPrice(selectedEpisode);

  const loadEpisodes = useCallback(async () => {
    if (!seriesId) return;
    setLoading(true);
    setErrorMessage('');

    try {
      const list = await getDramaEpisodes(seriesId);
      setEpisodes(list || []);
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          intl.formatMessage({ id: 'drama.error.loadEpisodes' }),
      );
    } finally {
      setLoading(false);
    }
  }, [intl, seriesId]);

  useEffect(() => {
    void loadEpisodes();
  }, [loadEpisodes]);

  useEffect(() => {
    if (!isLocked || !isLoggedIn) return;
    getMeowPointWallet()
      .then((wallet) => {
        const balance = Number(wallet?.balance ?? wallet?.available_balance);
        setWalletBalance(Number.isFinite(balance) ? balance : null);
      })
      .catch(() => setWalletBalance(null));
  }, [isLocked, isLoggedIn]);

  const reportProgress = useCallback(async () => {
    if (
      !selectedEpisode?.id ||
      !videoRef.current ||
      !selectedEpisode?.can_watch
    )
      return;

    const currentTime = Math.max(
      0,
      Math.floor(videoRef.current.currentTime || 0),
    );
    const duration = Math.max(0, Math.floor(videoRef.current.duration || 0));
    if (!currentTime) return;

    try {
      await updateDramaProgress(selectedEpisode.id, {
        watched_seconds: currentTime,
        duration_seconds: duration,
      });
    } catch (error) {
      // silent by design
    }
  }, [selectedEpisode?.can_watch, selectedEpisode?.id]);

  useEffect(() => {
    if (!selectedEpisode?.can_watch) return;
    const timer = window.setInterval(() => {
      void reportProgress();
    }, POLL_PROGRESS_MS);

    return () => {
      window.clearInterval(timer);
      void reportProgress();
    };
  }, [reportProgress, selectedEpisode?.can_watch]);

  const onUnlock = async () => {
    if (!selectedEpisode?.id || unlocking) return;
    if (!isLoggedIn) {
      history.push(
        `/login?redirect=${encodeURIComponent(
          `/drama/${seriesId}/episodes/${episodeId}`,
        )}`,
      );
      return;
    }

    setUnlocking(true);
    try {
      await unlockDramaEpisode(selectedEpisode.id);
      setUnlockOpen(false);
      await loadEpisodes();
      message.success(intl.formatMessage({ id: 'drama.unlock.success' }));
    } catch (error: any) {
      message.error(
        error?.message || intl.formatMessage({ id: 'drama.unlock.failed' }),
      );
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {errorMessage ? (
          <Alert type="warning" showIcon message={errorMessage} />
        ) : null}

        {loading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Spin />
          </Card>
        ) : !selectedEpisode ? (
          <Empty
            description={intl.formatMessage({ id: 'drama.watch.notFound' })}
          />
        ) : (
          <>
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              {isLocked ? (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Alert
                    type="info"
                    showIcon
                    message={intl.formatMessage({ id: 'drama.watch.locked' })}
                  />
                  <Text>
                    {intl.formatMessage({ id: 'drama.unlock.requiredPoints' })}:{' '}
                    {pointsPrice}
                  </Text>
                  <Space>
                    <Button type="primary" onClick={() => setUnlockOpen(true)}>
                      {intl.formatMessage({ id: 'drama.unlock.confirm' })}
                    </Button>
                    <Button
                      onClick={() => history.push('/meow-points/recharge')}
                    >
                      {intl.formatMessage({ id: 'drama.unlock.recharge' })}
                    </Button>
                  </Space>
                </Space>
              ) : playbackUrl ? (
                <video
                  ref={videoRef}
                  key={String(selectedEpisode.id)}
                  controls
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    background: '#000',
                  }}
                  src={playbackUrl}
                  onPause={() => void reportProgress()}
                />
              ) : (
                <Empty
                  description={intl.formatMessage({
                    id: 'drama.watch.noPlayback',
                  })}
                />
              )}
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
                <EpisodeGrid seriesId={seriesId} episodes={episodes} />
              )}
            </Card>
          </>
        )}
      </Space>

      <UnlockEpisodeModal
        open={unlockOpen}
        episodeTitle={selectedEpisode?.title}
        requiredPoints={pointsPrice}
        walletBalance={walletBalance}
        unlocking={unlocking}
        onConfirm={onUnlock}
        onRecharge={() => history.push('/meow-points/recharge')}
        onCancel={() => setUnlockOpen(false)}
      />
    </PageContainer>
  );
}
