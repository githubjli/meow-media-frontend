import { VideoCameraOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
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

const getViewerLabel = (item: LiveBroadcast) => {
  if (typeof item.viewerCount === 'number') {
    return `${item.viewerCount.toLocaleString()} watching`;
  }

  return 'Viewer count unavailable';
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
                LIVE NOW
              </Tag>
              <Title level={2} style={{ margin: 0 }}>
                Explore Live
              </Title>
              <Text type="secondary">
                Drop into real-time sessions, market updates, creator rooms, and
                community broadcasts.
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
            <Empty description="No one is live right now.">
              <Button
                type="primary"
                onClick={() => history.push('/live/create')}
              >
                Start the first stream
              </Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[20, 20]}>
            {streams.map((item) => (
              <Col xs={24} sm={12} xl={8} key={item.streamId}>
                <Card
                  hoverable
                  bordered={false}
                  style={{ borderRadius: 18 }}
                  cover={
                    <div
                      style={{
                        aspectRatio: '16 / 9',
                        background: 'linear-gradient(135deg, #09121a, #143240)',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#fff',
                      }}
                    >
                      <Space direction="vertical" align="center" size={8}>
                        <Tag color="error">LIVE</Tag>
                        <Title level={4} style={{ margin: 0, color: '#fff' }}>
                          {item.name || item.streamId}
                        </Title>
                      </Space>
                    </div>
                  }
                  onClick={() => history.push(`/live/${item.streamId}`)}
                >
                  <Space
                    direction="vertical"
                    size={8}
                    style={{ width: '100%' }}
                  >
                    <Text strong>{item.name || item.streamId}</Text>
                    <Text type="secondary">
                      {item.category || 'Live broadcast'}
                    </Text>
                    <Space wrap>
                      <Tag color="error">LIVE</Tag>
                      <Tag>{getViewerLabel(item)}</Tag>
                    </Space>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </PageContainer>
  );
}
