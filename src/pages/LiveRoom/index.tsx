import {
  CopyOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
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
import * as vjs_module from 'video.js';
import 'video.js/dist/video-js.css';

import {
  endLiveBroadcast,
  getLiveBroadcast,
  startLiveBroadcast,
  type LiveBroadcast,
} from '@/services/live';

const { Title, Text, Paragraph } = Typography;

const getStatusColor = (status?: string) => {
  switch (String(status || '').toLowerCase()) {
    case 'live':
    case 'started':
    case 'broadcasting':
      return 'error';
    case 'ended':
    case 'finished':
      return 'default';
    default:
      return 'processing';
  }
};

const canStart = (status?: string) =>
  !['live', 'started', 'broadcasting'].includes(
    String(status || '').toLowerCase(),
  );
const canEnd = (status?: string) =>
  !['ended', 'finished'].includes(String(status || '').toLowerCase());

const copyValue = async (value: string, label: string) => {
  if (!value) {
    message.warning(`${label} is not available yet.`);
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    message.success(`${label} copied.`);
  } catch (error) {
    message.info(`Copy ${label.toLowerCase()} manually.`);
  }
};

export default function LiveRoomPage() {
  const { initialState } = useModel('@@initialState');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const query = useMemo(
    () => getLocationQuery(location.search),
    [location.search],
  );
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [broadcast, setBroadcast] = useState<LiveBroadcast | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'start' | 'end' | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState('');

  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const playbackUrl = broadcast?.playback_url || '';
  const title = broadcast?.title || broadcast?.name || 'Live Stream';
  const creatorName =
    broadcast?.creator?.name ||
    broadcast?.creator?.username ||
    broadcast?.creator?.email ||
    'Creator';
  const viewerCount = broadcast?.viewer_count ?? broadcast?.viewerCount ?? 0;

  const detailItems = useMemo(
    () => [
      { label: 'Stream Key', value: broadcast?.stream_key || '' },
      { label: 'RTMP Server URL', value: broadcast?.rtmp_url || '' },
      { label: 'Playback URL', value: playbackUrl },
    ],
    [broadcast?.stream_key, broadcast?.rtmp_url, playbackUrl],
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
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to load the live room.');
      setBroadcast(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcast(true);
    const interval = window.setInterval(() => loadBroadcast(false), 15000);
    return () => window.clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const videojs: any = (vjs_module as any).default || vjs_module;
    if (!videoRef.current || !playbackUrl || typeof videojs !== 'function') {
      return;
    }

    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
    videoRef.current.innerHTML = '';

    const element = document.createElement('video-js');
    element.className = 'vjs-big-play-centered vjs-fluid';
    videoRef.current.appendChild(element);

    playerRef.current = videojs(element, {
      autoplay: false,
      controls: true,
      responsive: true,
      fluid: true,
      preload: 'auto',
      liveui: true,
      sources: [{ src: playbackUrl, type: 'application/x-mpegURL' }],
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [playbackUrl]);

  const getReturnUrl = () => {
    if (typeof window === 'undefined') {
      return id ? `/live/${id}` : '/live';
    }

    return `${window.location.pathname}${window.location.search}`;
  };

  const navigateToLogin = () => {
    history.push(`/login?redirect=${encodeURIComponent(getReturnUrl())}`);
  };

  const handleAction = async (type: 'start' | 'end') => {
    if (!id) {
      return;
    }

    if (!isLoggedIn) {
      message.info('Please log in to manage this live stream.');
      navigateToLogin();
      return;
    }

    setActionLoading(type);
    try {
      const next =
        type === 'start'
          ? await startLiveBroadcast(id)
          : await endLiveBroadcast(id);
      setBroadcast(next);
      message.success(
        type === 'start' ? 'Live stream started.' : 'Live stream ended.',
      );
    } catch (error: any) {
      message.error(error?.message || `Unable to ${type} live stream.`);
    } finally {
      setActionLoading(null);
    }
  };

  const startButtonLabel = isLoggedIn ? 'Start Live' : 'Log in to Start';

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '8px 0 24px' }}>
        {loading ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        ) : errorMessage ? (
          <Alert type="error" showIcon message={errorMessage} />
        ) : broadcast ? (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Card bordered={false} style={{ borderRadius: 20 }}>
              <Row gutter={[20, 20]} align="middle">
                <Col xs={24} lg={16}>
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ width: '100%' }}
                  >
                    <Space wrap>
                      <Tag color={getStatusColor(broadcast.status)}>
                        {(broadcast.status || 'Created').toUpperCase()}
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
                      disabled={!canStart(broadcast.status)}
                      onClick={() => handleAction('start')}
                    >
                      {startButtonLabel}
                    </Button>
                    <Button
                      danger
                      icon={<PoweroffOutlined />}
                      loading={actionLoading === 'end'}
                      disabled={!canEnd(broadcast.status)}
                      onClick={() => handleAction('end')}
                    >
                      End Live
                    </Button>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => copyValue(playbackUrl, 'Playback URL')}
                    >
                      Copy Playback URL
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            <Row gutter={[20, 20]}>
              <Col xs={24} xl={16}>
                <Card
                  bordered={false}
                  style={{ borderRadius: 20, overflow: 'hidden' }}
                >
                  {playbackUrl ? (
                    <div
                      style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        background: '#000',
                        minHeight: 420,
                      }}
                    >
                      <div ref={videoRef} key={playbackUrl} />
                    </div>
                  ) : (
                    <Empty description="Playback URL is not available yet. Start your encoder and refresh this room once Django provides the playback endpoint." />
                  )}
                </Card>
              </Col>

              <Col xs={24} xl={8}>
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  <Card
                    bordered={false}
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

                  <Card
                    bordered={false}
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
                        Real-time viewer analytics and live chat can be
                        connected here once the backend messaging layer is
                        ready.
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
