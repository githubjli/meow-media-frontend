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

import QrCodePanel from '@/components/QrCodePanel';
import { liveConfig } from '@/config/live';
import {
  createLiveBroadcast,
  getLiveBroadcastStatus,
  getSafeWatchUrl,
  prepareLiveBroadcast,
  type LiveBroadcast,
  type LiveBroadcastStatus,
} from '@/services/live';
import { saveLiveQrConfig } from '@/utils/liveQr';

const { Title, Text, Paragraph } = Typography;

type BroadcastMode = 'camera' | 'stream-key';
type DevicePermissionStatus = 'idle' | 'requesting' | 'ready' | 'error';
// Browser publish status is transport-level only. Backend live status remains source of truth.
type PublishingStatus = 'idle' | 'connecting' | 'publishing' | 'error';
type PreparePhase = 'idle' | 'preparing' | 'prepared' | 'error';

type AntMediaWebRTCAdaptor = {
  publish: (streamId: string) => void;
  stop: (streamId: string) => void;
  closeWebSocket?: () => void;
};

declare global {
  interface Window {
    WebRTCAdaptor?: new (config: Record<string, any>) => AntMediaWebRTCAdaptor;
  }
}

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

const loadWebRTCAdaptorScript = async (scriptUrl: string) => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.WebRTCAdaptor) {
    return window.WebRTCAdaptor;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-ant-media-adaptor="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Unable to load the Ant Media WebRTC adaptor.')),
        { once: true },
      );
      return;
    }

    if (!scriptUrl) {
      reject(new Error('Missing Ant Media adaptor script URL configuration.'));
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.dataset.antMediaAdaptor = 'true';
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Unable to load the Ant Media WebRTC adaptor.'));
    document.head.appendChild(script);
  });

  return window.WebRTCAdaptor || null;
};

