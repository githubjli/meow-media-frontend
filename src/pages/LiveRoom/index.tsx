import {
  CopyOutlined,
  DownOutlined,
  EyeOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  QrcodeOutlined,
  ShopOutlined,
  ShoppingOutlined,
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
  Collapse,
  Empty,
  Input,
  Row,
  Skeleton,
  Space,
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
  startLiveBroadcast,
  type LiveBroadcast,
  type LiveBroadcastStatus,
} from '@/services/live';
import { getLocalizedCategoryLabel } from '@/utils/categoryI18n';
import { getLiveStatusPresentation } from '@/utils/liveStatusPresentation';

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
    intl.formatMessage({ id: 'live.room.player.waitingPlaybackUrl' }),
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
  const statusPresentation = getLiveStatusPresentation(
    effectiveBackendStatus,
    intl,
  );
  const playbackUrl =
    backendStatus?.playback_url || broadcast?.playback_url || '';
  const rawWatchUrl =
    backendStatus?.watch_url ||
    broadcast?.watch_url ||
    getSafeWatchUrl({
      id: backendStatus?.id || broadcast?.id,
    });
  const watchUrl = useMemo(() => {
    const candidate = String(rawWatchUrl || '').trim();
    if (!candidate) return '';
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }
    const path = candidate.startsWith('/') ? candidate : `/${candidate}`;
    const origin =
      liveConfig.watchPageOrigin ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    return origin ? `${String(origin).replace(/\/$/, '')}${path}` : path;
  }, [rawWatchUrl]);
  const title =
    broadcast?.title ||
    broadcast?.name ||
    intl.formatMessage({ id: 'live.room.fallbackTitle' });
  const creatorName =
    broadcast?.creator?.name ||
    broadcast?.creator?.username ||
    broadcast?.creator?.email ||
    intl.formatMessage({ id: 'live.common.creatorFallback' });
  const viewerCount =
    backendStatus?.viewer_count ??
    backendStatus?.viewerCount ??
    broadcast?.viewer_count ??
    broadcast?.viewerCount ??
    0;
  const canStartLive =
    typeof backendStatus?.can_start === 'boolean'
      ? backendStatus.can_start
      : statusPresentation.uiStatus !== 'live';
  const canEndLive =
    typeof backendStatus?.can_end === 'boolean'
      ? backendStatus.can_end
      : statusPresentation.uiStatus !== 'ended';
  const canShowChatInput = false;

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
        data?.playback_url
          ? intl.formatMessage({ id: 'live.room.player.waitingStream' })
          : intl.formatMessage({ id: 'live.room.player.notStarted' }),
      );
    } catch (error: any) {
      setErrorMessage(
        error?.message || intl.formatMessage({ id: 'live.room.error.load' }),
      );
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
      setPlayerStatus(
        intl.formatMessage({ id: 'live.room.player.notStarted' }),
      );
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
      setPlayerStatus(
        intl.formatMessage({ id: 'live.room.player.waitingStream' }),
      );
      videoElement.pause();
      videoElement.removeAttribute('src');
      videoElement.load();

      const canUseNativeHls = videoElement.canPlayType(
        'application/vnd.apple.mpegurl',
      );

      const handlePlaying = () => {
        if (!cancelled) {
          setPlayerPhase('playing');
          setPlayerStatus(
            intl.formatMessage({ id: 'live.room.player.playing' }),
          );
        }
      };

      const handleWaiting = () => {
        if (!cancelled) {
          setPlayerPhase('waiting');
          setPlayerStatus(
            intl.formatMessage({ id: 'live.room.player.waitingStream' }),
          );
        }
      };

      const handlePlaybackError = () => {
        if (!cancelled) {
          setPlayerPhase('error');
          setPlayerStatus(
            intl.formatMessage({ id: 'live.room.player.notStarted' }),
          );
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
              setPlayerStatus(
                intl.formatMessage({ id: 'live.room.player.waitingStream' }),
              );
              videoElement.play().catch(() => undefined);
            }
          });
          hls.on(Hls.Events.ERROR, () => {
            if (!cancelled) {
              setPlayerPhase('error');
              setPlayerStatus(
                intl.formatMessage({ id: 'live.room.player.notStarted' }),
              );
            }
          });
          return;
        }
      } catch (error) {
        setPlayerPhase('error');
        setPlayerStatus(
          intl.formatMessage({ id: 'live.room.player.hlsLoadError' }),
        );
        return;
      }

      setPlayerPhase('error');
      setPlayerStatus(
        intl.formatMessage({ id: 'live.room.player.hlsUnsupported' }),
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
        next?.playback_url
          ? intl.formatMessage({ id: 'live.room.player.waitingStream' })
          : playerStatus,
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
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={statusPresentation.color}>
                    {statusPresentation.label}
                  </Tag>
                  {broadcast.category ? (
                    <Tag>
                      {getLocalizedCategoryLabel(intl, {
                        slug: broadcast.category,
                        name: broadcast.category,
                      })}
                    </Tag>
                  ) : null}
                  <Tag icon={<EyeOutlined />}>
                    {intl.formatMessage(
                      { id: 'live.common.viewers' },
                      { count: viewerCount.toLocaleString() },
                    )}
                  </Tag>
                </Space>
                <Row gutter={[14, 10]} align="middle">
                  <Col xs={24} lg={16}>
                    <Title level={2} style={{ margin: 0 }}>
                      {title}
                    </Title>
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
                    </Space>
                  </Col>
                </Row>
                <Row gutter={[14, 10]} align="middle">
                  <Col xs={24} lg={8}>
                    <Space align="center" size={10}>
                      <Avatar
                        icon={<UserOutlined />}
                        src={broadcast.creator?.avatar_url}
                      />
                      <div>
                        <Text
                          style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {creatorName}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {intl.formatMessage({
                            id: 'live.room.streamHost',
                          })}
                        </Text>
                      </div>
                    </Space>
                  </Col>
                  <Col xs={24} lg={16}>
                    <Paragraph
                      type="secondary"
                      style={{
                        marginBottom: 0,
                        fontSize: 13,
                        lineHeight: 1.65,
                      }}
                    >
                      {broadcast.description ||
                        intl.formatMessage({
                          id: 'live.room.descriptionFallback',
                        })}
                    </Paragraph>
                  </Col>
                </Row>
              </Space>
            </Card>

            <Row gutter={[16, 16]}>
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
                      <Empty
                        description={intl.formatMessage({
                          id: 'live.room.playbackUnavailable',
                        })}
                      />
                    )}
                  </Card>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 20 }}
                    title={intl.formatMessage({ id: 'live.room.viewerChat' })}
                  >
                    <Space
                      direction="vertical"
                      size={10}
                      style={{ width: '100%' }}
                    >
                      <div
                        style={{
                          borderRadius: 12,
                          minHeight: 180,
                          padding: 12,
                          background: 'rgba(255, 252, 243, 0.8)',
                        }}
                      >
                        {!isLoggedIn ? (
                          <Alert
                            type="info"
                            showIcon
                            message={intl.formatMessage({
                              id: 'live.room.chatSignedOut',
                            })}
                          />
                        ) : statusPresentation.uiStatus === 'ended' ? (
                          <Alert
                            type="warning"
                            showIcon
                            message={intl.formatMessage({
                              id: 'live.room.chatUnavailableEnded',
                            })}
                          />
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={intl.formatMessage({
                              id: 'live.room.chatEmpty',
                            })}
                          />
                        )}
                      </div>
                      <Input.TextArea
                        rows={3}
                        disabled={!canShowChatInput}
                        placeholder={intl.formatMessage({
                          id: 'live.room.chatInputPlaceholder',
                        })}
                      />
                      <Space style={{ width: '100%', justifyContent: 'end' }}>
                        <Button type="primary" disabled={!canShowChatInput}>
                          {intl.formatMessage({ id: 'live.room.chatSend' })}
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                </Space>
              </Col>

              <Col xs={24} md={8} xl={8}>
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  <Collapse
                    bordered={false}
                    defaultActiveKey={[]}
                    expandIconPosition="end"
                    expandIcon={({ isActive }) => (
                      <DownOutlined
                        style={{
                          transform: isActive
                            ? 'rotate(180deg)'
                            : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    )}
                    items={[
                      {
                        key: 'sidebar-watch-qr',
                        label: (
                          <Space size={8}>
                            <QrcodeOutlined />
                            <span>
                              {intl.formatMessage({ id: 'live.room.watchQr' })}
                            </span>
                          </Space>
                        ),
                        extra: (
                          <Button
                            type="link"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={(event) => {
                              event.stopPropagation();
                              copyValue(
                                watchUrl,
                                intl.formatMessage({
                                  id: 'live.room.watchUrl',
                                }),
                              );
                            }}
                          >
                            {intl.formatMessage({
                              id: 'live.room.copy',
                            })}
                          </Button>
                        ),
                        children: (
                          <QrCodePanel
                            payload={watchUrl}
                            emptyText={intl.formatMessage({
                              id: 'live.room.watchUrlUnavailable',
                            })}
                          />
                        ),
                      },
                      {
                        key: 'sidebar-pay-qr',
                        label: (
                          <Space size={8}>
                            <QrcodeOutlined />
                            <span>
                              {intl.formatMessage({ id: 'live.room.payQr' })}
                            </span>
                          </Space>
                        ),
                        extra: (
                          <Button
                            type="link"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={(event) => {
                              event.stopPropagation();
                              copyValue(
                                payQrPayload,
                                intl.formatMessage({
                                  id: 'live.room.paymentAddress',
                                }),
                              );
                            }}
                          >
                            {intl.formatMessage({
                              id: 'live.room.copy',
                            })}
                          </Button>
                        ),
                        children: (
                          <QrCodePanel
                            payload={payQrPayload}
                            emptyText={intl.formatMessage({
                              id: 'live.room.paymentAddressUnavailable',
                            })}
                          />
                        ),
                      },
                      {
                        key: 'sidebar-live-chat',
                        label: (
                          <Space size={8}>
                            <MessageOutlined />
                            <span>
                              {intl.formatMessage({
                                id: 'live.room.sidebar.liveChat',
                              })}
                            </span>
                          </Space>
                        ),
                        children: (
                          <Alert
                            type="info"
                            showIcon
                            message={intl.formatMessage({
                              id: 'live.room.sidebar.liveChatPlaceholder',
                            })}
                          />
                        ),
                      },
                      {
                        key: 'sidebar-product-listings',
                        label: (
                          <Space size={8}>
                            <ShoppingOutlined />
                            <span>
                              {intl.formatMessage({
                                id: 'live.room.sidebar.productListings',
                              })}
                            </span>
                          </Space>
                        ),
                        children: (
                          <Alert
                            type="info"
                            showIcon
                            message={intl.formatMessage({
                              id: 'live.room.sidebar.productListingsPlaceholder',
                            })}
                          />
                        ),
                      },
                      {
                        key: 'sidebar-seller-store',
                        label: (
                          <Space size={8}>
                            <ShopOutlined />
                            <span>
                              {intl.formatMessage({
                                id: 'live.room.sidebar.sellerStore',
                              })}
                            </span>
                          </Space>
                        ),
                        children: (
                          <Alert
                            type="info"
                            showIcon
                            message={intl.formatMessage({
                              id: 'live.room.sidebar.sellerStorePlaceholder',
                            })}
                          />
                        ),
                      },
                      {
                        key: 'sidebar-paid-programming-qr',
                        label: (
                          <Space size={8}>
                            <QrcodeOutlined />
                            <span>
                              {intl.formatMessage({
                                id: 'live.room.sidebar.paidProgrammingQr',
                              })}
                            </span>
                          </Space>
                        ),
                        children: (
                          <Alert
                            type="info"
                            showIcon
                            message={intl.formatMessage({
                              id: 'live.room.sidebar.paidProgrammingQrPlaceholder',
                            })}
                          />
                        ),
                      },
                    ]}
                  />
                </Space>
              </Col>
            </Row>
          </Space>
        ) : (
          <Empty
            description={intl.formatMessage({ id: 'live.room.unavailable' })}
          />
        )}
      </div>
    </PageContainer>
  );
}
