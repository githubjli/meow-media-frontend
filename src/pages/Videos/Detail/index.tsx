import {
  deleteVideo,
  getPreferredThumbnail,
  getVideoDetail,
  regenerateVideoThumbnail,
  updateVideo,
  type VideoItem,
} from '@/services/videos';
import {
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text, Paragraph } = Typography;

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { initialState } = useModel('@@initialState');
  const categoryOptions = (initialState?.publicCategories || []).map(
    (category) => ({
      label: category.name,
      value: category.slug,
    }),
  );
  const [form] = Form.useForm();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const loadVideo = async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await getVideoDetail(id);
      setVideo(data);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to load this video.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialState?.authLoading && !initialState?.currentUser?.email) {
      history.replace('/login');
      return;
    }

    if (!id || !initialState?.currentUser?.email) {
      return;
    }

    loadVideo();
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

  const openEditModal = () => {
    if (!video) {
      return;
    }

    form.setFieldsValue({
      title: video.title || video.name || '',
      description: video.description || '',
      category: video.category || undefined,
    });
    setEditing(true);
  };

  const handleEditSubmit = async (values: {
    title: string;
    description?: string;
    category?: string;
  }) => {
    if (!video) {
      return;
    }

    setSaving(true);
    try {
      const updated = await updateVideo(video.id, values);
      setVideo(updated);
      message.success('Video details updated.');
      setEditing(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error?.message || 'Unable to update this video.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateThumbnail = async () => {
    if (!video) {
      return;
    }

    setRegenerating(true);
    try {
      await regenerateVideoThumbnail(video.id);
      await loadVideo();
      message.success('Thumbnail regeneration started successfully.');
    } catch (error: any) {
      message.error(error?.message || 'Unable to regenerate the thumbnail.');
    } finally {
      setRegenerating(false);
    }
  };

  const thumbnail = getPreferredThumbnail(video);

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
                  {video.category_display ? (
                    <Tag>{video.category_display}</Tag>
                  ) : null}
                  {video.created_at ? (
                    <Text type="secondary">Uploaded {video.created_at}</Text>
                  ) : null}
                </Space>
              </div>
              <Space wrap>
                <Button onClick={() => history.push('/videos/mine')}>
                  Back
                </Button>
                <Button icon={<EditOutlined />} onClick={openEditModal}>
                  Edit
                </Button>
                <Button
                  icon={<PictureOutlined />}
                  loading={regenerating}
                  onClick={handleRegenerateThumbnail}
                >
                  Regenerate Thumbnail
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

            <div style={{ marginBottom: 20 }}>
              <Title level={4}>Thumbnail</Title>
              <div
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#0f172a',
                  aspectRatio: '16/9',
                }}
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt={video.title || `Video ${video.id}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text type="secondary">No thumbnail available yet</Text>
                  </div>
                )}
              </div>
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
              <Text type="secondary">
                Thumbnail URL: {thumbnail || 'Not available yet'}
              </Text>
              {video.owner_email ? (
                <Text type="secondary">Owner: {video.owner_email}</Text>
              ) : null}
            </Space>
          </Card>
        )}
      </div>

      <Modal
        title="Edit video details"
        open={editing}
        onCancel={() => {
          setEditing(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Save changes"
        confirmLoading={saving}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
          requiredMark={false}
        >
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Please enter a title.' }]}
          >
            <Input placeholder="Enter video title" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={4} placeholder="Optional description" />
          </Form.Item>
          <Form.Item label="Category" name="category">
            <Select
              allowClear
              placeholder="Select a category"
              options={categoryOptions}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
