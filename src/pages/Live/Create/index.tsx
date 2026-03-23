import {
  CopyOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { createLiveBroadcast, type LiveBroadcast } from '@/services/live';

const { Title, Text, Paragraph } = Typography;

const copyValue = async (value: string, label: string) => {
  if (!value) {
    message.warning(`${label} is not available yet.`);
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    message.success(`${label} copied.`);
  } catch (error) {
    message.info(`Copy ${label.toLowerCase()} manually.`);
  }
};

export default function LiveCreatePage() {
  const { initialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdLive, setCreatedLive] = useState<LiveBroadcast | null>(null);

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
    description?: string;
  }) => {
    setSubmitting(true);
    setErrorMessage('');

    try {
      const nextLive = await createLiveBroadcast(values);
      setCreatedLive(nextLive);
      message.success(
        'Live stream created. Configure your encoder and start when ready.',
      );
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to prepare the live room.');
    } finally {
      setSubmitting(false);
    }
  };

  const infoItems = [
    {
      key: 'stream-key',
      label: 'Stream Key',
      value: createdLive?.stream_key || '',
    },
    {
      key: 'rtmp',
      label: 'RTMP Server URL',
      value: createdLive?.rtmp_url || '',
    },
    {
      key: 'playback',
      label: 'Playback URL',
      value: createdLive?.playback_url || '',
    },
  ];

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '8px 0 24px' }}>
        <Row gutter={[20, 20]}>
          <Col xs={24} lg={14}>
            <Card bordered={false} style={{ borderRadius: 20, height: '100%' }}>
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
                    Create your live stream
                  </Title>
                  <Text type="secondary">
                    Generate fresh streaming credentials from Django, then use
                    the returned Ant Media endpoints in OBS, vMix, or your
                    preferred encoder.
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
                  initialValues={{ visibility: 'public' }}
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
                  <Form.Item label="Description" name="description">
                    <Input.TextArea
                      rows={4}
                      placeholder="Add a short agenda so viewers know what to expect."
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
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 12,
                    }}
                  >
                    <Button onClick={() => history.push('/live')}>
                      Cancel
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<VideoCameraOutlined />}
                      loading={submitting}
                    >
                      Create Live Stream
                    </Button>
                  </div>
                </Form>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={10}>
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <Card bordered={false} style={{ borderRadius: 20 }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Tag color={createdLive ? 'processing' : 'default'}>
                    {createdLive ? 'READY TO CONFIGURE' : 'WAITING FOR SETUP'}
                  </Tag>
                  <Title level={4} style={{ margin: 0 }}>
                    Encoder checklist
                  </Title>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    After you create the stream, copy the RTMP server URL and
                    stream key into your encoder, then open the watch page to
                    validate playback.
                  </Paragraph>
                </Space>
              </Card>

              <Card
                bordered={false}
                style={{ borderRadius: 20 }}
                title="Stream credentials"
              >
                {createdLive ? (
                  <Descriptions column={1} labelStyle={{ width: 140 }}>
                    {infoItems.map((item) => (
                      <Descriptions.Item key={item.key} label={item.label}>
                        <Space
                          style={{
                            width: '100%',
                            justifyContent: 'space-between',
                          }}
                          align="start"
                        >
                          <Text code style={{ wordBreak: 'break-all' }}>
                            {item.value || 'Not provided'}
                          </Text>
                          <Button
                            icon={<CopyOutlined />}
                            onClick={() => copyValue(item.value, item.label)}
                          >
                            Copy
                          </Button>
                        </Space>
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                ) : (
                  <Alert
                    type="info"
                    showIcon
                    message="Create a live stream to receive the stream key, RTMP URL, and playback URL from Django."
                  />
                )}
              </Card>

              {createdLive ? (
                <Card bordered={false} style={{ borderRadius: 20 }}>
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ width: '100%' }}
                  >
                    <Title level={5} style={{ margin: 0 }}>
                      Testing flow
                    </Title>
                    <Text type="secondary">
                      1. Paste the RTMP URL and stream key into your encoder.
                    </Text>
                    <Text type="secondary">
                      2. Start sending video from your encoder.
                    </Text>
                    <Text type="secondary">
                      3. Open the live room and use Start Live when you are
                      ready to go public.
                    </Text>
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={() => history.push(`/live/${createdLive.id}`)}
                      >
                        Open Watch Page
                      </Button>
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() =>
                          createdLive.playback_url &&
                          copyValue(createdLive.playback_url, 'Playback URL')
                        }
                      >
                        Copy playback URL
                      </Button>
                    </Space>
                  </Space>
                </Card>
              ) : null}
            </Space>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
}