const resolveAntMediaPublishConfig = (live?: LiveBroadcast | null) => {
  const antMedia = live?.publish_session?.ant_media;
  const websocketUrl =
    String(antMedia?.websocket_url || '').trim() ||
    String(liveConfig.antMediaWebSocketUrl || '').trim();
  const adaptorScriptUrl =
    String(antMedia?.adaptor_script_url || '').trim() ||
    String(liveConfig.antMediaWebRtcAdaptorScriptUrl || '').trim();
  const publishStreamId =
    String(antMedia?.stream_id || '').trim() ||
    String(live?.stream_key || '').trim();

  return {
    websocketUrl,
    adaptorScriptUrl,
    publishStreamId,
  };
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
  const webRTCAdaptorRef = useRef<AntMediaWebRTCAdaptor | null>(null);

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
  const [publishingStatus, setPublishingStatus] =
    useState<PublishingStatus>('idle');
  const [publishingMessage, setPublishingMessage] = useState(
    'Browser publishing is standing by.',
  );
  const [preparePhase, setPreparePhase] = useState<PreparePhase>('idle');
  const [prepareMessage, setPrepareMessage] = useState(
    'Preparation handshake has not started.',
  );
  const [prepareSession, setPrepareSession] = useState<
    LiveBroadcast['publish_session'] | undefined
  >(undefined);
  const [backendStatus, setBackendStatus] =
    useState<LiveBroadcastStatus | null>(null);
  const [payQrPayload, setPayQrPayload] = useState('');

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
      const streamId = createdLive?.stream_key || '';
      if (streamId && webRTCAdaptorRef.current) {
        webRTCAdaptorRef.current.stop(streamId);
      }
      webRTCAdaptorRef.current?.closeWebSocket?.();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };
  }, [createdLive?.stream_key]);

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
    const paymentAddress = payQrPayload.trim();
    setSubmitting(true);
    setErrorMessage('');

    try {
      const nextLive = await createLiveBroadcast({
        ...values,
        payment_address: paymentAddress || undefined,
      });
      setCreatedLive(nextLive);
      setBroadcastMode('camera');
      setDevicePermissionStatus('idle');
      setDeviceStatusMessage(
        'Live session created. Choose a browser camera workflow or continue with your professional RTMP setup.',
      );
      setPublishingStatus('idle');
      setPublishingMessage('Browser publishing is standing by.');
      setPreparePhase('idle');
      setPrepareMessage('Preparation handshake has not started.');
      setPrepareSession(undefined);
      setBackendStatus(null);
      message.success(
        'Live stream created. Choose how you want to prepare your broadcast.',
      );
      setPayQrPayload(nextLive.payment_address || paymentAddress || '');
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to prepare the live room.');
    } finally {
      setSubmitting(false);
    }
  };

  const prepareLocalPreview = async () => {
    if (!createdLive) {
      message.info('Create your live session first.');
      return null;
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
          : 'Camera streaming requires HTTPS',
      );
      return null;
    }

    if (!hasSecureContext && !isLocalhost) {
      setDevicePermissionStatus('error');
      setDeviceStatusMessage('Camera streaming requires HTTPS');
      return null;
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
        'Camera and microphone are ready. Connecting browser publishing to Ant Media now.',
      );

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        await previewVideoRef.current.play().catch(() => undefined);
      }

      return stream;
    } catch (error: any) {
      setDevicePermissionStatus('error');
      setDeviceStatusMessage(
        error?.message ||
          'Camera preview could not start. Please review browser permissions, confirm HTTPS or localhost, and try again.',
      );
      return null;
    }
  };

  const handleStartWithCamera = async () => {
    console.log('START WITH CAMERA: enter');
    if (!createdLive?.id) {
      message.error('Create your live session first.');
      return;
    }

    let preparedLiveForPublish: LiveBroadcast | null = createdLive;
    setPreparePhase('preparing');
    setPrepareMessage('Preparing broadcast session with Django…');
    setPrepareSession(undefined);

    try {
      const preparedLive = await prepareLiveBroadcast(createdLive.id);
      console.log('START WITH CAMERA: prepare returned', preparedLive);
      setCreatedLive(preparedLive);
      preparedLiveForPublish = preparedLive;
      setPreparePhase('prepared');
      setPrepareMessage(
        preparedLive.message || 'Prepared for browser publishing.',
      );
      setPrepareSession(preparedLive.publish_session);
    } catch (error: any) {
      setPreparePhase('error');
      setPrepareMessage(
        error?.message ||
          'Prepare handshake failed. Browser publishing has not started.',
      );
      setPublishingStatus('error');
      setPublishingMessage(
        'Browser publishing is blocked because prepare did not complete.',
      );
      return;
    }

    const resolvedPublishConfig = resolveAntMediaPublishConfig(
      preparedLiveForPublish,
    );
    console.log(
      'START WITH CAMERA: resolved config input',
      preparedLiveForPublish?.publish_session,
    );
    console.log('START WITH CAMERA: resolved config', resolvedPublishConfig);
    const { websocketUrl, adaptorScriptUrl, publishStreamId } =
      resolvedPublishConfig;
    if (!websocketUrl && !adaptorScriptUrl && !publishStreamId) {
      setPublishingStatus('error');
      setPublishingMessage(
        'Browser publishing config is missing from prepare response.',
      );
      return;
    }
    if (!websocketUrl || !adaptorScriptUrl || !publishStreamId) {
      setPublishingStatus('error');
      setPublishingMessage('Ant Media browser publish config is incomplete.');
      return;
    }

    const stream = await prepareLocalPreview();
    if (!stream) {
      setPublishingStatus('error');
      setPublishingMessage(
        'Browser publishing could not start because camera or microphone access is unavailable.',
      );
      return;
    }
    console.log('START WITH CAMERA: local preview ready');

    setPublishingStatus('connecting');
    setPublishingMessage('Connecting to Ant Media publishing websocket…');

    try {
      const WebRTCAdaptorCtor = await loadWebRTCAdaptorScript(adaptorScriptUrl);
      if (!WebRTCAdaptorCtor) {
        throw new Error('Unable to initialize the Ant Media WebRTC adaptor.');
      }

      webRTCAdaptorRef.current?.closeWebSocket?.();
      webRTCAdaptorRef.current = new WebRTCAdaptorCtor({
        websocket_url: websocketUrl,
        mediaConstraints: { video: true, audio: true },
        peerconnection_config: {
          iceServers: [{ urls: 'stun:stun1.l.google.com:19302' }],
        },
        sdp_constraints: {
          OfferToReceiveAudio: false,
          OfferToReceiveVideo: false,
        },
        localVideoId: 'live-create-preview-video',
        localStream: stream,
        isPlayMode: false,
        debug: false,
        callback: (info: string) => {
          if (info === 'initialized') {
            console.log('START WITH CAMERA: adaptor initialized');
            setPublishingStatus('connecting');
            setPublishingMessage(
              'WebRTC adaptor initialized. Starting browser publish…',
            );
            console.log('START WITH CAMERA: publish called', publishStreamId);
            webRTCAdaptorRef.current?.publish(publishStreamId);
            return;
          }

          if (info === 'publish_started') {
            setPublishingStatus('publishing');
            setPublishingMessage('Publishing from browser to Ant Media…');
            return;
          }

          if (info === 'ice_connection_state_changed') {
            // Do not mark backend session as live here; this is only transport feedback.
            setPublishingStatus('publishing');
            setPublishingMessage(
              'Live from browser. Your camera stream is publishing to the Ant Media live app.',
            );
            return;
          }

          if (info === 'publish_finished') {
            setPublishingStatus('idle');
            setPublishingMessage(
              'Browser publishing stopped. OBS workflow remains available.',
            );
          }
        },
        callbackError: (error: any, messageText: any) => {
          setPublishingStatus('error');
          setPublishingMessage(
            messageText || error?.toString?.() || 'Browser publishing failed.',
          );
        },
      });
    } catch (error: any) {
      setPublishingStatus('error');
      setPublishingMessage(
        error?.message || 'Unable to connect browser publishing to Ant Media.',
      );
    }
  };

  const handleStopPublishing = () => {
    if (!createdLive?.stream_key || !webRTCAdaptorRef.current) {
      setPublishingStatus('idle');
      setPublishingMessage('Browser publishing is already stopped.');
      return;
    }

    webRTCAdaptorRef.current.stop(createdLive.stream_key);
    setPublishingStatus('idle');
    setPublishingMessage(
      'Browser publishing stopped. OBS workflow remains available.',
    );
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
  const watchQrPayload = getSafeWatchUrl(createdLive);

  useEffect(() => {
    if (!createdLive?.id) {
      return;
    }

    let active = true;

    const loadBackendStatus = async () => {
      try {
        const status = await getLiveBroadcastStatus(createdLive.id);
        if (active) {
          setBackendStatus(status);
        }
      } catch (error) {
        if (active) {
          setBackendStatus(null);
        }
      }
    };

    loadBackendStatus();
    const interval = window.setInterval(loadBackendStatus, 12000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [createdLive?.id]);

  useEffect(() => {
    if (!createdLive?.id) {
      return;
    }

    saveLiveQrConfig(createdLive.id, {
      paymentAddress: payQrPayload,
      watchUrl: getSafeWatchUrl(createdLive),
    });
  }, [createdLive, payQrPayload]);

  const deviceChecklist = [
    {
      label: 'Prepare handshake',
      value:
        preparePhase === 'prepared'
          ? 'Prepared for browser publishing'
          : preparePhase === 'preparing'
          ? 'Preparing'
          : preparePhase === 'error'
          ? 'Prepare failed'
          : 'Not prepared',
    },
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
      value:
        publishingStatus === 'publishing'
          ? 'Connected to Ant Media live app'
          : 'Ready for Ant Media browser publishing',
    },
    {
      label: 'Live status (backend)',
      value: backendStatus?.normalized_status
        ? String(backendStatus.normalized_status).toUpperCase()
        : 'Unknown',
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
                      color: '#B8872E',
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
                  <Form.Item
                    label="QR Code (Optional)"
                    style={{ marginBottom: 16 }}
                  >
                    <Space
                      direction="vertical"
                      size={12}
                      style={{ width: '100%' }}
                    >
                      <Space
                        direction="vertical"
                        size={8}
                        style={{ width: '100%' }}
                      >
                        <Text type="secondary">
                          Enter a wallet/payment address to generate the Pay QR.
                          This QR is used for payment/support, not for watching
                          the stream.
                        </Text>
                        <Input
                          placeholder="Payment Address"
                          value={payQrPayload}
                          onChange={(event) =>
                            setPayQrPayload(event.target.value)
                          }
                        />
                      </Space>
                      <QrCodePanel
                        payload={payQrPayload}
                        size={160}
                        emptyText="Enter a payment address to generate the Pay QR."
                      />
                    </Space>
                  </Form.Item>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 12,
                      marginTop: 4,
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
                              background: '#1F1A16',
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
                                id="live-create-preview-video"
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
                                  style={{ fontSize: 42, color: '#EFBC5C' }}
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
                              onClick={handleStartWithCamera}
                            >
                              Start with Camera
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
                              onClick={handleStartWithCamera}
                            >
                              Refresh Devices
                            </Button>
                            <Button
                              danger
                              disabled={publishingStatus === 'idle'}
                              onClick={handleStopPublishing}
                            >
                              Stop Publishing
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
                        <Tag
                          color={
                            publishingStatus === 'publishing'
                              ? 'error'
                              : publishingStatus === 'publishing'
                              ? 'processing'
                              : publishingStatus === 'connecting'
                              ? 'processing'
                              : publishingStatus === 'error'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          Browser publish (local transport):{' '}
                          {publishingStatus.toUpperCase()}
                        </Tag>
                        <Tag
                          color={
                            preparePhase === 'prepared'
                              ? 'success'
                              : preparePhase === 'preparing'
                              ? 'processing'
                              : preparePhase === 'error'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          Prepare handshake: {preparePhase.toUpperCase()}
                        </Tag>
                        <Tag
                          color={
                            backendStatus?.normalized_status === 'live'
                              ? 'error'
                              : backendStatus?.normalized_status === 'ended'
                              ? 'default'
                              : 'processing'
                          }
                        >
                          Live status (backend):{' '}
                          {String(
                            backendStatus?.normalized_status || 'unknown',
                          ).toUpperCase()}
                        </Tag>
                        <Text type="secondary">{prepareMessage}</Text>
                        {prepareSession?.session_id ? (
                          <Text type="secondary">
                            Prepare session: {prepareSession.session_id}
                          </Text>
                        ) : null}
                        {backendStatus?.message ? (
                          <Text type="secondary">
                            Backend status: {backendStatus.message}
                          </Text>
                        ) : null}
                        {backendStatus?.status_source ? (
                          <Text type="secondary">
                            Status source: {backendStatus.status_source}
                          </Text>
                        ) : null}
                        {backendStatus?.sync_ok === false ? (
                          <Alert
                            type="warning"
                            showIcon
                            message={
                              backendStatus.sync_error ||
                              'Backend and media server status are out of sync.'
                            }
                          />
                        ) : null}
                        <Text type="secondary">{deviceStatusMessage}</Text>
                        <Text type="secondary">{publishingMessage}</Text>
                        {typeof window !== 'undefined' &&
                        !window.isSecureContext &&
                        !['localhost', '127.0.0.1'].includes(
                          window.location.hostname,
                        ) ? (
                          <Alert
                            type="warning"
                            showIcon
                            message="Camera streaming requires HTTPS"
                          />
                        ) : null}
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
                            onClick={() => {
                              const nextWatchUrl = getSafeWatchUrl(createdLive);
                              if (!nextWatchUrl) return;
                              if (/^https?:\/\//i.test(nextWatchUrl)) {
                                window.location.href = nextWatchUrl;
                                return;
                              }
                              history.push(nextWatchUrl);
                            }}
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
                          <div>
                            <Text
                              strong
                              style={{ display: 'block', marginBottom: 8 }}
                            >
                              Watch QR
                            </Text>
                            <QrCodePanel
                              payload={watchQrPayload}
                              size={150}
                              emptyText="Watch URL is not available yet."
                            />
                          </div>
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
