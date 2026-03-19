import {
  ArrowLeftOutlined,
  DesktopOutlined,
  HeartOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { history, useParams } from '@umijs/max';
import {
  Badge,
  Button,
  Card,
  Col,
  Input,
  List,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';

const { Title, Text } = Typography;

export default () => {
  const { id } = useParams<{ id: string }>();

  // 1. 之前测试成功的 play.html 地址
  const playUrl = `https://streaming-api-live.pttblockchain.online/live/play.html?name=${id}&autoplay=true`;

  // 2. 备用：如果你想直接拿到 .m3u8 地址供其他播放器使用
  const m3u8Url = `https://streaming-api-live.pttblockchain.online/live/streams/${id}.m3u8`;

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* 顶部导航 */}
      <div
        style={{
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <Space size={16}>
          <Button
            icon={<ArrowLeftOutlined />}
            shape="circle"
            onClick={() => history.push('/')}
          />
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Stream: {id}
            </Title>
            <Space>
              <Badge status="processing" color="#f5222d" text="LIVE" />
              <Tag color="blue" icon={<DesktopOutlined />}>
                HLS Protocol
              </Tag>
            </Space>
          </div>
        </Space>
        <Button type="primary" icon={<HeartOutlined />}>
          Follow Stream
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧：播放器区域 */}
        <Col xs={24} lg={18}>
          <div
            style={{
              backgroundColor: '#000',
              borderRadius: 16,
              overflow: 'hidden',
              aspectRatio: '16/9',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            }}
          >
            <iframe
              src={playUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              title="Stream Player"
            />
          </div>

          <Card style={{ marginTop: 24, borderRadius: 16 }}>
            <Tabs
              items={[
                {
                  key: '1',
                  label: 'Broadcast Info',
                  children: (
                    <div style={{ padding: '10px 0' }}>
                      <Text strong>Source URL:</Text>
                      <code
                        style={{
                          display: 'block',
                          background: '#f5f5f5',
                          padding: 8,
                          marginTop: 8,
                          borderRadius: 4,
                        }}
                      >
                        {m3u8Url}
                      </code>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>

        {/* 右侧：聊天区域 */}
        <Col xs={24} lg={6}>
          <Card
            title="Live Chat"
            bordered={false}
            style={{
              borderRadius: 16,
              height: '700px',
              display: 'flex',
              flexDirection: 'column',
            }}
            bodyStyle={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <List
                dataSource={[
                  {
                    user: 'System',
                    content: `Joined stream ${id} successfully.`,
                  },
                ]}
                renderItem={(item) => (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 12, color: '#5bd1d7' }}>
                      {item.user}
                    </Text>
                    <div
                      style={{
                        background: '#f5f5f5',
                        padding: '8px 12px',
                        borderRadius: '4px 12px 12px 12px',
                        marginTop: 4,
                      }}
                    >
                      <Text>{item.content}</Text>
                    </div>
                  </div>
                )}
              />
            </div>
            <Input.Group compact style={{ marginTop: 16 }}>
              <Input
                style={{ width: 'calc(100% - 46px)' }}
                placeholder="Chat..."
              />
              <Button type="primary" icon={<SendOutlined />} />
            </Input.Group>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
