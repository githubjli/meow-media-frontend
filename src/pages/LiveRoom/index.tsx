import {
  CopyOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  QrcodeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import QrCodePanel from '@/components/QrCodePanel';
import { liveConfig } from '@/config/live';
import {
  endLiveBroadcast,
  getLiveBroadcast,
  getLiveBroadcastStatus,
  getSafeWatchUrl,
  normalizeLiveStatus,
  startLiveBroadcast,
  type LiveBroadcast,
  type LiveBroadcastStatus,
} from '@/services/live';

const { Title, Text, Paragraph } = Typography;

type PlayerPhase = 'idle' | 'loading' | 'playing' | 'waiting' | 'error';

type HlsCtor = {
  isSupported: () => boolean;
  Events: { MANIFEST_PARSED: string; ERROR: string };
  new (): {
    loadSource: (src: string) => void;
    attachMedia: (media: HTMLVideoElement) => void;
    on: (event: string, callback: (...args: any[]) => void) => void;
    destroy: () => void;
  };
};

declare global {
  interface Window {
    Hls?: HlsCtor;
  }
}

const getStatusColor = (status?: string) => {
  const normalized = normalizeLiveStatus(status);
  switch (normalized) {
    case 'live':
      return 'error';
    case 'ended':
      return 'default';
    case 'ready':
    case 'waiting_for_signal':
    default:
      return 'processing';
  }
};

const copyValue = async (value: string, label: string) => {
  if (!value) {
    message.warning(`${label} is not available yet.`);
    return;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      message.success(`${label} copied.`);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error('copy_failed');
    }

    message.success(`${label} copied.`);
  } catch (error) {
    message.info(`Copy ${label.toLowerCase()} manually.`);
  }
};

const loadHlsLibrary = async (): Promise<HlsCtor | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.Hls) {
    return window.Hls;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-hls-js-cdn="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Unable to load hls.js.')),
        { once: true },
      );
      return;
    }

    if (!liveConfig.hlsScriptUrl) {
      reject(new Error('Missing HLS script URL configuration.'));
      return;
    }

    const script = document.createElement('script');
    script.src = liveConfig.hlsScriptUrl;
    script.async = true;
    script.dataset.hlsJsCdn = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load hls.js.'));
    document.head.appendChild(script);
  });

  return window.Hls || null;
};

