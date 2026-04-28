import {
  createCreatorDrama,
  getCreatorDrama,
  updateCreatorDrama,
} from '@/services/drama';
import { listPublicCategories } from '@/services/publicCategories';
import type { CreatorDramaSeriesPayload, DramaSeries } from '@/types/drama';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  Select,
  Skeleton,
  Space,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useMemo, useState } from 'react';

const { Text, Title } = Typography;

type DramaFormValues = {
  title: string;
  description?: string;
  category?: string;
  tags?: string;
  status?: string;
  visibility?: string;
};

export default function CreatorDramaEditPage() {
  const intl = useIntl();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const { initialState } = useModel('@@initialState');
  const [form] = Form.useForm<DramaFormValues>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [item, setItem] = useState<DramaSeries | null>(null);
  const [categories, setCategories] = useState<
    { label: string; value: string }[]
  >([]);

  const isEditMode = Boolean(params.id);
  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const isCreator = Boolean(
    initialState?.currentUser &&
      (initialState.currentUser.is_creator ||
        initialState.currentUser.role === 'creator' ||
        initialState.currentUser.user_type === 'creator'),
  );

  useEffect(() => {
    listPublicCategories()
      .then((list) => {
        setCategories(
          (list || [])
            .map((item) => ({
              label: item.name || item.slug || '',
              value: item.slug || item.name || '',
            }))
            .filter((item) => item.value),
        );
      })
      .catch(() => {
        setCategories([]);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      history.push(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    if (!isCreator) return;
    if (!isEditMode || !params.id) return;

    setLoading(true);
    getCreatorDrama(params.id)
      .then((data) => {
        setItem(data);
        form.setFieldsValue({
          title: data.title || '',
          description: data.description || '',
          category: data.category || undefined,
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
          status: data.status || 'draft',
          visibility: data.visibility || 'public',
        });
      })
      .catch((error: any) => {
        setErrorMessage(
          error?.message ||
            intl.formatMessage({ id: 'drama.creator.form.error.load' }),
        );
      })
      .finally(() => setLoading(false));
  }, [
    form,
    intl,
    isCreator,
    isEditMode,
    isLoggedIn,
    location.pathname,
    params.id,
  ]);

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

  const visibilityOptions = useMemo(
    () => [
      {
        label: intl.formatMessage({ id: 'drama.creator.visibility.public' }),
        value: 'public',
      },
      {
        label: intl.formatMessage({ id: 'drama.creator.visibility.private' }),
        value: 'private',
      },
      {
        label: intl.formatMessage({ id: 'drama.creator.visibility.unlisted' }),
        value: 'unlisted',
      },
    ],
    [intl],
  );

  const handleSubmit = async (values: DramaFormValues) => {
    const tags = String(values.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const payload: CreatorDramaSeriesPayload = {
      title: values.title,
      description: values.description,
      category: values.category,
      status: values.status,
      visibility: values.visibility,
      tags,
    };

    if (coverFileList[0]?.originFileObj) {
      payload.cover = coverFileList[0].originFileObj as File;
    }

    setSaving(true);
    try {
      if (isEditMode && params.id) {
        await updateCreatorDrama(params.id, payload);
        message.success(
          intl.formatMessage({ id: 'drama.creator.form.update.success' }),
        );
        history.push('/creator/dramas');
      } else {
        const created = await createCreatorDrama(payload);
        message.success(
          intl.formatMessage({ id: 'drama.creator.form.create.success' }),
        );
        if (created?.id) {
          history.push(`/creator/dramas/${created.id}/episodes`);
          return;
        }
        history.push('/creator/dramas');
      }
    } catch (error: any) {
      message.error(
        error?.message ||
          intl.formatMessage({ id: 'drama.creator.form.error.submit' }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card variant="borderless" style={{ borderRadius: 20 }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Title level={3} style={{ marginBottom: 4 }}>
                {intl.formatMessage({
                  id: isEditMode
                    ? 'drama.creator.form.edit.title'
                    : 'drama.creator.form.new.title',
                })}
              </Title>
              <Text type="secondary">
                {intl.formatMessage({
                  id: isEditMode
                    ? 'drama.creator.form.edit.subtitle'
                    : 'drama.creator.form.new.subtitle',
                })}
              </Text>
            </div>

            {!isCreator ? (
              <Empty
                description={intl.formatMessage({
                  id: 'drama.creator.permissionDenied',
                })}
              >
                <Button onClick={() => history.push('/home')}>
                  {intl.formatMessage({ id: 'nav.home' })}
                </Button>
              </Empty>
            ) : loading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : errorMessage ? (
              <Alert type="error" showIcon message={errorMessage} />
            ) : (
              <Form<DramaFormValues>
                form={form}
                layout="vertical"
                initialValues={{
                  title: item?.title || '',
                  description: item?.description || '',
                  category: item?.category || undefined,
                  status: item?.status || 'draft',
                  visibility: item?.visibility || 'public',
                }}
                onFinish={handleSubmit}
              >
                <Form.Item
                  name="title"
                  label={intl.formatMessage({
                    id: 'drama.creator.fields.title',
                  })}
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item
                  name="description"
                  label={intl.formatMessage({
                    id: 'drama.creator.fields.description',
                  })}
                >
                  <Input.TextArea rows={4} />
                </Form.Item>

                <Form.Item
                  label={intl.formatMessage({
                    id: 'drama.creator.fields.cover',
                  })}
                >
                  <Space
                    direction="vertical"
                    size={8}
                    style={{ width: '100%' }}
                  >
                    {!coverFileList.length &&
                    (item?.cover_url || item?.cover || item?.thumbnail_url) ? (
                      <Image
                        src={item.cover_url || item.cover || item.thumbnail_url}
                        width={160}
                        style={{ borderRadius: 8 }}
                        preview={false}
                      />
                    ) : null}
                    <Upload
                      maxCount={1}
                      beforeUpload={() => false}
                      fileList={coverFileList}
                      onChange={({ fileList }) => setCoverFileList(fileList)}
                      accept="image/*"
                    >
                      <Button>
                        {intl.formatMessage({ id: 'common.upload' })}
                      </Button>
                    </Upload>
                  </Space>
                </Form.Item>

                <Space size={12} style={{ width: '100%' }} wrap>
                  <Form.Item
                    name="category"
                    label={intl.formatMessage({
                      id: 'drama.creator.fields.category',
                    })}
                    style={{ minWidth: 220, flex: 1 }}
                  >
                    <Select
                      allowClear
                      showSearch
                      options={categories}
                      optionFilterProp="label"
                    />
                  </Form.Item>

                  <Form.Item
                    name="status"
                    label={intl.formatMessage({
                      id: 'drama.creator.fields.status',
                    })}
                    style={{ minWidth: 180 }}
                  >
                    <Select options={statusOptions} />
                  </Form.Item>

                  <Form.Item
                    name="visibility"
                    label={intl.formatMessage({
                      id: 'drama.creator.fields.visibility',
                    })}
                    style={{ minWidth: 180 }}
                  >
                    <Select options={visibilityOptions} />
                  </Form.Item>
                </Space>

                <Form.Item
                  name="tags"
                  label={intl.formatMessage({
                    id: 'drama.creator.fields.tags',
                  })}
                  extra={intl.formatMessage({
                    id: 'drama.creator.fields.tagsHint',
                  })}
                >
                  <Input
                    placeholder={intl.formatMessage({
                      id: 'drama.creator.fields.tagsPlaceholder',
                    })}
                  />
                </Form.Item>

                <Space>
                  <Button type="primary" htmlType="submit" loading={saving}>
                    {intl.formatMessage({
                      id: isEditMode
                        ? 'drama.creator.actions.saveChanges'
                        : 'drama.creator.actions.createDrama',
                    })}
                  </Button>
                  <Button onClick={() => history.push('/creator/dramas')}>
                    {intl.formatMessage({ id: 'common.cancel' })}
                  </Button>
                </Space>
              </Form>
            )}
          </Space>
        </Card>
      </div>
    </PageContainer>
  );
}
