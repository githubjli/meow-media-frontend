import { EyeOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
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
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

import { getLiveList, type LiveBroadcast } from '@/services/live';

const { Title, Text } = Typography;

const getStatusPresentation = (status?: string) => {
  const value = String(status || '').toLowerCase();

  if (['live', 'started', 'broadcasting', 'publishing'].includes(value)) {
    return {
      label: 'LIVE',
      color: 'error' as const,
      heroBackground: 'linear-gradient(135deg, #230507, #63171d 55%, #2d0b0f)',
      accent: '#ff6b72',
      description: 'On air now',
      pulse: true,
    };
  }

  if (['ready', 'created', 'prepared'].includes(value)) {
    return {
      label: 'ready',
      color: 'processing' as const,
      heroBackground: 'linear-gradient(135deg, #071a28, #15415e 55%, #0b2334)',
      accent: '#62c7ff',
      description: 'Ready to go live',
      pulse: false,
    };
  }

  if (['waiting', 'pending', 'starting'].includes(value)) {
    return {
      label: 'waiting',
      color: 'warning' as const,
      heroBackground: 'linear-gradient(135deg, #1f1405, #5f4011 55%, #281a07)',
      accent: '#ffcf70',
      description: 'Stream warming up',
      pulse: false,
    };
  }

  if (['ended', 'finished', 'completed', 'stopped'].includes(value)) {
    return {
      label: 'ended',
      color: 'default' as const,
      heroBackground: 'linear-gradient(135deg, #0f1720, #2f3d4d 55%, #161d26)',
      accent: '#d3d9e2',
      description: 'Broadcast ended',
      pulse: false,
    };
  }

  return {
    label: 'waiting',
    color: 'processing' as const,
    heroBackground: 'linear-gradient(135deg, #09121a, #143240)',
    accent: '#7ed7dd',
    description: 'Checking stream status',
    pulse: false,
  };
};

const getPosterUrl = (item: LiveBroadcast) =>
  item.thumbnail_url || item.preview_image_url || item.snapshot_url || '';

export default function ExploreLivePage() {
  const { initialState } = useModel('@@initialState');
  const [streams, setStreams] = useState<LiveBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const getLiveCreateUrl = () => '/live/create';
  const handleGoLiveClick = () => {
    history.push(
      isLoggedIn
        ? getLiveCreateUrl()
        : `/login?redirect=${encodeURIComponent(getLiveCreateUrl())}`,
    );
  };

  useEffect(() => {
    let active = true;

    getLiveList()
      .then((data) => {
        if (active) {
          setStreams(data);
        }
      })
      .catch((error: any) => {
        if (active) {
          setStreams([]);
          setErrorMessage(
            error?.message || 'Unable to load live broadcasts right now.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card bordered={false} style={{ borderRadius: 20, marginBottom: 20 }}>
          <Space
            align="start"
            style={{ width: '100%', justifyContent: 'space-between' }}
            wrap
          >
            <div>
              <Tag color="error" style={{ marginBottom: 12 }}>
                LIVE CONTROL ROOM
              </Tag>
              <Title level={2} style={{ margin: 0 }}>
                Explore Live Streams
              </Title>
              <Text type="secondary">
                Browse live events created through Django, then open each room
                to manage stream state and Ant Media playback.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<VideoCameraOutlined />}
              onClick={handleGoLiveClick}
            >
              Go Live
            </Button>
          </Space>
        </Card>

        {errorMessage ? (
          <Alert
            type="warning"
            showIcon
            message={errorMessage}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        {loading ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        ) : streams.length === 0 ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Empty description="No live streams are available yet.">
              <Button type="primary" onClick={handleGoLiveClick}>
                Create the first stream
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[20, 20]}>
            {streams.map((item) => {
              const creatorName =
                item.creator?.name ||
                item.creator?.username ||
                item.creator?.email ||
                'Creator';
              const viewerCount = item.viewer_count ?? item.viewerCount ?? 0;
              const status = getStatusPresentation(item.status);
              const posterUrl = getPosterUrl(item);

              return (
                <Col xs={24} sm={12} xl={8} key={String(item.id)}>
                  <Card
                    hoverable
                    bordered={false}
                    style={{ borderRadius: 18, overflow: 'hidden' }}
                    cover={
                      <div
                        style={{
                          aspectRatio: '16 / 9',
                          background: posterUrl
                            ? `linear-gradient(180deg, rgba(3, 7, 18, 0.04), rgba(3, 7, 18, 0.66)), url(${posterUrl}) center / cover no-repeat`
                            : status.heroBackground,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          color: '#fff',
                          padding: 18,
                          position: 'relative',
                        }}
                      >
                        <Space
                          style={{
                            justifyContent: 'space-between',
                            width: '100%',
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 12px',
                              borderRadius: 999,
                              background:
                                status.label === 'LIVE'
                                  ? 'rgba(127, 29, 29, 0.92)'
                                  : 'rgba(15, 23, 42, 0.68)',
                              boxShadow:
                                status.label === 'LIVE'
                                  ? '0 10px 24px rgba(127, 29, 29, 0.35)'
                                  : '0 10px 24px rgba(15, 23, 42, 0.16)',
                            }}
                          >
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: status.accent,
                                boxShadow: status.pulse
                                  ? `0 0 0 6px ${status.accent}33`
                                  : 'none',
                              }}
                            />
                            <Text
                              style={{
                                color: '#fff',
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                textTransform:
                                  status.label === 'LIVE'
                                    ? 'uppercase'
                                    : 'none',
                              }}
                            >
                              {status.label}
                            </Text>
                          </div>
                          <Tag
                            color={status.color}
                            style={{ marginInlineEnd: 0, borderRadius: 999 }}
                          >
                            {status.description}
                          </Tag>
                        </Space>

                        <div>
                          <Text
                            style={{
                              color: 'rgba(255,255,255,0.82)',
                              display: 'block',
                              marginBottom: 8,
                            }}
                          >
                            {item.category || 'Live broadcast'}
                          </Text>
                          <Title
                            level={4}
                            style={{
                              margin: 0,
                              color: '#fff',
                              textAlign: 'left',
                              textShadow: '0 4px 22px rgba(0,0,0,0.35)',
                            }}
                          >
                            {item.title || item.name || `Stream ${item.id}`}
                          </Title>
                        </div>
                      </div>
                    }
                    onClick={() => history.push(`/live/${item.id}`)}
                  >
                    <Space
                      direction="vertical"
                      size={10}
                      style={{ width: '100%' }}
                    >
                      <Space
                        align="center"
                        style={{
                          justifyContent: 'space-between',
                          width: '100%',
                        }}
                      >
                        <Space align="center">
                          <Avatar size="small" src={item.creator?.avatar_url}>
                            {creatorName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Text type="secondary">{creatorName}</Text>
                        </Space>
                        <Tag
                          icon={<EyeOutlined />}
                          style={{ borderRadius: 999 }}
                        >
                          {viewerCount.toLocaleString()} viewers
                        </Tag>
                      </Space>
                      <Space wrap>
                        <Tag color={status.color} style={{ borderRadius: 999 }}>
                          {status.label}
                        </Tag>
                        <Text type="secondary">{status.description}</Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>
    </PageContainer>
  );
}
