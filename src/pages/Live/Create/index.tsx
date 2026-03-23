import { VideoCameraOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

const { Title, Text } = Typography;

export default function LiveCreatePage() {
  const { initialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    category?: string;
    visibility: string;
  }) => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const streamId = `live-${Date.now()}`;
      const query = new URLSearchParams({
        title: values.title,
        category: values.category || '',
        visibility: values.visibility,
      }).toString();

      message.success('Live room prepared.');
      history.push(`/live/${streamId}${query ? `?${query}` : ''}`);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to prepare the live room.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '8px 0 24px' }}>
        <Card bordered={false} style={{ borderRadius: 20 }}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <div>
              <Text
                style={{
                  color: '#13a8a8',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                LIVE SETUP
              </Text>
              <Title level={2} style={{ margin: '8px 0 8px' }}>
                Go Live
              </Title>
              <Text type="secondary">
                Set the title, category, and visibility for your live session
                before you start broadcasting.
              </Text>
            </div>

            {errorMessage ? (
              <Alert type="error" showIcon message={errorMessage} />
            ) : null}

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              onFinish={handleFinish}
            >
              <Form.Item
                label="Title"
                name="title"
                rules={[
                  { required: true, message: 'Please enter a live title.' },
                ]}
              >
                <Input
                  size="large"
                  placeholder="What are you streaming today?"
                />
              </Form.Item>
              <Form.Item label="Category" name="category">
                <Select
                  allowClear
                  options={categoryOptions}
                  placeholder="Select a category"
                />
              </Form.Item>
              <Form.Item
                label="Visibility"
                name="visibility"
                initialValue="public"
                rules={[
                  { required: true, message: 'Please choose visibility.' },
                ]}
              >
                <Select
                  options={[
                    { label: 'Public', value: 'public' },
                    { label: 'Unlisted', value: 'unlisted' },
                    { label: 'Private', value: 'private' },
                  ]}
                />
              </Form.Item>
              <div
                style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}
              >
                <Button onClick={() => history.push('/live')}>Cancel</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<VideoCameraOutlined />}
                  loading={submitting}
                >
                  Start Live
                </Button>
              </div>
            </Form>
          </Space>
        </Card>
      </div>
    </PageContainer>
  );
}
