import VideoCard from '@/components/VideoCard';
import {
  CodeOutlined,
  ControlOutlined,
  GlobalOutlined,
  InboxOutlined,
  ReadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Typography,
  Upload,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import styles from './index.less';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const TAGS = [
  'All',
  'React',
  'Streaming',
  'Blockchain',
  'Data Science',
  'Gaming',
  'AI',
];

const TagsBar = () => {
  const [active, setActive] = useState('All');

  return (
    <div className={styles.tagsWrap}>
      <div className={styles.tagsBar}>
        {TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActive(tag)}
            className={`${styles.tagChip} ${
              active === tag ? styles.tagChipActive : ''
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};

const ChannelRow = ({ title, path, items, icon, description }: any) => (
  <section className={styles.sectionBlock}>
    <div className={styles.sectionHeader}>
      <div className={styles.sectionTitleWrap}>
        <span className={styles.sectionIcon}>{icon}</span>
        <div>
          <Title level={3} className={styles.sectionTitle}>
            {title}
          </Title>
          <Text className={styles.sectionDescription}>{description}</Text>
        </div>
      </div>
      <Button
        type="link"
        onClick={() => history.push(path)}
        className={styles.sectionAction}
      >
        Show more <RightOutlined style={{ fontSize: 10 }} />
      </Button>
    </div>

    <Row gutter={[20, 24]}>
      {items.map((item: any) => (
        <Col xs={24} sm={12} md={8} lg={6} xl={6} key={item.streamId}>
          <VideoCard data={item} />
        </Col>
      ))}
    </Row>
  </section>
);

export default () => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsUploadOpen(true);
    window.addEventListener('open-upload-modal', handleOpen);
    return () => window.removeEventListener('open-upload-modal', handleOpen);
  }, []);

  const mockData = {
    tech: [
      {
        streamId: 'test',
        name: 'Live: Infrastructure Monitor',
        author: 'Director',
        views: '1.2K',
        status: 'broadcasting',
        date: 'Live now',
      },
    ],
    edu: [
      {
        streamId: 'edu-1',
        name: 'PhD Thesis Defense Preparation',
        author: 'Academic',
        views: '5K',
        date: '2 hours ago',
      },
    ],
    game: [
      {
        streamId: 'game-1',
        name: 'Wukong 4K HDR Gameplay',
        author: 'Pro Gamer',
        views: '250K',
        date: 'Yesterday',
      },
    ],
    news: [
      {
        streamId: 'news-1',
        name: 'Platform 2.0 Roadmap',
        author: 'Official',
        views: '3K',
        date: 'Today',
      },
    ],
  };

  return (
    <PageContainer title={false} ghost contentWidth="Fluid">
      <div className={styles.pageShell}>
        <Card bordered={false} className={styles.heroCard}>
          <div className={styles.heroHeader}>
            <div>
              <Text className={styles.heroEyebrow}>Featured categories</Text>
              <Title level={2} className={styles.heroTitle}>
                Discover live channels and curated media picks.
              </Title>
              <Text className={styles.heroDescription}>
                Browse trending streams, sharp educational content, gaming
                highlights, and platform updates in one place.
              </Text>
            </div>
          </div>
          <TagsBar />
        </Card>

        <ChannelRow
          title="Technology"
          path="/tech"
          icon={<CodeOutlined />}
          description="Infrastructure, developer tooling, and live product demos."
          items={mockData.tech}
        />
        <ChannelRow
          title="Education"
          path="/edu"
          icon={<ReadOutlined />}
          description="Learning sessions, explainers, and academic broadcasts."
          items={mockData.edu}
        />
        <ChannelRow
          title="Gaming"
          path="/game"
          icon={<ControlOutlined />}
          description="Gameplay streams, highlight reels, and creator moments."
          items={mockData.game}
        />
        <ChannelRow
          title="News"
          path="/news"
          icon={<GlobalOutlined />}
          description="Platform announcements, updates, and current coverage."
          items={mockData.news}
        />

        <Modal
          title={
            <Title level={4} style={{ margin: 0 }}>
              Upload Content
            </Title>
          }
          open={isUploadOpen}
          onCancel={() => setIsUploadOpen(false)}
          footer={null}
          width={560}
          centered
        >
          <Form
            layout="vertical"
            onFinish={() => {
              message.success('Success! Processing video...');
              setIsUploadOpen(false);
            }}
          >
            <Form.Item label="Video File">
              <Dragger
                accept="video/*"
                maxCount={1}
                customRequest={({ onSuccess }) =>
                  setTimeout(() => onSuccess?.('ok'), 1000)
                }
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: '#5bd1d7' }} />
                </p>
                <p className="ant-upload-text">Click or drag file to upload</p>
                <p className="ant-upload-hint">
                  Support high quality MP4, WebM formats
                </p>
              </Dragger>
            </Form.Item>
            <Form.Item label="Title" name="title" rules={[{ required: true }]}>
              <Input placeholder="Enter video title" />
            </Form.Item>
            <Form.Item label="Channel">
              <Space wrap>
                {['Tech', 'Edu', 'Game', 'News'].map((channel) => (
                  <Button key={channel} shape="round">
                    {channel}
                  </Button>
                ))}
              </Space>
            </Form.Item>
            <Button
              type="primary"
              block
              size="large"
              htmlType="submit"
              style={{
                background: '#5bd1d7',
                color: '#000',
                fontWeight: 700,
                border: 'none',
                marginTop: 12,
              }}
            >
              Publish
            </Button>
          </Form>
        </Modal>
      </div>
    </PageContainer>
  );
};
