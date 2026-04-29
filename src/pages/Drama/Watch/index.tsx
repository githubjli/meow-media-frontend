import EpisodeGrid from '@/components/drama/EpisodeGrid';
import UnlockEpisodeModal from '@/components/drama/UnlockEpisodeModal';
import {
  getDramaEpisodes,
  recordDramaView,
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
const SWIPE_MIN_DELTA_X = 50;
const SWIPE_HORIZONTAL_RATIO = 1.5;

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
  const [pendingUnlockEpisode, setPendingUnlockEpisode] =
    useState<DramaEpisode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const trackedViewRef = useRef<string>('');

  const selectedEpisode = useMemo(
    () =>
      episodes.find((item) => String(item.id) === episodeId) ||
      episodes.find((item) => String(item.episode_no) === episodeId) ||
      null,
    [episodeId, episodes],
  );

  const playbackUrl = resolvePlaybackUrl(selectedEpisode);
  const isLocked = Boolean(
    selectedEpisode && (!selectedEpisode.can_watch || !playbackUrl),
  );
  const pointsPrice = resolvePointsPrice(selectedEpisode);
  const unlockEpisode = pendingUnlockEpisode || selectedEpisode;
  const unlockEpisodePoints = resolvePointsPrice(unlockEpisode);

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
    if (!seriesId) return;
    if (trackedViewRef.current === seriesId) return;
    trackedViewRef.current = seriesId;
    recordDramaView(seriesId).catch(() => {
      // non-blocking by design
    });
  }, [seriesId]);

  useEffect(() => {
    if (!unlockOpen || !isLoggedIn) return;
    getMeowPointWallet()
      .then((wallet) => {
        const balance = Number(wallet?.balance ?? wallet?.available_balance);
        setWalletBalance(Number.isFinite(balance) ? balance : null);
      })
      .catch(() => setWalletBalance(null));
  }, [isLoggedIn, unlockOpen]);

  const reportProgress = useCallback(async () => {
    if (
      !isLoggedIn ||
      !seriesId ||
      !selectedEpisode?.id ||
      !videoRef.current ||
      !selectedEpisode?.can_watch ||
      !playbackUrl
    )
      return;

    const watchedSeconds = Math.max(
      0,
      Math.floor(videoRef.current.currentTime || 0),
    );
    const duration = Math.max(0, Math.floor(videoRef.current.duration || 0));
    if (!watchedSeconds) return;
    const completed = Boolean(duration > 0 && watchedSeconds >= duration);

    try {
      await updateDramaProgress(seriesId, {
        episode_id: selectedEpisode.id,
        progress_seconds: watchedSeconds,
        completed,
      });
    } catch (error) {
      // silent by design
    }
  }, [
    isLoggedIn,
    playbackUrl,
    selectedEpisode?.can_watch,
    selectedEpisode?.id,
    seriesId,
  ]);

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
    if (!unlockEpisode?.id || unlocking) return;
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
      await unlockDramaEpisode(unlockEpisode.id);
      setUnlockOpen(false);
      setPendingUnlockEpisode(null);
      await loadEpisodes();
      message.success(intl.formatMessage({ id: 'drama.unlock.success' }));
      history.push(`/drama/${seriesId}/episodes/${unlockEpisode.id}`);
    } catch (error: any) {
      message.error(
        error?.message || intl.formatMessage({ id: 'drama.unlock.failed' }),
      );
    } finally {
      setUnlocking(false);
    }
  };

  const navigateBySwipe = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedEpisode || episodes.length === 0) return;
      const currentIndex = episodes.findIndex(
        (item) =>
          String(item.id) === String(selectedEpisode.id) ||
          String(item.episode_no) === String(episodeId),
      );
      if (currentIndex < 0) return;
      const targetIndex =
        direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (targetIndex < 0) {
        message.info(intl.formatMessage({ id: 'drama.watch.firstEpisode' }));
        return;
      }
      if (targetIndex >= episodes.length) {
        message.info(intl.formatMessage({ id: 'drama.watch.latestEpisode' }));
        return;
      }

      const target = episodes[targetIndex];
      const canWatch = Boolean(
        target.can_watch || target.is_free || target.is_unlocked,
      );
      const locked = Boolean(target.is_locked || !canWatch);
      if (locked) {
        setPendingUnlockEpisode(target);
        setUnlockOpen(true);
        return;
      }
      history.push(`/drama/${seriesId}/episodes/${target.id}`);
    },
    [episodeId, episodes, intl, selectedEpisode, seriesId],
  );

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < SWIPE_MIN_DELTA_X) return;
    if (Math.abs(deltaX) <= Math.abs(deltaY) * SWIPE_HORIZONTAL_RATIO) return;
    if (deltaX < -SWIPE_MIN_DELTA_X) {
      navigateBySwipe('next');
      return;
    }
    if (deltaX > SWIPE_MIN_DELTA_X) {
      navigateBySwipe('prev');
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
            <Card
              variant="borderless"
              style={{ borderRadius: 20 }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
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
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                {intl.formatMessage({ id: 'drama.watch.swipeHint' })}
              </Text>
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
                  seriesId={seriesId}
                  episodes={episodes}
                  selectedEpisodeId={episodeId}
                  onLockedClick={(episode) => {
                    setPendingUnlockEpisode(episode);
                    setUnlockOpen(true);
                  }}
                />
              )}
            </Card>
          </>
        )}
      </Space>

      <UnlockEpisodeModal
        open={unlockOpen}
        episodeTitle={
          unlockEpisode?.title ||
          intl.formatMessage(
            { id: 'drama.episode.numberLabel' },
            { number: unlockEpisode?.episode_no || '-' },
          )
        }
        requiredPoints={unlockEpisodePoints}
        walletBalance={walletBalance}
        unlocking={unlocking}
        onConfirm={onUnlock}
        onRecharge={() => history.push('/meow-points/recharge')}
        onCancel={() => {
          setUnlockOpen(false);
          setPendingUnlockEpisode(null);
        }}
      />
    </PageContainer>
  );
}