export default function LiveRoomPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const [broadcast, setBroadcast] = useState<LiveBroadcast | null>(null);
  const [backendStatus, setBackendStatus] =
    useState<LiveBroadcastStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'start' | 'end' | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [playerStatus, setPlayerStatus] = useState(
    'Waiting for a playback URL from Django.',
  );
  const [playerPhase, setPlayerPhase] = useState<PlayerPhase>('idle');
  const [payQrPayload, setPayQrPayload] = useState('');

  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const isCreator = Boolean(
    initialState?.currentUser &&
      (initialState.currentUser.is_creator ||
        initialState.currentUser.role === 'creator' ||
        initialState.currentUser.user_type === 'creator'),
  );
  const effectiveBackendStatus =
    backendStatus?.effective_status ||
    backendStatus?.status ||
    backendStatus?.django_status ||
    broadcast?.normalized_status ||
    broadcast?.status;
  const normalizedBusinessStatus = normalizeLiveStatus(effectiveBackendStatus);
  const playbackUrl =
    backendStatus?.playback_url || broadcast?.playback_url || '';
  const watchUrl = getSafeWatchUrl({
    id: backendStatus?.id || broadcast?.id,
  });
  const title = broadcast?.title || broadcast?.name || 'Live Stream';
  const creatorName =
    broadcast?.creator?.name ||
    broadcast?.creator?.username ||
    broadcast?.creator?.email ||
    'Creator';
  const viewerCount =
    backendStatus?.viewer_count ??
    backendStatus?.viewerCount ??
    broadcast?.viewer_count ??
    broadcast?.viewerCount ??
    0;
  const canStartLive =
    typeof backendStatus?.can_start === 'boolean'
      ? backendStatus.can_start
      : normalizedBusinessStatus !== 'live';
  const canEndLive =
    typeof backendStatus?.can_end === 'boolean'
      ? backendStatus.can_end
      : normalizedBusinessStatus !== 'ended';

  const detailItems = useMemo(
    () => [
      { label: 'RTMP Server', value: broadcast?.rtmp_url || '' },
      { label: 'Playback URL', value: playbackUrl },
    ],
    [broadcast?.rtmp_url, playbackUrl],
  );

  const loadBroadcast = async (showLoader = false) => {
    if (!id) {
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    try {
      const data = await getLiveBroadcast(id);
      setBroadcast(data);
      setPayQrPayload(data?.payment_address || data?.wallet_address || '');
      setErrorMessage('');
      setPlayerPhase(data?.playback_url ? 'loading' : 'waiting');
      setPlayerStatus(
        data?.playback_url ? 'Waiting for stream...' : 'Stream not started yet',
      );
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to load the live room.');
      setBroadcast(null);
    } finally {
      setLoading(false);
    }
  };

  const loadBackendStatus = async () => {
    if (!id) {
      return;
    }

    try {
      const data = await getLiveBroadcastStatus(id);
      setBackendStatus(data);
    } catch (error: any) {
      setBackendStatus(null);
    }
  };

  useEffect(() => {
    loadBroadcast(true);
    loadBackendStatus();
    const detailInterval = window.setInterval(
      () => loadBroadcast(false),
      20000,
    );
    const statusInterval = window.setInterval(() => loadBackendStatus(), 12000);
    return () => {
      window.clearInterval(detailInterval);
      window.clearInterval(statusInterval);
    };
  }, [id]);

  useEffect(() => {
    const videoElement = videoElementRef.current;
    if (!videoElement || !playbackUrl) {
      setPlayerPhase('waiting');
      setPlayerStatus('Stream not started yet');
      return;
    }

    let cancelled = false;

    const attachPlayback = async () => {
      if (cancelled || !videoElement) {
        return;
      }

      hlsRef.current?.destroy();
      hlsRef.current = null;
      setPlayerPhase('loading');
      setPlayerStatus('Waiting for stream...');
      videoElement.pause();
      videoElement.removeAttribute('src');
      videoElement.load();

      const canUseNativeHls = videoElement.canPlayType(
        'application/vnd.apple.mpegurl',
      );

      const handlePlaying = () => {
        if (!cancelled) {
          setPlayerPhase('playing');
          setPlayerStatus('Live stream is playing.');
        }
      };

      const handleWaiting = () => {
        if (!cancelled) {
          setPlayerPhase('waiting');
          setPlayerStatus('Waiting for stream...');
        }
      };

      const handlePlaybackError = () => {
        if (!cancelled) {
          setPlayerPhase('error');
          setPlayerStatus('Stream not started yet');
        }
      };

      videoElement.onplaying = handlePlaying;
      videoElement.onwaiting = handleWaiting;
      videoElement.onerror = handlePlaybackError;
      videoElement.onloadeddata = handlePlaying;

      if (canUseNativeHls) {
        videoElement.src = playbackUrl;
        videoElement.play().catch(() => undefined);
        return;
      }

      try {
        const Hls = await loadHlsLibrary();
        if (cancelled || !videoElement) {
          return;
        }

        if (Hls?.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(playbackUrl);
          hls.attachMedia(videoElement);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!cancelled) {
              setPlayerPhase('loading');
              setPlayerStatus('Waiting for stream...');
              videoElement.play().catch(() => undefined);
            }
          });
          hls.on(Hls.Events.ERROR, () => {
            if (!cancelled) {
              setPlayerPhase('error');
              setPlayerStatus('Stream not started yet');
            }
          });
          return;
        }
      } catch (error) {
        setPlayerPhase('error');
        setPlayerStatus(
          'Unable to load HLS playback support in this browser. Please try Safari or verify your network access to the hls.js CDN.',
        );
        return;
      }

      setPlayerPhase('error');
      setPlayerStatus(
        'This browser does not support HLS playback for the provided stream.',
      );
    };

    attachPlayback();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      videoElement.onplaying = null;
      videoElement.onwaiting = null;
      videoElement.onerror = null;
      videoElement.onloadeddata = null;
    };
  }, [playbackUrl]);

  const getReturnUrl = () => `${location.pathname}${location.search}`;

  const navigateToLogin = () => {
    history.push(`/login?redirect=${encodeURIComponent(getReturnUrl())}`);
  };

  const handleAction = async (type: 'start' | 'end') => {
    if (!id) {
      return;
    }

    if (!isLoggedIn) {
      message.info(intl.formatMessage({ id: 'live.control.loginRequired' }));
      navigateToLogin();
      return;
    }
    if (!isCreator) {
      message.warning(intl.formatMessage({ id: 'live.creatorRequired' }));
      return;
    }

    setActionLoading(type);
    try {
      const next =
        type === 'start'
          ? await startLiveBroadcast(id)
          : await endLiveBroadcast(id);
      setBroadcast(next);
      await loadBackendStatus();
      await loadBroadcast(false);
      setPlayerPhase(next?.playback_url ? 'loading' : playerPhase);
      setPlayerStatus(
        next?.playback_url ? 'Waiting for stream...' : playerStatus,
      );
      message.success(
        type === 'start'
          ? intl.formatMessage({ id: 'live.control.started' })
          : intl.formatMessage({ id: 'live.control.ended' }),
      );
    } catch (error: any) {
      if (error?.status === 409) {
        message.warning(
          error?.message ||
            intl.formatMessage({ id: 'live.control.conflictTransition' }),
        );
        await loadBackendStatus();
        await loadBroadcast(false);
        return;
      }
      message.error(
        error?.message ||
          intl.formatMessage(
            { id: 'live.control.errorAction' },
            { action: type },
          ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const startButtonLabel = !isLoggedIn
    ? intl.formatMessage({ id: 'live.control.startCtaLogin' })
    : isCreator
    ? intl.formatMessage({ id: 'live.control.startCta' })
    : intl.formatMessage({ id: 'live.creatorRequired.short' });

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '8px 0 24px' }}>
        {loading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        ) : errorMessage ? (
          <Alert type="error" showIcon message={errorMessage} />
        ) : broadcast ? (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Row gutter={[20, 20]} align="middle">
                <Col xs={24} lg={16}>
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ width: '100%' }}
                  >
                    <Space wrap>
                      <Tag color={getStatusColor(normalizedBusinessStatus)}>
                        LIVE STATUS: {normalizedBusinessStatus.toUpperCase()}
                      </Tag>
                      {broadcast.category ? (
                        <Tag>{broadcast.category}</Tag>
                      ) : null}
                      <Tag icon={<EyeOutlined />}>
                        {viewerCount.toLocaleString()} viewers
                      </Tag>
                    </Space>
                    <Title level={2} style={{ margin: 0 }}>
                      {title}
                    </Title>
                    <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      {broadcast.description ||
                        'Professional live room with Django-managed stream lifecycle and Ant Media playback.'}
                    </Paragraph>
                    {backendStatus?.message ? (
                      <Alert
                        type="info"
                        showIcon
                        message={backendStatus.message}
                      />
                    ) : null}
                    {backendStatus?.status_source ? (
                      <Text type="secondary">
                        Status source: {backendStatus.status_source}
                      </Text>
                    ) : null}
                    {backendStatus?.sync_ok === false ? (
                      <Alert
                        type="warning"
                        showIcon
                        message={
                          backendStatus.sync_error ||
                          'Backend and media server status are out of sync.'
                        }
                      />
                    ) : null}
                    <Space align="center" size={12}>
                      <Avatar
                        icon={<UserOutlined />}
                        src={broadcast.creator?.avatar_url}
                      />
                      <div>
                        <Text strong style={{ display: 'block' }}>
                          {creatorName}
                        </Text>
                        <Text type="secondary">Stream host</Text>
                      </div>
                    </Space>
                  </Space>
                </Col>
                <Col xs={24} lg={8}>
                  <Space
                    wrap
                    style={{ justifyContent: 'flex-end', width: '100%' }}
                  >
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      loading={actionLoading === 'start'}
                      disabled={!canStartLive || !isCreator}
                      onClick={() => handleAction('start')}
                    >
                      {startButtonLabel}
                    </Button>
                    <Button
                      danger
                      icon={<PoweroffOutlined />}
                      loading={actionLoading === 'end'}
                      disabled={!canEndLive || !isCreator}
                      onClick={() => handleAction('end')}
                    >
                      {intl.formatMessage({ id: 'live.control.endCta' })}
                    </Button>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => copyValue(playbackUrl, 'Playback URL')}
                    >
                      {intl.formatMessage({ id: 'live.control.copyPlayback' })}
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            <Row gutter={[20, 20]}>
              <Col xs={24} md={16} xl={16}>
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 20, overflow: 'hidden' }}
                  >
                    {playbackUrl ? (
                      <Space
                        direction="vertical"
                        size={16}
                        style={{ width: '100%' }}
                      >
                        <div
                          style={{
                            borderRadius: 16,
                            overflow: 'hidden',
                            background: '#000',
                            minHeight: 420,
                          }}
                        >
                          <video
                            ref={videoElementRef}
                            autoPlay
                            controls
                            playsInline
                            preload="auto"
                            style={{
                              width: '100%',
                              minHeight: 420,
                              background: '#000',
                            }}
                          />
                        </div>
                        <Alert type="info" showIcon message={playerStatus} />
                      </Space>
                    ) : (
                      <Empty description="Playback URL is not available yet. Start your encoder and refresh this room once Django provides the playback endpoint." />
                    )}
                  </Card>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 20 }}
                    title="Stream details"
                  >
                    <Space
                      direction="vertical"
                      size={16}
                      style={{ width: '100%' }}
                    >
                      {detailItems.map((item) => (
                        <div key={item.label}>
                          <Text
                            strong
                            style={{ display: 'block', marginBottom: 6 }}
                          >
                            {item.label}
                          </Text>
                          <Space
                            align="start"
                            style={{
                              width: '100%',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text code style={{ wordBreak: 'break-all' }}>
                              {item.value || 'Not available'}
                            </Text>
                            <Button
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => copyValue(item.value, item.label)}
                            >
                              Copy
                            </Button>
                          </Space>
                        </div>
                      ))}
                    </Space>
                  </Card>
                </Space>
              </Col>

              <Col xs={24} md={8} xl={8}>
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 20 }}
                    title={
                      <Space size={8}>
                        <QrcodeOutlined />
                        <span>Pay QR</span>
                      </Space>
                    }
                  >
                    <QrCodePanel
                      payload={payQrPayload}
                      emptyText="Payment address is not available yet."
                    />
                    <Space style={{ width: '100%', justifyContent: 'center' }}>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() =>
                          copyValue(payQrPayload, 'Payment address')
                        }
                      >
                        Copy address
                      </Button>
                    </Space>
                  </Card>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 20 }}
                    title={
                      <Space size={8}>
                        <QrcodeOutlined />
                        <span>Watch QR</span>
                      </Space>
                    }
                  >
                    <QrCodePanel
                      payload={watchUrl}
                      emptyText="Watch URL is not available yet."
                    />
                    <Space style={{ width: '100%', justifyContent: 'center' }}>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyValue(watchUrl, 'Watch URL')}
                      >
                        Copy watch URL
                      </Button>
                    </Space>
                  </Card>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 20 }}
                    title="Viewer & chat"
                  >
                    <Space
                      direction="vertical"
                      size={12}
                      style={{ width: '100%' }}
                    >
                      <Statistic title="Current viewers" value={viewerCount} />
                      <Text type="secondary">
                        Live playback is bound directly to the `playback_url`
                        returned by Django so OBS/Ant Media broadcasts can be
                        validated here.
                      </Text>
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chat placeholder"
                      />
                    </Space>
                  </Card>
                </Space>
              </Col>
            </Row>
          </Space>
        ) : (
          <Empty description="Live room unavailable." />
        )}
      </div>
    </PageContainer>
  );
}
