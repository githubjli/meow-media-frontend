import {
  deleteVideo,
  getPreferredThumbnail,
  listAllVideos,
  updateVideo,
  type VideoItem,
} from '@/services/videos';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

const { Title, Text } = Typography;
const PAGE_SIZE = 10;

const isAdminUser = (user?: Record<string, any> | null) =>
  Boolean(
    user &&
      (user.is_admin ||
        user.is_staff ||
        user.is_superuser ||
        user.role === 'admin'),
  );

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function AllVideosPage() {
  const { initialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    owner: '',
    status: '',
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: PAGE_SIZE,
    total: 0,
  });

  const categoryOptions = (initialState?.publicCategories || []).map(
    (category) => ({
      label: category.name,
      value: category.slug,
    }),
  );
  const isAdmin = isAdminUser(initialState?.currentUser);

  const loadVideos = async (
    page = pagination.current,
    nextFilters = filters,
  ) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const payload = await listAllVideos({
        page,
        page_size: pagination.pageSize,
        search: nextFilters.search || undefined,
        category: nextFilters.category || undefined,
        owner: nextFilters.owner || undefined,
        status: nextFilters.status || undefined,
      });

      setVideos(payload.results || []);
      setPagination((current) => ({
        ...current,
        current: page,
        total: payload.count || 0,
      }));
    } catch (error: any) {
      setVideos([]);
      setErrorMessage(
        error?.message || 'Unable to load platform videos right now.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialState?.authLoading && !initialState?.currentUser?.email) {
      history.replace('/login');
      return;
    }

    if (!initialState?.authLoading && initialState?.currentUser && !isAdmin) {
      history.replace('/videos/mine');
      return;
    }

    if (isAdmin) {
      loadVideos(1, filters);
    }
  }, [initialState?.authLoading, initialState?.currentUser?.email, isAdmin]);

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
          video.id === editingVideo.id ? { ...video, ...updated } : video,
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

  const handleDelete = async (id: string | number) => {
    setDeletingId(id);
    try {
      await deleteVideo(id);
      message.success('Video deleted.');
      await loadVideos(pagination.current, filters);
    } catch (error: any) {
      message.error(error?.message || 'Unable to delete this video.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns = useMemo<ColumnsType<VideoItem>>(
    () => [
      {
        title: 'Thumbnail',
        dataIndex: 'thumbnail_url',
        key: 'thumbnail',
        width: 132,
        render: (_, record) => {
          const thumbnail = getPreferredThumbnail(record);
          return thumbnail ? (
            <Image
              src={thumbnail}
              alt={record.title || record.name || `Video ${record.id}`}
              width={96}
              height={54}
              style={{ objectFit: 'cover', borderRadius: 10 }}
              preview={false}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 54,
                borderRadius: 10,
                background: 'rgba(15, 23, 42, 0.08)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Text type="secondary">No image</Text>
            </div>
          );
        },
      },
      {
        title: 'Title',
        dataIndex: 'title',
        key: 'title',
        render: (_, record) => (
          <div>
            <Text strong>
              {record.title || record.name || `Video #${record.id}`}
            </Text>
            <Text type="secondary" style={{ display: 'block' }}>
              ID: {record.id}
            </Text>
          </div>
        ),
      },
      {
        title: 'Owner / Uploader',
        key: 'owner',
        render: (_, record) =>
          record.owner_name || record.owner_email || record.owner || '—',
      },
      {
        title: 'Category',
        key: 'category',
        render: (_, record) =>
          record.category_display || record.category || '—',
      },
      {
        title: 'Status',
        key: 'status',
        render: (_, record) => {
          const status = String(
            record.status || record.processing_status || 'unknown',
          );
          return (
            <Tag color={status === 'published' ? 'success' : 'default'}>
              {status}
            </Tag>
          );
        },
      },
      {
        title: 'Created',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (value) => formatDate(value),
      },
      {
        title: 'Likes',
        key: 'like_count',
        render: (_, record) => String(record.like_count ?? '—'),
      },
      {
        title: 'Comments',
        key: 'comment_count',
        render: (_, record) => String(record.comment_count ?? '—'),
      },
      {
        title: 'Actions',
        key: 'actions',
        fixed: 'right',
        render: (_, record) => (
          <Space size={4} wrap>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => history.push(`/videos/${record.id}`)}
            >
              View
            </Button>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete this video?"
              description="This action cannot be undone."
              okText="Delete"
              cancelText="Cancel"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                loading={deletingId === record.id}
              >
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deletingId],
  );

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card bordered={false} style={{ borderRadius: 20 }}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  All Videos
                </Title>
                <Text type="secondary">
                  Review platform-wide uploads with business-style filtering and
                  moderation controls.
                </Text>
              </div>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadVideos(pagination.current, filters)}
              >
                Refresh
              </Button>
            </div>

            {errorMessage ? (
              <Alert type="error" showIcon message={errorMessage} />
            ) : null}

            <Card
              size="small"
              style={{ borderRadius: 16, background: 'rgba(15, 23, 42, 0.03)' }}
              styles={{ body: { padding: 16 } }}
            >
              <Space wrap size={[12, 12]} style={{ width: '100%' }}>
                <Input
                  allowClear
                  placeholder="Search title or description"
                  prefix={<SearchOutlined />}
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  style={{ width: 240 }}
                />
                <Select
                  allowClear
                  placeholder="Category"
                  options={categoryOptions}
                  value={filters.category || undefined}
                  onChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      category: value || '',
                    }))
                  }
                  style={{ width: 180 }}
                />
                <Input
                  allowClear
                  placeholder="Owner"
                  value={filters.owner}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      owner: event.target.value,
                    }))
                  }
                  style={{ width: 180 }}
                />
                <Select
                  allowClear
                  placeholder="Status"
                  options={[
                    { label: 'Published', value: 'published' },
                    { label: 'Processing', value: 'processing' },
                    { label: 'Draft', value: 'draft' },
                  ]}
                  value={filters.status || undefined}
                  onChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      status: value || '',
                    }))
                  }
                  style={{ width: 160 }}
                />
                <Button type="primary" onClick={() => loadVideos(1, filters)}>
                  Apply Filters
                </Button>
              </Space>
            </Card>

            {loading ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <Spin />
              </div>
            ) : (
              <Table
                rowKey="id"
                dataSource={videos}
                columns={columns}
                scroll={{ x: 1180 }}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  onChange: (page) => loadVideos(page, filters),
                }}
              />
            )}
          </Space>
        </Card>

        <Modal
          open={Boolean(editingVideo)}
          title="Edit Video"
          onCancel={() => {
            setEditingVideo(null);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          confirmLoading={saving}
          okText="Save"
        >
          <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
            <Form.Item
              label="Title"
              name="title"
              rules={[{ required: true, message: 'Please enter a title.' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item label="Description" name="description">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item label="Category" name="category">
              <Select allowClear options={categoryOptions} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </PageContainer>
  );
}
