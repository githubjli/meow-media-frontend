import {
  CheckCircleFilled,
  EyeOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Avatar, Badge, Col, Empty, Row, Space, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';

const { Text, Title } = Typography;

// 单个视频卡片组件
const VideoCard = ({ stream }: { stream: any }) => {
  // AMS 返回的字段通常包括 streamId, status, name, description 等
  const isLive = stream.status === 'broadcasting';

  return (
    <div
      onClick={() => history.push(`/room/${stream.streamId}`)}
      style={{ cursor: 'pointer', transition: 'all 0.3s' }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
          aspectRatio: '16/9',
          marginBottom: 12,
          backgroundColor: '#f0f2f5',
        }}
      >
        <img
          src={
            stream.thumbnailUrl ||
            `https://via.placeholder.com/640x360?text=No+Thumbnail`
          }
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          {isLive ? (
            <Badge
              status="processing"
              color="#f5222d"
              text={<b style={{ color: '#fff' }}>LIVE</b>}
              style={{
                background: 'rgba(0,0,0,0.6)',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            />
          ) : (
            <Badge
              status="default"
              text={<span style={{ color: '#fff' }}>OFFLINE</span>}
              style={{
                background: 'rgba(0,0,0,0.4)',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            />
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <Avatar
          src={`https://api.dicebear.com/7.x/identicon/svg?seed=${stream.streamId}`}
        />
        <div style={{ flex: 1 }}>
          <Title
            level={5}
            style={{ margin: 0, fontSize: 14 }}
            ellipsis={{ rows: 2 }}
          >
            {stream.name || 'Untitled Stream'}
          </Title>
          <Text
            type="secondary"
            style={{ fontSize: 12, display: 'block', marginTop: 4 }}
          >
            {stream.category || 'General Content'}{' '}
            <CheckCircleFilled style={{ fontSize: 10 }} />
          </Text>
          <Space style={{ fontSize: 12 }}>
            <Text type="secondary">
              <EyeOutlined /> {stream.hlsViewerCount || 0} watching
            </Text>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default () => {
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStreams = async () => {
    try {
      // 注意：这里建议走 .umirc.ts 配置的 proxy 以避免跨域
      const response = await fetch('/live-api/rest/v2/broadcasts/list/0/20');
      const data = await response.json();
      setStreams(data);
    } catch (error) {
      console.error('Failed to fetch streams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
    const timer = setInterval(fetchStreams, 10000); // 每10秒自动刷新一次列表
    return () => clearInterval(timer);
  }, []);

  return (
    <PageContainer title={false}>
      <div style={{ marginBottom: 32 }}>
        <Title level={3}>
          <VideoCameraOutlined /> Global Streams
        </Title>
        <Text type="secondary">
          Real-time data from Ant Media Server nodes.
        </Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Spin size="large" />
        </div>
      ) : streams.length > 0 ? (
        <Row gutter={[24, 32]}>
          {streams.map((item) => (
            <Col xs={24} sm={12} md={8} lg={6} key={item.streamId}>
              <VideoCard stream={item} />
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="No active streams found" />
      )}
    </PageContainer>
  );
};
