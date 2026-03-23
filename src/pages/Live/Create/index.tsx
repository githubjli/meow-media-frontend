import {
  AudioMutedOutlined,
  AudioOutlined,
  CopyOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  VideoCameraAddOutlined,
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
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import { createLiveBroadcast, type LiveBroadcast } from '@/services/live';

const { Title, Text, Paragraph } = Typography;

type BroadcastMode = 'camera' | 'stream-key';
type DevicePermissionStatus = 'idle' | 'requesting' | 'ready' | 'error';

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

const getPermissionTagColor = (status: DevicePermissionStatus) => {
  switch (status) {
    case 'ready':
      return 'success';
    case 'requesting':
      return 'processing';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

export default function LiveCreatePage() {
  const { initialState } = useModel('@@initialState');
  const [form] = Form.useForm();
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdLive, setCreatedLive] = useState<LiveBroadcast | null>(null);
  const [broadcastMode, setBroadcastMode] = useState<BroadcastMode>('camera');
  const [devicePermissionStatus, setDevicePermissionStatus] =
    useState<DevicePermissionStatus>('idle');
  const [deviceStatusMessage, setDeviceStatusMessage] = useState(
    'Create a live session to unlock browser preview or stream key workflows.',
  );
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  useEffect(() => {
    if (!initialState?.authLoading && !initialState?.currentUser?.email) {
      history.replace(`/login?redirect=${encodeURIComponent('/live/create')}`);
    }
  }, [initialState?.authLoading, initialState?.currentUser?.email]);

  useEffect(() => {
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [devicePermissionStatus]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };
  }, []);

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
      setBroadcastMode('camera');
      setDevicePermissionStatus('idle');
      setDeviceStatusMessage(
        'Live session created. Choose a browser camera preview or continue with your professional RTMP setup.',
      );
      message.success(
        'Live stream created. Choose how you want to prepare your broadcast.',
      );
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to prepare the live room.');
    } finally {
      setSubmitting(false);
    }
  };

  const startCameraPreview = async () => {
    if (!createdLive) {
      message.info('Create your live session first.');
      return;
    }

    const isLocalhost =
      typeof window !== 'undefined' &&
      ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const hasSecureContext =
      typeof window !== 'undefined' ? window.isSecureContext : false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setDevicePermissionStatus('error');
      setDeviceStatusMessage(
        hasSecureContext || isLocalhost
          ? 'Camera preview is unavailable because this browser does not expose camera access for the current environment.'
          : 'Camera and microphone preview requires HTTPS or localhost. Your current LAN URL is not a secure browser context.',
      );
      return;
    }

    if (!hasSecureContext && !isLocalhost) {
      setDevicePermissionStatus('error');
      setDeviceStatusMessage(
        'Camera and microphone preview requires HTTPS or localhost. Switch to a secure URL, then try again.',
      );
      return;
    }

    setDevicePermissionStatus('requesting');
    setDeviceStatusMessage('Requesting camera and microphone access…');

    try {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      mediaStreamRef.current = stream;
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
      const micEnabled = audioTrack ? audioTrack.enabled : false;
      const cameraEnabled = videoTrack ? videoTrack.enabled : false;

      setIsMicEnabled(micEnabled);
      setIsCameraEnabled(cameraEnabled);
      setDevicePermissionStatus('ready');
      setDeviceStatusMessage(
        'Camera and microphone are ready. This local preview can be wired to Ant Media WebRTC publishing next.',
      );

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        await previewVideoRef.current.play().catch(() => undefined);
      }
    } catch (error: any) {
      setDevicePermissionStatus('error');
      setDeviceStatusMessage(
        error?.message ||
          'Camera preview could not start. Please review browser permissions, confirm HTTPS or localhost, and try again.',
      );
    }
  };

  const toggleTrack = (kind: 'audio' | 'video') => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      message.info('Start camera preview first.');
      return;
    }

    const tracks =
      kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
    const track = tracks[0];

    if (!track) {
      message.warning(
        kind === 'audio'
          ? 'No microphone track is available.'
          : 'No camera track is available.',
      );
      return;
    }

    track.enabled = !track.enabled;

    if (kind === 'audio') {
      setIsMicEnabled(track.enabled);
    } else {
      setIsCameraEnabled(track.enabled);
    }

    setDeviceStatusMessage(
      `${kind === 'audio' ? 'Microphone' : 'Camera'} ${
        track.enabled ? 'enabled' : 'muted'
      } for local preview.`,
    );
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

  const deviceChecklist = [
    {
      label: 'Camera',
      value:
        devicePermissionStatus === 'ready'
          ? isCameraEnabled
            ? 'Ready'
            : 'Disabled in preview'
          : 'Awaiting permission',
    },
    {
      label: 'Microphone',
      value:
        devicePermissionStatus === 'ready'
          ? isMicEnabled
            ? 'Ready'
            : 'Muted in preview'
          : 'Awaiting permission',
    },
    {
      label: 'Publishing pipeline',
      value: 'Prepared for future Ant Media WebRTC wiring',
    },
  ];

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '8px 0 24px' }}>
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={9}>
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
                    Configure the session details, then choose a browser camera
                    preview workflow or the professional RTMP stream key option.
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
                      Create Live Session
                    </Button>
                  </div>
                </Form>
              </Space>
            </Card>
          </Col>

          <Col xs={24} xl={15}>
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <Card bordered={false} style={{ borderRadius: 20 }}>
                <Row gutter={[16, 16]} align="middle">
                  <Col xs={24} lg={16}>
                    <Space
                      direction="vertical"
                      size={10}
                      style={{ width: '100%' }}
                    >
                      <Tag color={createdLive ? 'processing' : 'default'}>
                        {createdLive ? 'SESSION READY' : 'WAITING FOR SESSION'}
                      </Tag>
                      <Title level={4} style={{ margin: 0 }}>
                        Broadcast preparation
                      </Title>
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        Build your live session in the browser now, then plug
                        the same session into Ant Media publishing in the next
                        step.
                      </Paragraph>
                    </Space>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Space
                      wrap
                      style={{ justifyContent: 'flex-end', width: '100%' }}
                    >
                      <Button
                        type={
                          broadcastMode === 'camera' ? 'primary' : 'default'
                        }
                        icon={<VideoCameraAddOutlined />}
                        disabled={!createdLive}
                        onClick={() => setBroadcastMode('camera')}
                      >
                        Start with Camera
                      </Button>
                      <Button
                        type={
                          broadcastMode === 'stream-key' ? 'primary' : 'default'
                        }
                        icon={<CopyOutlined />}
                        disabled={!createdLive}
                        onClick={() => setBroadcastMode('stream-key')}
                      >
                        Use Stream Key
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>

              <Row gutter={[20, 20]}>
                <Col xs={24} lg={14}>
                  <Card
                    bordered={false}
                    style={{ borderRadius: 20, height: '100%' }}
                  >
                    <Space
                      direction="vertical"
                      size={16}
                      style={{ width: '100%' }}
                    >
                      <div>
                        <Title level={4} style={{ margin: 0 }}>
                          Preview panel
                        </Title>
                        <Text type="secondary">
                          {broadcastMode === 'camera'
                            ? 'Request local camera and microphone access to verify readiness before publishing.'
                            : 'Stream key mode keeps your OBS or encoder details in the stream details card on the right, while this panel stays focused on browser preview workflows.'}
                        </Text>
                      </div>

                      {broadcastMode === 'camera' ? (
                        <>
                          <div
                            style={{
                              background: '#09131c',
                              borderRadius: 18,
                              minHeight: 360,
                              overflow: 'hidden',
                              position: 'relative',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            {devicePermissionStatus === 'ready' ? (
                              <video
                                ref={previewVideoRef}
                                autoPlay
                                muted
                                playsInline
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <Space
                                direction="vertical"
                                align="center"
                                size={12}
                              >
                                <VideoCameraOutlined
                                  style={{ fontSize: 42, color: '#5bd1d7' }}
                                />
                                <Text style={{ color: '#fff' }}>
                                  {createdLive
                                    ? 'Enable camera preview to check framing, audio, and readiness.'
                                    : 'Create a session first to unlock browser camera preview.'}
                                </Text>
                              </Space>
                            )}
                            <div
                              style={{
                                position: 'absolute',
                                left: 16,
                                top: 16,
                              }}
                            >
                              <Tag
                                color={getPermissionTagColor(
                                  devicePermissionStatus,
                                )}
                              >
                                {devicePermissionStatus.toUpperCase()}
                              </Tag>
                            </div>
                          </div>

                          <Space wrap>
                            <Button
                              type="primary"
                              icon={<VideoCameraAddOutlined />}
                              disabled={!createdLive}
                              onClick={startCameraPreview}
                            >
                              Start Camera Preview
                            </Button>
                            <Button
                              icon={
                                isMicEnabled ? (
                                  <AudioOutlined />
                                ) : (
                                  <AudioMutedOutlined />
                                )
                              }
                              disabled={devicePermissionStatus !== 'ready'}
                              onClick={() => toggleTrack('audio')}
                            >
                              {isMicEnabled ? 'Mute Mic' : 'Unmute Mic'}
                            </Button>
                            <Button
                              icon={<VideoCameraOutlined />}
                              disabled={devicePermissionStatus !== 'ready'}
                              onClick={() => toggleTrack('video')}
                            >
                              {isCameraEnabled
                                ? 'Turn Camera Off'
                                : 'Turn Camera On'}
                            </Button>
                            <Button
                              icon={<ReloadOutlined />}
                              disabled={!createdLive}
                              onClick={startCameraPreview}
                            >
                              Refresh Devices
                            </Button>
                          </Space>
                        </>
                      ) : createdLive ? (
                        <Alert
                          type="info"
                          showIcon
                          message="Use Stream Key mode keeps the RTMP Server, Stream Key, and Playback URL in separate fields so OBS configuration is clearer and less error-prone."
                        />
                      ) : (
                        <Empty description="Create a live session to reveal RTMP details." />
                      )}
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} lg={10}>
                  <Space
                    direction="vertical"
                    size={20}
                    style={{ width: '100%' }}
                  >
                    <Card
                      bordered={false}
                      style={{ borderRadius: 20 }}
                      title="Status area"
                    >
                      <Space
                        direction="vertical"
                        size={12}
                        style={{ width: '100%' }}
                      >
                        <Tag
                          color={getPermissionTagColor(devicePermissionStatus)}
                        >
                          Device readiness:{' '}
                          {devicePermissionStatus.toUpperCase()}
                        </Tag>
                        <Text type="secondary">{deviceStatusMessage}</Text>
                        {devicePermissionStatus === 'error' ? (
                          <Alert
                            type="warning"
                            showIcon
                            message="Browser permissions are required for local camera preview. RTMP mode remains available if you prefer your encoder."
                          />
                        ) : null}
                      </Space>
                    </Card>

                    <Card
                      bordered={false}
                      style={{ borderRadius: 20 }}
                      title="Device checklist"
                    >
                      <Descriptions column={1} labelStyle={{ width: 136 }}>
                        {deviceChecklist.map((item) => (
                          <Descriptions.Item
                            key={item.label}
                            label={item.label}
                          >
                            {item.value}
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    </Card>

                    <Card
                      bordered={false}
                      style={{ borderRadius: 20 }}
                      title="Stream details card"
                    >
                      {createdLive ? (
                        <Space
                          direction="vertical"
                          size={16}
                          style={{ width: '100%' }}
                        >
                          <div>
                            <Text strong>
                              {createdLive.title || createdLive.name}
                            </Text>
                            <Text
                              type="secondary"
                              style={{ display: 'block', marginTop: 6 }}
                            >
                              {createdLive.description ||
                                'Session is prepared and ready for browser preview or RTMP publishing.'}
                            </Text>
                          </div>
                          <Space wrap>
                            <Tag>{createdLive.category || 'General'}</Tag>
                            <Tag color="processing">
                              {String(
                                createdLive.visibility || 'public',
                              ).toUpperCase()}
                            </Tag>
                          </Space>
                          <Descriptions column={1} labelStyle={{ width: 126 }}>
                            {infoItems.map((item) => (
                              <Descriptions.Item
                                key={item.key}
                                label={item.label}
                              >
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
                                    onClick={() =>
                                      copyValue(item.value, item.label)
                                    }
                                  >
                                    Copy
                                  </Button>
                                </Space>
                              </Descriptions.Item>
                            ))}
                          </Descriptions>
                          <Alert
                            type="info"
                            showIcon
                            message="OBS setup tip: paste the RTMP Server into the server field and the Stream Key into the stream key field. Keep Playback URL separate for monitoring and QA."
                          />
                          <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={() =>
                              history.push(`/live/${createdLive.id}`)
                            }
                          >
                            Open Watch Page
                          </Button>
                          <Button
                            icon={<EyeOutlined />}
                            onClick={() =>
                              createdLive.playback_url &&
                              copyValue(
                                createdLive.playback_url,
                                'Playback URL',
                              )
                            }
                          >
                            Copy Playback URL
                          </Button>
                        </Space>
                      ) : (
                        <Alert
                          type="info"
                          showIcon
                          message="Session details appear here after you create the live broadcast."
                        />
                      )}
                    </Card>
                  </Space>
                </Col>
              </Row>
            </Space>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
}
