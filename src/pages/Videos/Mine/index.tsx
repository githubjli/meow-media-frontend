import { deleteVideo, listMyVideos, type VideoItem } from '@/services/videos';
import { DeleteOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  List,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

export default function MyVideosPage() {
  const { initialState } = useModel('@@initialState');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const loadVideos = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const data = await listMyVideos();
      setVideos(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Unable to load your videos right now.',
      );
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialState?.authLoading && !initialState?.currentUser?.email) {
      history.replace('/login');
      return;
    }

    if (initialState?.currentUser?.email) {
      loadVideos();
    }
  }, [initialState?.authLoading, initialState?.currentUser?.email]);

  const handleDelete = async (id: string | number) => {
    setDeletingId(id);
    try {
      await deleteVideo(id);
      message.success('Video deleted.');
      setVideos((current) => current.filter((video) => video.id !== id));
    } catch (error: any) {
      message.error(error?.message || 'Unable to delete this video.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card bordered={false} style={{ borderRadius: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <div>
              <Title level={2} style={{ margin: 0 }}>
                My Videos
              </Title>
              <Text type="secondary">
                Manage uploaded videos, review details, or remove old uploads.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => history.push('/videos/upload')}
            >
              Upload
            </Button>
          </div>

          {errorMessage ? (
            <Alert
              type="error"
              showIcon
              message={errorMessage}
              style={{ marginBottom: 16 }}
            />
          ) : null}

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <Spin />
            </div>
          ) : videos.length === 0 ? (
            <Empty description="You have not uploaded any videos yet.">
              <Button
                type="primary"
                onClick={() => history.push('/videos/upload')}
              >
                Upload your first video
              </Button>
            </Empty>
          ) : (
            <List
              itemLayout="vertical"
              dataSource={videos}
              renderItem={(video) => (
                <List.Item
                  key={video.id}
                  actions={[
                    <Button
                      key="view"
                      type="link"
                      icon={<EyeOutlined />}
                      onClick={() => history.push(`/videos/${video.id}`)}
                    >
                      View
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="Delete this video?"
                      description="This action cannot be undone."
                      okText="Delete"
                      cancelText="Cancel"
                      onConfirm={() => handleDelete(video.id)}
                    >
                      <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        loading={deletingId === video.id}
                      >
                        Delete
                      </Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        <span>
                          {video.title || video.name || `Video #${video.id}`}
                        </span>
                        {video.file_url ? (
                          <Tag color="processing">Ready</Tag>
                        ) : (
                          <Tag>Processing</Tag>
                        )}
                      </Space>
                    }
                    description={
                      video.description || 'No description provided.'
                    }
                  />
                  <Space direction="vertical" size={4}>
                    <Text type="secondary">
                      File URL: {video.file_url || 'Not available yet'}
                    </Text>
                    <Text type="secondary">
                      Created: {video.created_at || 'Recently uploaded'}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
