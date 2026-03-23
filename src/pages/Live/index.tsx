import { EyeOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
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

export default function ExploreLivePage() {
  const [streams, setStreams] = useState<LiveBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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
              onClick={() => history.push('/live/create')}
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
              <Button
                type="primary"
                onClick={() => history.push('/live/create')}
              >
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

              return (
                <Col xs={24} sm={12} xl={8} key={String(item.id)}>
                  <Card
                    hoverable
                    bordered={false}
                    style={{ borderRadius: 18 }}
                    cover={
                      <div
                        style={{
                          aspectRatio: '16 / 9',
                          background:
                            'linear-gradient(135deg, #09121a, #143240)',
                          display: 'grid',
                          placeItems: 'center',
                          color: '#fff',
                          padding: 20,
                        }}
                      >
                        <Space direction="vertical" align="center" size={8}>
                          <Tag color={getStatusColor(item.status)}>
                            {(item.status || 'created').toUpperCase()}
                          </Tag>
                          <Title
                            level={4}
                            style={{
                              margin: 0,
                              color: '#fff',
                              textAlign: 'center',
                            }}
                          >
                            {item.title || item.name || `Stream ${item.id}`}
                          </Title>
                        </Space>
                      </div>
                    }
                    onClick={() => history.push(`/live/${item.id}`)}
                  >
                    <Space
                      direction="vertical"
                      size={10}
                      style={{ width: '100%' }}
                    >
                      <Text strong>
                        {item.title || item.name || `Stream ${item.id}`}
                      </Text>
                      <Text type="secondary">
                        {item.category || 'Live broadcast'}
                      </Text>
                      <Space align="center">
                        <Avatar size="small" src={item.creator?.avatar_url}>
                          {creatorName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Text type="secondary">{creatorName}</Text>
                      </Space>
                      <Space wrap>
                        <Tag color={getStatusColor(item.status)}>
                          {(item.status || 'created').toUpperCase()}
                        </Tag>
                        <Tag icon={<EyeOutlined />}>
                          {viewerCount.toLocaleString()} viewers
                        </Tag>
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
