import {
  deleteVideo,
  getPreferredThumbnail,
  listMyVideos,
  regenerateVideoThumbnail,
  updateVideo,
  type VideoItem,
} from '@/services/videos';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

export default function MyVideosPage() {
  const { initialState } = useModel('@@initialState');
  const categoryOptions = (initialState?.publicCategories || []).map(
    (category) => ({
      label: category.name,
      value: category.slug,
    }),
  );
  const [form] = Form.useForm();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | number | null>(
    null,
  );
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [saving, setSaving] = useState(false);

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

  const openEditModal = (video: VideoItem) => {
    setEditingVideo(video);
    form.setFieldsValue({
      title: video.title || video.name || '',
      description: video.description || '',
      category: video.category || undefined,
    });
  };

  const handleEditSubmit = async (values: {
    title: string;
    description?: string;
    category?: string;
  }) => {
    if (!editingVideo) {
      return;
    }

    setSaving(true);
    try {
      const updated = await updateVideo(editingVideo.id, values);
      setVideos((current) =>
        current.map((video) =>
          video.id === editingVideo.id ? updated : video,
        ),
      );
      message.success('Video details updated.');
      setEditingVideo(null);
      form.resetFields();
    } catch (error: any) {
      message.error(error?.message || 'Unable to update this video.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateThumbnail = async (id: string | number) => {
    setRegeneratingId(id);
    try {
      await regenerateVideoThumbnail(id);
      await loadVideos();
      message.success('Thumbnail regeneration started successfully.');
    } catch (error: any) {
      message.error(error?.message || 'Unable to regenerate the thumbnail.');
    } finally {
      setRegeneratingId(null);
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
                Manage uploaded videos, refine metadata, and refresh thumbnail
                covers.
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
              renderItem={(video) => {
                const thumbnail = getPreferredThumbnail(video);

                return (
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
                      <Button
                        key="edit"
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(video)}
                      >
                        Edit
                      </Button>,
                      <Button
                        key="thumbnail"
                        type="link"
                        icon={<PictureOutlined />}
                        loading={regeneratingId === video.id}
                        onClick={() => handleRegenerateThumbnail(video.id)}
                      >
                        Regenerate Thumbnail
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
                    <div
                      style={{
                        display: 'flex',
                        gap: 20,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          width: 220,
                          maxWidth: '100%',
                          borderRadius: 16,
                          overflow: 'hidden',
                          background: '#0f172a',
                          aspectRatio: '16/9',
                          flexShrink: 0,
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
                            <Text type="secondary">No thumbnail yet</Text>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Space wrap style={{ marginBottom: 8 }}>
                          <Title level={4} style={{ margin: 0 }}>
                            {video.title || video.name || `Video #${video.id}`}
                          </Title>
                          {video.file_url ? (
                            <Tag color="processing">Ready</Tag>
                          ) : (
                            <Tag>Processing</Tag>
                          )}
                          {video.category_display ? (
                            <Tag>{video.category_display}</Tag>
                          ) : null}
                        </Space>
                        <Text
                          type="secondary"
                          style={{ display: 'block', marginBottom: 8 }}
                        >
                          {video.description || 'No description provided.'}
                        </Text>
                        <Space direction="vertical" size={4}>
                          <Text type="secondary">
                            Created: {video.created_at || 'Recently uploaded'}
                          </Text>
                          <Text type="secondary">
                            File URL: {video.file_url || 'Not available yet'}
                          </Text>
                          <Text type="secondary">
                            Thumbnail:{' '}
                            {thumbnail ? 'Available' : 'Not available yet'}
                          </Text>
                        </Space>
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </Card>
      </div>

      <Modal
        title="Edit video details"
        open={Boolean(editingVideo)}
        onCancel={() => {
          setEditingVideo(null);
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
