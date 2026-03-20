import { deleteVideo, getVideoDetail, type VideoItem } from '@/services/videos';
import { DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text, Paragraph } = Typography;

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { initialState } = useModel('@@initialState');
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!initialState?.authLoading && !initialState?.currentUser?.email) {
      history.replace('/login');
      return;
    }

    if (!id || !initialState?.currentUser?.email) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    getVideoDetail(id)
      .then((data) => setVideo(data))
      .catch((error: any) =>
        setErrorMessage(error?.message || 'Unable to load this video.'),
      )
      .finally(() => setLoading(false));
  }, [id, initialState?.authLoading, initialState?.currentUser?.email]);

  const handleDelete = async () => {
    if (!id) {
      return;
    }

    setDeleting(true);
    try {
      await deleteVideo(id);
      message.success('Video deleted.');
      history.push('/videos/mine');
    } catch (error: any) {
      message.error(error?.message || 'Unable to delete this video.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 0 24px' }}>
        {loading ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        ) : errorMessage ? (
          <Alert type="error" showIcon message={errorMessage} />
        ) : !video ? (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <Empty description="Video not found." />
          </Card>
        ) : (
          <Card bordered={false} style={{ borderRadius: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                alignItems: 'flex-start',
                marginBottom: 20,
              }}
            >
              <div>
                <Title level={2} style={{ marginTop: 0, marginBottom: 8 }}>
                  {video.title || video.name || `Video #${video.id}`}
                </Title>
                <Space wrap>
                  <Tag color="processing">My video</Tag>
                  {video.created_at ? (
                    <Text type="secondary">Uploaded {video.created_at}</Text>
                  ) : null}
                </Space>
              </div>
              <Space>
                <Button onClick={() => history.push('/videos/mine')}>
                  Back
                </Button>
                <Popconfirm
                  title="Delete this video?"
                  description="This action cannot be undone."
                  okText="Delete"
                  cancelText="Cancel"
                  onConfirm={handleDelete}
                >
                  <Button danger icon={<DeleteOutlined />} loading={deleting}>
                    Delete
                  </Button>
                </Popconfirm>
              </Space>
            </div>

            {video.file_url ? (
              <video
                controls
                style={{
                  width: '100%',
                  borderRadius: 16,
                  background: '#000',
                  marginBottom: 20,
                }}
                src={video.file_url}
              />
            ) : (
              <Card
                size="small"
                style={{
                  marginBottom: 20,
                  borderRadius: 16,
                  textAlign: 'center',
                }}
              >
                <InboxOutlined style={{ fontSize: 28, color: '#5bd1d7' }} />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    This video file is not ready for playback yet.
                  </Text>
                </div>
              </Card>
            )}

            <Title level={4}>Details</Title>
            <Paragraph>
              {video.description || 'No description provided for this video.'}
            </Paragraph>
            <Space direction="vertical" size={4}>
              <Text type="secondary">Video ID: {video.id}</Text>
              <Text type="secondary">
                File URL: {video.file_url || 'Not available yet'}
              </Text>
              {video.owner_email ? (
                <Text type="secondary">Owner: {video.owner_email}</Text>
              ) : null}
            </Space>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
