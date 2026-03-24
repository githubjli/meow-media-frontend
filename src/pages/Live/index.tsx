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
      heroBackground: 'linear-gradient(135deg, #230507, #63171d 55%, #2d0b0f)',
      accent: '#ff6b72',
      description: 'On air now',
      pulse: true,
      badgeBackground: 'rgba(127, 29, 29, 0.92)',
    };
  }

  if (['ready', 'created', 'prepared'].includes(value)) {
    return {
      label: 'ready',
      heroBackground: 'linear-gradient(135deg, #1f1a16, #2a241f 55%, #201b17)',
      accent: '#efbc5c',
      description: 'Ready to go live',
      pulse: false,
      badgeBackground: 'rgba(116, 95, 64, 0.9)',
    };
  }

  if (['waiting', 'pending', 'starting'].includes(value)) {
    return {
      label: 'waiting',
      heroBackground: 'linear-gradient(135deg, #1f1405, #5f4011 55%, #281a07)',
      accent: '#ffcf70',
      description: 'Stream warming up',
      pulse: false,
      badgeBackground: 'rgba(116, 95, 64, 0.9)',
    };
  }

  if (['ended', 'finished', 'completed', 'stopped'].includes(value)) {
    return {
      label: 'ended',
      heroBackground: 'linear-gradient(135deg, #1f1a16, #2a241f 55%, #171310)',
      accent: '#cbbbaa',
      description: 'Broadcast ended',
      pulse: false,
      badgeBackground: 'rgba(88, 75, 63, 0.9)',
    };
  }

  return {
    label: 'waiting',
    heroBackground: 'linear-gradient(135deg, #1f1a16, #2a241f)',
    accent: '#b8872e',
    description: 'Checking stream status',
    pulse: false,
    badgeBackground: 'rgba(116, 95, 64, 0.9)',
  };
};

const getPosterUrl = (item: LiveBroadcast) =>
  item.thumbnail_url || item.preview_image_url || item.snapshot_url || '';

export default function ExploreLivePage() {
  const { initialState } = useModel('@@initialState');
  const isDark = Boolean(initialState?.darkTheme);
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
          <Row gutter={[14, 18]}>
            {streams.map((item) => {
              const creatorName =
                item.creator?.name ||
                item.creator?.username ||
                item.creator?.email ||
                'Creator';
              const viewerCount = item.viewer_count ?? item.viewerCount ?? 0;
              const status = getStatusPresentation(item.status);
              const posterUrl = getPosterUrl(item);
              const cardBackground = isDark ? '#2F2923' : '#fffdf8';
              const cardBorder = isDark
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(184, 135, 46, 0.18)';
              const titleColor = isDark ? '#F5F1EA' : '#2c2c2c';
              const metaColor = isDark ? '#CBBBAA' : '#948261';
              const thumbBackground = isDark ? '#211c18' : '#2c2c2c';

              return (
                <Col xs={24} sm={12} md={8} lg={6} xl={6} key={String(item.id)}>
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 14,
                      overflow: 'hidden',
                      padding: 8,
                      boxShadow: 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      border: cardBorder,
                      background: cardBackground,
                    }}
                    bodyStyle={{ padding: 0 }}
                    cover={
                      <div
                        style={{
                          aspectRatio: '16 / 9',
                          backgroundColor: thumbBackground,
                          background: posterUrl
                            ? `linear-gradient(180deg, rgba(31, 26, 22, 0.08), rgba(31, 26, 22, 0.5)), url(${posterUrl}) center / cover no-repeat`
                            : status.heroBackground,
                          display: 'flex',
                          color: '#fff',
                          borderRadius: 12,
                          marginBottom: 8,
                          padding: '8px 10px',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '2px 7px',
                            borderRadius: 999,
                            background: 'rgba(31, 26, 22, 0.56)',
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: status.accent,
                              boxShadow: status.pulse
                                ? `0 0 0 3px ${status.accent}33`
                                : 'none',
                            }}
                          />
                          <Text
                            style={{
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: 10.5,
                              lineHeight: 1,
                              letterSpacing: '0.02em',
                              textTransform:
                                status.label === 'LIVE' ? 'uppercase' : 'none',
                            }}
                          >
                            {status.label}
                          </Text>
                        </div>
                      </div>
                    }
                    onClick={() => history.push(`/live/${item.id}`)}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.transform = 'translateY(-2px)';
                      event.currentTarget.style.boxShadow = isDark
                        ? '0 10px 24px rgba(0, 0, 0, 0.34)'
                        : '0 10px 22px rgba(116, 95, 64, 0.12)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.transform = 'translateY(0)';
                      event.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text
                        style={{
                          display: 'block',
                          marginBottom: 4,
                          fontSize: 10.5,
                          letterSpacing: '0.02em',
                          textTransform: 'uppercase',
                          color: metaColor,
                        }}
                      >
                        {item.category || 'Live broadcast'}
                      </Text>
                      <Title
                        level={5}
                        style={{
                          margin: 0,
                          fontSize: 14,
                          lineHeight: 1.38,
                          color: titleColor,
                        }}
                        ellipsis={{ rows: 2 }}
                      >
                        {item.title || item.name || `Stream ${item.id}`}
                      </Title>
                    </div>

                    <Space
                      direction="vertical"
                      size={7}
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
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {creatorName}
                          </Text>
                        </Space>
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                            display: 'inline-flex',
                            gap: 4,
                            color: metaColor,
                          }}
                        >
                          <EyeOutlined />
                          {viewerCount.toLocaleString()} viewers
                        </Text>
                      </Space>
                      <Space align="center" size={6}>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: status.accent,
                            display: 'inline-block',
                          }}
                        />
                        <Text
                          type="secondary"
                          style={{ fontSize: 11, color: metaColor }}
                        >
                          {status.description}
                        </Text>
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
