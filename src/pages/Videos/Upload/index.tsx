import { uploadVideo } from '@/services/videos';
import { UploadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useMemo, useState } from 'react';

const { Title, Text } = Typography;

export default function UploadVideoPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const isDark = Boolean(initialState?.darkTheme);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (!initialState?.authLoading && !initialState?.currentUser?.email) {
      history.replace('/login');
    }
  }, [initialState?.authLoading, initialState?.currentUser?.email]);

  const categoryOptions = useMemo(
    () =>
      (initialState?.publicCategories || []).map((category) => ({
        label: category.name,
        value: category.slug,
      })),
    [initialState?.publicCategories],
  );

  const handleFinish = async (values: {
    title: string;
    description?: string;
    category?: string;
    visibility: 'public' | 'private';
  }) => {
    if (!fileList[0]?.originFileObj) {
      setErrorMessage(intl.formatMessage({ id: 'upload.validation.file' }));
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const video = await uploadVideo({
        title: values.title,
        description: values.description,
        category: values.category,
        visibility: values.visibility,
        file: fileList[0].originFileObj as File,
      });
      message.success(intl.formatMessage({ id: 'upload.success' }));
      history.push(`/videos/${video.id}`);
    } catch (error: any) {
      setErrorMessage(
        error?.message || intl.formatMessage({ id: 'upload.error' }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card
          bordered={false}
          style={{
            borderRadius: 20,
            background: isDark ? '#2A241F' : undefined,
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : undefined,
          }}
        >
          <Title level={2} style={{ marginTop: 0 }}>
            {intl.formatMessage({ id: 'upload.title' })}
          </Title>
          <Text type="secondary">
            {intl.formatMessage({ id: 'upload.subtitle' })}
          </Text>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            initialValues={{ visibility: 'public' }}
            requiredMark={false}
            style={{ marginTop: 24 }}
          >
            {errorMessage ? (
              <Alert
                type="error"
                showIcon
                message={errorMessage}
                style={{ marginBottom: 16 }}
              />
            ) : null}
            <Form.Item
              label={intl.formatMessage({ id: 'upload.label.title' })}
              name="title"
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'upload.validation.title',
                  }),
                },
              ]}
            >
              <Input
                size="large"
                placeholder={intl.formatMessage({
                  id: 'upload.placeholder.title',
                })}
              />
            </Form.Item>
            <Form.Item
              label={intl.formatMessage({ id: 'upload.label.description' })}
              name="description"
            >
              <Input.TextArea
                rows={4}
                placeholder={intl.formatMessage({
                  id: 'upload.placeholder.description',
                })}
              />
            </Form.Item>
            <Form.Item
              label={intl.formatMessage({ id: 'upload.label.category' })}
              name="category"
            >
              <Select
                allowClear
                placeholder={intl.formatMessage({
                  id: 'upload.placeholder.category',
                })}
                options={categoryOptions}
              />
            </Form.Item>
            <Form.Item
              label={intl.formatMessage({ id: 'upload.label.visibility' })}
              name="visibility"
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'upload.validation.visibility',
                  }),
                },
              ]}
            >
              <Select
                options={[
                  {
                    value: 'public',
                    label: intl.formatMessage({
                      id: 'video.visibility.public',
                    }),
                  },
                  {
                    value: 'private',
                    label: intl.formatMessage({
                      id: 'video.visibility.private',
                    }),
                  },
                ]}
                placeholder={intl.formatMessage({
                  id: 'upload.placeholder.visibility',
                })}
              />
            </Form.Item>
            <Form.Item
              label={intl.formatMessage({ id: 'upload.label.file' })}
              required
            >
              <Upload.Dragger
                accept="video/*"
                multiple={false}
                maxCount={1}
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList: nextFileList }) =>
                  setFileList(nextFileList.slice(-1))
                }
                style={{
                  borderColor: isDark ? '#EFBC5C' : '#B8872E',
                  background: isDark ? '#2F2923' : '#FFFDF8',
                  borderRadius: 14,
                }}
              >
                <p className="ant-upload-drag-icon">
                  <UploadOutlined style={{ color: '#EFBC5C' }} />
                </p>
                <p className="ant-upload-text">
                  {intl.formatMessage({ id: 'upload.dropzone.text' })}
                </p>
                <p className="ant-upload-hint">
                  {intl.formatMessage({ id: 'upload.dropzone.hint' })}
                </p>
              </Upload.Dragger>
            </Form.Item>
            <div
              style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}
            >
              <Button onClick={() => history.push('/videos/mine')}>
                {intl.formatMessage({ id: 'common.cancel' })}
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {intl.formatMessage({ id: 'common.uploadVideo' })}
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </PageContainer>
  );
}
