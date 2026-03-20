import { uploadVideo } from '@/services/videos';
import { UploadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Typography,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useEffect, useState } from 'react';

const { Title, Text } = Typography;

export default function UploadVideoPage() {
  const { initialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (!initialState?.authLoading && !initialState?.currentUser?.email) {
      history.replace('/login');
    }
  }, [initialState?.authLoading, initialState?.currentUser?.email]);

  const handleFinish = async (values: {
    title: string;
    description?: string;
  }) => {
    if (!fileList[0]?.originFileObj) {
      setErrorMessage('Please select a video file to upload.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const video = await uploadVideo({
        title: values.title,
        description: values.description,
        file: fileList[0].originFileObj as File,
      });
      message.success('Video uploaded successfully.');
      history.push(`/videos/${video.id}`);
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Unable to upload your video right now.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card bordered={false} style={{ borderRadius: 20 }}>
          <Title level={2} style={{ marginTop: 0 }}>
            Upload a video
          </Title>
          <Text type="secondary">
            Add a title, optional description, and a video file to publish to
            your library.
          </Text>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
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
              label="Title"
              name="title"
              rules={[{ required: true, message: 'Please enter a title.' }]}
            >
              <Input size="large" placeholder="Enter video title" />
            </Form.Item>
            <Form.Item label="Description" name="description">
              <Input.TextArea rows={4} placeholder="Optional description" />
            </Form.Item>
            <Form.Item label="Video file" required>
              <Upload.Dragger
                accept="video/*"
                multiple={false}
                maxCount={1}
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList: nextFileList }) =>
                  setFileList(nextFileList.slice(-1))
                }
              >
                <p className="ant-upload-drag-icon">
                  <UploadOutlined style={{ color: '#5bd1d7' }} />
                </p>
                <p className="ant-upload-text">
                  Click or drag a video file to this area
                </p>
                <p className="ant-upload-hint">
                  The file will be uploaded to your account after submission.
                </p>
              </Upload.Dragger>
            </Form.Item>
            <div
              style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}
            >
              <Button onClick={() => history.push('/videos/mine')}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Upload Video
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </PageContainer>
  );
}
