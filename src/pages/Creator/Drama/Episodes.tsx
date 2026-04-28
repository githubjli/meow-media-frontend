import {
  createCreatorDramaEpisode,
  deleteCreatorDramaEpisode,
  getCreatorDrama,
  getCreatorDramaEpisodes,
  updateCreatorDramaEpisode,
} from '@/services/drama';
import type {
  CreatorDramaEpisodePayload,
  DramaEpisode,
  DramaSeries,
} from '@/types/drama';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useMemo, useState } from 'react';

const { Text, Title } = Typography;

type EpisodeFormValues = {
  episode_no?: number;
  title: string;
  description?: string;
  video_url?: string;
  hls_url?: string;
  unlock_type?: string;
  points_price?: number;
  status?: string;
  duration_seconds?: number;
};

const resolveEpisodePrice = (item: DramaEpisode) =>
  item.points_price ?? item.meow_points_price ?? item.coin_price ?? '-';

const formatDate = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export default function CreatorDramaEpisodesPage() {
  const intl = useIntl();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const { initialState } = useModel('@@initialState');
  const [form] = Form.useForm<EpisodeFormValues>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [series, setSeries] = useState<DramaSeries | null>(null);
  const [episodes, setEpisodes] = useState<DramaEpisode[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<DramaEpisode | null>(
    null,
  );
  const [videoFileList, setVideoFileList] = useState<UploadFile[]>([]);
  const [thumbnailFileList, setThumbnailFileList] = useState<UploadFile[]>([]);

  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const isCreator = Boolean(
    initialState?.currentUser &&
      (initialState.currentUser.is_creator ||
        initialState.currentUser.role === 'creator' ||
        initialState.currentUser.user_type === 'creator'),
  );

  const loadData = async () => {
    if (!params.id) {
      setErrorMessage(
        intl.formatMessage({ id: 'drama.creator.episodes.error.notFound' }),
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const [seriesData, episodesData] = await Promise.all([
        getCreatorDrama(params.id),
        getCreatorDramaEpisodes(params.id),
      ]);
      setSeries(seriesData);
      setEpisodes(episodesData || []);
    } catch (error: any) {
      setErrorMessage(
        error?.message ||
          intl.formatMessage({ id: 'drama.creator.episodes.error.load' }),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      history.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (!isCreator) {
      setLoading(false);
      return;
    }
    loadData();
  }, [intl, isCreator, isLoggedIn, location.pathname, params.id]);

  const statusOptions = useMemo(
    () => [
      {
        label: intl.formatMessage({ id: 'drama.creator.status.draft' }),
        value: 'draft',
      },
      {
        label: intl.formatMessage({ id: 'drama.creator.status.published' }),
        value: 'published',
      },
      {
        label: intl.formatMessage({ id: 'drama.creator.status.archived' }),
        value: 'archived',
      },
    ],
    [intl],
  );

  const unlockOptions = useMemo(
    () => [
      {
        label: intl.formatMessage({ id: 'drama.creator.unlockType.free' }),
        value: 'free',
      },
      {
        label: intl.formatMessage({
          id: 'drama.creator.unlockType.meowPoints',
        }),
        value: 'meow_points',
      },
      {
        label: intl.formatMessage({ id: 'drama.creator.unlockType.coin' }),
        value: 'coin',
      },
      {
        label: intl.formatMessage({
          id: 'drama.creator.unlockType.membership',
        }),
        value: 'membership',
      },
      {
        label: intl.formatMessage({ id: 'drama.creator.unlockType.adReward' }),
        value: 'ad_reward',
      },
    ],
    [intl],
  );

  const openCreateModal = () => {
    setEditingEpisode(null);
    setVideoFileList([]);
    setThumbnailFileList([]);
    form.resetFields();
    form.setFieldsValue({
      status: 'draft',
      unlock_type: 'free',
      points_price: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (item: DramaEpisode) => {
    setEditingEpisode(item);
    setVideoFileList([]);
    setThumbnailFileList([]);
    form.setFieldsValue({
      episode_no: item.episode_no || item.number,
      title: item.title || '',
      description: item.description || '',
      video_url: item.video_url || item.playback_url || '',
      hls_url: item.hls_url || '',
      unlock_type: item.unlock_type || 'free',
      points_price: Number(
        item.points_price ?? item.meow_points_price ?? item.coin_price ?? 0,
      ),
      status: item.status || 'draft',
      duration_seconds: item.duration_seconds || undefined,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: EpisodeFormValues) => {
    if (!params.id) return;

    const payload: CreatorDramaEpisodePayload = {
      episode_no: values.episode_no,
      title: values.title,
      description: values.description,
      video_url: values.video_url,
      hls_url: values.hls_url,
      unlock_type: values.unlock_type,
      points_price: values.points_price,
      status: values.status,
      duration_seconds: values.duration_seconds,
    };

    const videoFile = videoFileList[0]?.originFileObj;
    if (videoFile) payload.video_file = videoFile as File;

    const thumbnailFile = thumbnailFileList[0]?.originFileObj;
    if (thumbnailFile) payload.thumbnail = thumbnailFile as File;

    setSaving(true);
    try {
      if (editingEpisode?.id) {
        await updateCreatorDramaEpisode(params.id, editingEpisode.id, payload);
        message.success(
          intl.formatMessage({ id: 'drama.creator.episodes.update.success' }),
        );
      } else {
        await createCreatorDramaEpisode(params.id, payload);
        message.success(
          intl.formatMessage({ id: 'drama.creator.episodes.create.success' }),
        );
      }
      setModalOpen(false);
      await loadData();
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'drama.creator.episodes.error.submit' }),
      );
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<DramaEpisode> = useMemo(
    () => [
      {
        title: intl.formatMessage({
          id: 'drama.creator.episodes.fields.episodeNo',
        }),
        key: 'episode_no',
        render: (_, item) => item.episode_no || item.number || '-',
      },
      {
        title: intl.formatMessage({
          id: 'drama.creator.episodes.fields.title',
        }),
        dataIndex: 'title',
        key: 'title',
      },
      {
        title: intl.formatMessage({
          id: 'drama.creator.episodes.fields.status',
        }),
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => (
          <Tag>
            {intl.formatMessage({
              id: `drama.creator.status.${value || 'draft'}`,
            })}
          </Tag>
        ),
      },
      {
        title: intl.formatMessage({
          id: 'drama.creator.episodes.fields.unlockType',
        }),
        dataIndex: 'unlock_type',
        key: 'unlock_type',
        render: (value: string) => (
          <Tag>
            {intl.formatMessage({
              id: `drama.creator.unlockType.${value || 'free'}`,
            })}
          </Tag>
        ),
      },
      {
        title: intl.formatMessage({
          id: 'drama.creator.episodes.fields.pointsPrice',
        }),
        key: 'points_price',
        render: (_, item) => resolveEpisodePrice(item),
      },
      {
        title: intl.formatMessage({
          id: 'drama.creator.episodes.fields.durationSeconds',
        }),
        dataIndex: 'duration_seconds',
        key: 'duration_seconds',
        render: (value: number) => value || '-',
      },
      {
        title: intl.formatMessage({ id: 'drama.creator.fields.updatedAt' }),
        dataIndex: 'updated_at',
        key: 'updated_at',
        render: (value: string) => formatDate(value),
      },
      {
        title: intl.formatMessage({ id: 'drama.creator.actions.column' }),
        key: 'actions',
        width: 220,
        render: (_, item) => (
          <Space wrap>
            <Button type="link" onClick={() => openEditModal(item)}>
              {intl.formatMessage({ id: 'drama.creator.actions.edit' })}
            </Button>
            <Popconfirm
              title={intl.formatMessage({ id: 'drama.creator.actions.delete' })}
              okText={intl.formatMessage({ id: 'common.yes' })}
              cancelText={intl.formatMessage({ id: 'common.cancel' })}
              onConfirm={async () => {
                if (!params.id) return;
                try {
                  await deleteCreatorDramaEpisode(params.id, item.id);
                  message.success(
                    intl.formatMessage({
                      id: 'drama.creator.episodes.delete.success',
                    }),
                  );
                  await loadData();
                } catch (error: any) {
                  if (error?.status === 404 || error?.status === 405) {
                    message.warning(
                      intl.formatMessage({
                        id: 'drama.creator.delete.unsupported',
                      }),
                    );
                    return;
                  }
                  message.error(
                    error?.message ||
                      intl.formatMessage({
                        id: 'drama.creator.episodes.delete.failed',
                      }),
                  );
                }
              }}
            >
              <Button type="link" danger>
                {intl.formatMessage({ id: 'drama.creator.actions.delete' })}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [intl, params.id],
  );

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Space
            align="start"
            style={{ width: '100%', justifyContent: 'space-between' }}
            wrap
          >
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>
                {intl.formatMessage(
                  { id: 'drama.creator.episodes.title' },
                  {
                    title:
                      series?.title ||
                      intl.formatMessage({
                        id: 'drama.creator.episodes.defaultTitle',
                      }),
                  },
                )}
              </Title>
              <Text type="secondary">
                {intl.formatMessage({ id: 'drama.creator.episodes.subtitle' })}
              </Text>
            </div>
            <Space>
              <Button onClick={() => history.push('/creator/dramas')}>
                {intl.formatMessage({ id: 'nav.myDrama' })}
              </Button>
              <Button
                type="primary"
                onClick={openCreateModal}
                disabled={!isCreator}
              >
                {intl.formatMessage({
                  id: 'drama.creator.actions.createEpisode',
                })}
              </Button>
            </Space>
          </Space>
        </Card>

        <div style={{ marginTop: 14 }}>
          {!isCreator ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Empty
                description={intl.formatMessage({
                  id: 'drama.creator.permissionDenied',
                })}
              >
                <Button onClick={() => history.push('/home')}>
                  {intl.formatMessage({ id: 'nav.home' })}
                </Button>
              </Empty>
            </Card>
          ) : loading ? (
            <Card loading variant="borderless" style={{ borderRadius: 20 }} />
          ) : errorMessage ? (
            <Alert
              type="error"
              showIcon
              message={errorMessage}
              action={
                <Button size="small" onClick={loadData}>
                  {intl.formatMessage({ id: 'common.refresh' })}
                </Button>
              }
            />
          ) : episodes.length === 0 ? (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Empty
                description={intl.formatMessage({
                  id: 'drama.creator.episodes.empty',
                })}
              >
                <Button type="primary" onClick={openCreateModal}>
                  {intl.formatMessage({
                    id: 'drama.creator.actions.createEpisode',
                  })}
                </Button>
              </Empty>
            </Card>
          ) : (
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Table<DramaEpisode>
                rowKey={(row) => String(row.id)}
                columns={columns}
                dataSource={episodes}
                pagination={false}
                scroll={{ x: 900 }}
              />
            </Card>
          )}
        </div>

        <Modal
          open={modalOpen}
          title={intl.formatMessage({
            id: editingEpisode
              ? 'drama.creator.episodes.modal.editTitle'
              : 'drama.creator.episodes.modal.createTitle',
          })}
          onCancel={() => setModalOpen(false)}
          onOk={() => form.submit()}
          confirmLoading={saving}
          okText={intl.formatMessage({ id: 'common.save' })}
          cancelText={intl.formatMessage({ id: 'common.cancel' })}
          width={720}
        >
          <Form<EpisodeFormValues>
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Space size={12} style={{ width: '100%' }} align="start" wrap>
              <Form.Item
                name="episode_no"
                label={intl.formatMessage({
                  id: 'drama.creator.episodes.fields.episodeNo',
                })}
                style={{ width: 160 }}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="duration_seconds"
                label={intl.formatMessage({
                  id: 'drama.creator.episodes.fields.durationSeconds',
                })}
                style={{ width: 200 }}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Space>

            <Form.Item
              name="title"
              label={intl.formatMessage({
                id: 'drama.creator.episodes.fields.title',
              })}
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="description"
              label={intl.formatMessage({
                id: 'drama.creator.episodes.fields.description',
              })}
            >
              <Input.TextArea rows={3} />
            </Form.Item>

            <Space size={12} style={{ width: '100%' }} align="start" wrap>
              <Form.Item
                name="unlock_type"
                label={intl.formatMessage({
                  id: 'drama.creator.episodes.fields.unlockType',
                })}
                style={{ minWidth: 200 }}
              >
                <Select options={unlockOptions} />
              </Form.Item>

              <Form.Item
                name="points_price"
                label={intl.formatMessage({
                  id: 'drama.creator.episodes.fields.pointsPrice',
                })}
                style={{ minWidth: 200 }}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="status"
                label={intl.formatMessage({
                  id: 'drama.creator.episodes.fields.status',
                })}
                style={{ minWidth: 200 }}
              >
                <Select options={statusOptions} />
              </Form.Item>
            </Space>

            <Form.Item
              name="video_url"
              label={intl.formatMessage({
                id: 'drama.creator.episodes.fields.videoUrl',
              })}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="hls_url"
              label={intl.formatMessage({
                id: 'drama.creator.episodes.fields.hlsUrl',
              })}
            >
              <Input />
            </Form.Item>

            <Space size={24} align="start" wrap>
              <Form.Item
                label={intl.formatMessage({
                  id: 'drama.creator.episodes.fields.videoFile',
                })}
              >
                <Upload
                  maxCount={1}
                  beforeUpload={() => false}
                  fileList={videoFileList}
                  onChange={({ fileList }) => setVideoFileList(fileList)}
                  accept="video/*"
                >
                  <Button>{intl.formatMessage({ id: 'common.upload' })}</Button>
                </Upload>
              </Form.Item>

              <Form.Item
                label={intl.formatMessage({
                  id: 'drama.creator.episodes.fields.thumbnail',
                })}
              >
                <Upload
                  maxCount={1}
                  beforeUpload={() => false}
                  fileList={thumbnailFileList}
                  onChange={({ fileList }) => setThumbnailFileList(fileList)}
                  accept="image/*"
                >
                  <Button>{intl.formatMessage({ id: 'common.upload' })}</Button>
                </Upload>
              </Form.Item>
            </Space>
          </Form>
        </Modal>
      </div>
    </PageContainer>
  );
}
