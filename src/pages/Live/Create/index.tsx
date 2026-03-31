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
import { history, useIntl, useModel } from '@umijs/max';
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
type PreflightStatus = 'idle' | 'ok' | 'error' | 'skipped';
type PreflightResults = {
  https: PreflightStatus;
  mediaDevices: PreflightStatus;
  permission: PreflightStatus;
  websocket: PreflightStatus;
  adaptor: PreflightStatus;
};

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

  if (!scriptUrl) {
    throw new Error('Missing Ant Media adaptor script URL configuration.');
  }

  const adaptorModule = await import(/* webpackIgnore: true */ scriptUrl);
  console.log('START WITH CAMERA: adaptor module loaded', {
    scriptUrl,
    exports: adaptorModule ? Object.keys(adaptorModule) : [],
  });

  return (
    adaptorModule?.WebRTCAdaptor ||
    adaptorModule?.default?.WebRTCAdaptor ||
    adaptorModule?.default ||
    window.WebRTCAdaptor ||
    null
  );
};

const upgradeToSecureUrlIfNeeded = (rawUrl: string, label: string) => {
  const url = String(rawUrl || '').trim();
  if (!url || typeof window === 'undefined' || window.location.protocol !== 'https:') {
    return url;
  }

  if (url.startsWith('http://')) {
    const secureUrl = `https://${url.slice('http://'.length)}`;
    console.warn(`[LIVE_CREATE] Mixed Content upgrade for ${label}:`, {
      from: url,
      to: secureUrl,
    });
    return secureUrl;
  }

  if (url.startsWith('ws://')) {
    const secureUrl = `wss://${url.slice('ws://'.length)}`;
    console.warn(`[LIVE_CREATE] Mixed Content upgrade for ${label}:`, {
      from: url,
      to: secureUrl,
    });
    return secureUrl;
  }

  return url;
};

const resolveAntMediaPublishConfig = (live?: LiveBroadcast | null) => {
  const antMedia = live?.publish_session?.ant_media;
  const websocketUrl = upgradeToSecureUrlIfNeeded(
    String(antMedia?.websocket_url || '').trim() ||
      String(liveConfig.antMediaWebSocketUrl || '').trim(),
    'websocket_url',
  );
  const adaptorScriptUrl = upgradeToSecureUrlIfNeeded(
    String(antMedia?.adaptor_script_url || '').trim() ||
      String(liveConfig.antMediaWebRtcAdaptorScriptUrl || '').trim(),
    'adaptor_script_url',
  );
  const publishStreamId = String(antMedia?.stream_id || '').trim();

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

const getPreflightTagColor = (status: PreflightStatus) => {
  if (status === 'ok') return 'success';
  if (status === 'error') return 'error';
  if (status === 'skipped') return 'default';
  return 'processing';
};

export default function LiveCreatePage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const isLoggedIn = Boolean(initialState?.currentUser?.email);
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
  const [prepareDebugPayload, setPrepareDebugPayload] = useState<any>(null);
  const [resolvedConfigInput, setResolvedConfigInput] = useState({
    websocketUrl: '',
    adaptorScriptUrl: '',
    publishStreamId: '',
  });
  const [resolvedPublishConfig, setResolvedPublishConfig] = useState({
    websocketUrl: '',
    adaptorScriptUrl: '',
    publishStreamId: '',
  });
  const [debugLastError, setDebugLastError] = useState('');
  const [webRtcCallbackEvents, setWebRtcCallbackEvents] = useState<
    Array<{ event: string; at: string }>
  >([]);
  const [latestWebRtcCallbackInfo, setLatestWebRtcCallbackInfo] = useState('');
  const [webRtcCallbackError, setWebRtcCallbackError] = useState<{
    error?: any;
    messageText?: any;
  } | null>(null);
  const [activePublishStreamId, setActivePublishStreamId] = useState('');
  const activePublishStreamIdRef = useRef('');
  const [backendStatus, setBackendStatus] =
    useState<LiveBroadcastStatus | null>(null);
  const [payQrPayload, setPayQrPayload] = useState('');
  const [preflightResults, setPreflightResults] = useState<PreflightResults>({
    https: 'idle',
    mediaDevices: 'idle',
    permission: 'idle',
    websocket: 'idle',
    adaptor: 'idle',
  });
  const isCreator = Boolean(
    initialState?.currentUser &&
      (initialState.currentUser.is_creator ||
        initialState.currentUser.role === 'creator' ||
        initialState.currentUser.user_type === 'creator'),
  );

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
    activePublishStreamIdRef.current = activePublishStreamId || '';
  }, [activePublishStreamId]);

  useEffect(() => {
    return () => {
      const streamId = activePublishStreamIdRef.current || '';
      if (streamId && webRTCAdaptorRef.current) {
        console.log('LIVE_CREATE cleanup(unmount): stopping active publish stream', {
          streamId,
        });
        webRTCAdaptorRef.current.stop(streamId);
      }
      if (webRTCAdaptorRef.current?.closeWebSocket) {
        console.log('LIVE_CREATE cleanup(unmount): closing adaptor websocket');
        webRTCAdaptorRef.current.closeWebSocket();
      }
      if (webRTCAdaptorRef.current) {
        console.log('LIVE_CREATE cleanup(unmount): resetting webRTCAdaptorRef');
      }
      webRTCAdaptorRef.current = null;
      if (mediaStreamRef.current) {
        console.log(
          'LIVE_CREATE cleanup(unmount): stopping local tracks',
          mediaStreamRef.current.getTracks().map((track) => track.kind),
        );
      }
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
      setPrepareDebugPayload(null);
      setResolvedConfigInput({
        websocketUrl: '',
        adaptorScriptUrl: '',
        publishStreamId: '',
      });
      setResolvedPublishConfig({
        websocketUrl: '',
        adaptorScriptUrl: '',
        publishStreamId: '',
      });
      setDebugLastError('');
      setWebRtcCallbackEvents([]);
      setLatestWebRtcCallbackInfo('');
      setWebRtcCallbackError(null);
      setActivePublishStreamId('');
      setBackendStatus(null);
      message.success(
        'Live stream created. Choose how you want to prepare your broadcast.',
      );
      setPayQrPayload(nextLive.payment_address || paymentAddress || '');
    } catch (error: any) {
      setDebugLastError(error?.message || 'Unable to prepare the live room.');
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
      if (mediaStreamRef.current) {
        console.log(
          'LIVE_CREATE prepareLocalPreview: stopping previous local tracks before re-init',
          mediaStreamRef.current.getTracks().map((track) => track.kind),
        );
      }
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

    const prePrepareChecks = await runPreflightChecks();
    if (!prePrepareChecks.ok) {
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
      setPrepareDebugPayload(preparedLive);
      setDebugLastError('');
    } catch (error: any) {
      setPreparePhase('error');
      setPrepareMessage(
        error?.message ||
          'Prepare handshake failed. Browser publishing has not started.',
      );
      setDebugLastError(
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
    const preparedAntMediaConfig =
      preparedLiveForPublish?.publish_session?.ant_media;
    setResolvedConfigInput({
      websocketUrl: String(preparedAntMediaConfig?.websocket_url || '').trim(),
      adaptorScriptUrl: String(
        preparedAntMediaConfig?.adaptor_script_url || '',
      ).trim(),
      publishStreamId: String(preparedAntMediaConfig?.stream_id || '').trim(),
    });
    setResolvedPublishConfig(resolvedPublishConfig);
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
      setDebugLastError(
        'Browser publishing config is missing from prepare response.',
      );
      return;
    }
    if (!websocketUrl || !adaptorScriptUrl || !publishStreamId) {
      setPublishingStatus('error');
      setPublishingMessage('Ant Media browser publish config is incomplete.');
      setDebugLastError('Ant Media browser publish config is incomplete.');
      return;
    }

    const fullPreflightChecks = await runPreflightChecks({
      websocketUrl,
      adaptorScriptUrl,
    });
    if (!fullPreflightChecks.ok) {
      return;
    }

    const stream = await prepareLocalPreview();
    if (!stream) {
      setPublishingStatus('error');
      setPublishingMessage(
        'Browser publishing could not start because camera or microphone access is unavailable.',
      );
      setDebugLastError(
        'Browser publishing could not start because camera or microphone access is unavailable.',
      );
      return;
    }
    console.log('START WITH CAMERA: local preview ready');

    setPublishingStatus('connecting');
    setPublishingMessage('Connecting to Ant Media publishing websocket…');

    try {
      console.log('START WITH CAMERA: loading WebRTC adaptor script', {
        adaptorScriptUrl,
      });
      const WebRTCAdaptorCtor = await loadWebRTCAdaptorScript(adaptorScriptUrl);
      console.log('START WITH CAMERA: adaptor module loaded');
      console.log('WebRTCAdaptor ctor found:', !!WebRTCAdaptorCtor, WebRTCAdaptorCtor);
      if (!WebRTCAdaptorCtor) {
        throw new Error('Unable to initialize the Ant Media WebRTC adaptor.');
      }

      if (webRTCAdaptorRef.current?.closeWebSocket) {
        console.log(
          'LIVE_CREATE startPublishingWithCamera: closing existing adaptor websocket before creating a new adaptor',
        );
        webRTCAdaptorRef.current.closeWebSocket();
      }
      console.log('Creating WebRTCAdaptor now', {
        websocketUrl,
        publishStreamId,
      });
      const disablePublisherAutoReconnect = true;
      const mediaConstraints = { video: true, audio: true };
      const peerConnectionConfig = {
        iceServers: [
          { urls: 'stun:stun1.l.google.com:19302' },
          {
            urls: 'turn:media.meownews.online:3478?transport=udp',
            username: 'ipb-meownews',
            credential: 'IPBMeow@2026#',
          },
          {
            urls: 'turn:media.meownews.online:3478?transport=tcp',
            username: 'ipb-meownews',
            credential: 'IPBMeow@2026#',
          },
        ],
      };
      const sdpConstraints = {
        OfferToReceiveAudio: false,
        OfferToReceiveVideo: false,
      };
      const adaptorConfig = {
        websocket_url: websocketUrl,
        mediaConstraints,
        peerconnection_config: peerConnectionConfig,
        sdp_constraints: sdpConstraints,
        localVideoId: 'live-create-preview-video',
        localStream: stream,
        isPlayMode: false,
        debug: false,
        reconnectIfRequiredFlag: !disablePublisherAutoReconnect,
      };
      console.log('LIVE_CREATE: peerconnection_config (publish)', {
        iceServers: peerConnectionConfig.iceServers.map((server) => ({
          urls: server.urls,
          username: server.username || '',
          credential: server.credential ? '***' : '',
        })),
      });
      console.log('LIVE_CREATE: adaptor constructor config (expanded)', {
        websocket_url: websocketUrl,
        publishStreamId,
        peerconnection_config: peerConnectionConfig,
        'peerconnection_config.iceServers': peerConnectionConfig.iceServers.map(
          (server) => ({
            urls: server.urls,
            username: server.username || '',
            credential: server.credential ? '***' : '',
          }),
        ),
        mediaConstraints,
        sdp_constraints: sdpConstraints,
      });
      webRTCAdaptorRef.current = new WebRTCAdaptorCtor({
        ...adaptorConfig,
        callback: (info: string) => {
          console.log('WebRTC callback wired', info);
          console.log('WEBRTC_CALLBACK_INFO:', info);
          setLatestWebRtcCallbackInfo(info);
          setWebRtcCallbackEvents((current) => [
            ...current.slice(-49),
            { event: info, at: new Date().toISOString() },
          ]);

          if (info === 'initialized') {
            console.log('START WITH CAMERA: adaptor initialized');
            setPublishingStatus('connecting');
            setPublishingMessage(
              'WebRTC adaptor initialized. Starting browser publish…',
            );
            console.log('START WITH CAMERA: right before publish()', {
              publishStreamId,
            });
            console.log('START WITH CAMERA: publish called', publishStreamId);
            setActivePublishStreamId(publishStreamId);
            webRTCAdaptorRef.current?.publish(publishStreamId);
            console.log('START WITH CAMERA: right after publish()', {
              publishStreamId,
              adaptorPresent: Boolean(webRTCAdaptorRef.current),
            });
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
          console.log('WebRTC callbackError wired', {
            publishStreamId,
            error,
            messageText,
            errorName: error?.name || '',
            errorCode: error?.code || error?.errorCode || '',
            errorMessage:
              messageText || error?.message || error?.toString?.() || '',
            errorDetails:
              error && typeof error === 'object'
                ? JSON.parse(
                    JSON.stringify(error, (_key, value) =>
                      typeof value === 'undefined' ? null : value,
                    ),
                  )
                : error,
          });
          console.log('WEBRTC_CALLBACK_ERROR:', {
            publishStreamId,
            errorName: error?.name || '',
            errorCode: error?.code || error?.errorCode || '',
            errorMessage:
              messageText || error?.message || error?.toString?.() || '',
            rawError: error,
            rawMessageText: messageText,
          });
          setWebRtcCallbackError({ error, messageText });
          setPublishingStatus('error');
          setPublishingMessage(
            messageText || error?.toString?.() || 'Browser publishing failed.',
          );
          setDebugLastError(
            messageText || error?.toString?.() || 'Browser publishing failed.',
          );
        },
      });
      console.log('WebRTCAdaptor constructor called', {
        publishStreamId,
        reconnectIfRequiredFlag: !disablePublisherAutoReconnect,
        usedSamePeerConnectionConfigObject:
          adaptorConfig.peerconnection_config === peerConnectionConfig,
        adaptorHasPeerConnectionConfig: Boolean(
          (webRTCAdaptorRef.current as any)?.peerconnection_config,
        ),
        adaptorPeerConnectionConfig: (webRTCAdaptorRef.current as any)
          ?.peerconnection_config
          ? {
              ...((webRTCAdaptorRef.current as any).peerconnection_config || {}),
              iceServers: (
                (webRTCAdaptorRef.current as any).peerconnection_config
                  ?.iceServers || []
              ).map((server: any) => ({
                urls: server?.urls,
                username: server?.username || '',
                credential: server?.credential ? '***' : '',
              })),
            }
          : null,
        localPeerConnectionConfig: {
          ...peerConnectionConfig,
          iceServers: peerConnectionConfig.iceServers.map((server) => ({
            urls: server.urls,
            username: server.username || '',
            credential: server.credential ? '***' : '',
          })),
        },
      });
    } catch (error: any) {
      console.error('START WITH CAMERA: adaptor creation failed', error);
      setPublishingStatus('error');
      setPublishingMessage(
        error?.message || 'Unable to connect browser publishing to Ant Media.',
      );
      setDebugLastError(
        error?.message || 'Unable to connect browser publishing to Ant Media.',
      );
    }
  };

  const handleStopPublishing = () => {
    if (!activePublishStreamId || !webRTCAdaptorRef.current) {
      setPublishingStatus('idle');
      setPublishingMessage('Browser publishing is already stopped.');
      return;
    }

    console.log('LIVE_CREATE handleStopPublishing: stopping active publish stream', {
      activePublishStreamId,
    });
    webRTCAdaptorRef.current.stop(activePublishStreamId);
    setActivePublishStreamId('');
    setPublishingStatus('idle');
    setPublishingMessage(
      'Browser publishing stopped. OBS workflow remains available.',
    );
  };

  const runPreflightChecks = async (options?: {
    websocketUrl?: string;
    adaptorScriptUrl?: string;
  }) => {
    const checks: PreflightResults = {
      https: 'idle',
      mediaDevices: 'idle',
      permission: 'idle',
      websocket: options?.websocketUrl ? 'idle' : 'skipped',
      adaptor: options?.adaptorScriptUrl ? 'idle' : 'skipped',
    };

    const isSecure = typeof window !== 'undefined' && window.isSecureContext;
    checks.https = isSecure ? 'ok' : 'error';

    const hasMediaDevices = Boolean(navigator.mediaDevices?.getUserMedia);
    checks.mediaDevices = hasMediaDevices ? 'ok' : 'error';

    if (isSecure && hasMediaDevices) {
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        testStream.getTracks().forEach((track) => track.stop());
        checks.permission = 'ok';
      } catch (error) {
        checks.permission = 'error';
      }
    } else {
      checks.permission = 'error';
    }

    if (options?.adaptorScriptUrl) {
      try {
        const response = await fetch(options.adaptorScriptUrl, {
          method: 'HEAD',
        });
        checks.adaptor = response.ok ? 'ok' : 'error';
      } catch (error) {
        checks.adaptor = 'error';
      }
    }

    if (options?.websocketUrl) {
      checks.websocket = await new Promise<PreflightStatus>((resolve) => {
        try {
          const socket = new WebSocket(options.websocketUrl!);
          const timeout = window.setTimeout(() => {
            socket.close();
            resolve('error');
          }, 4000);

          socket.onopen = () => {
            window.clearTimeout(timeout);
            socket.close();
            resolve('ok');
          };
          socket.onerror = () => {
            window.clearTimeout(timeout);
            socket.close();
            resolve('error');
          };
        } catch (error) {
          resolve('error');
        }
      });
    }

    setPreflightResults(checks);

    const failedEntry = Object.entries(checks).find(
      ([, status]) => status === 'error',
    );
    if (failedEntry) {
      const messageText = intl.formatMessage(
        { id: 'live.preflight.failed' },
        { check: failedEntry[0] },
      );
      setDebugLastError(messageText);
      setPublishingStatus('error');
      setPublishingMessage(messageText);
      return { ok: false as const, results: checks };
    }

    return { ok: true as const, results: checks };
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
      value: prepareSession?.ant_media?.stream_id || '',
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

  if (
    !initialState?.authLoading &&
    initialState?.currentUser?.email &&
    !isCreator
  ) {
    return (
      <PageContainer title={false}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '8px 0 24px' }}>
          <Alert
            type="warning"
            showIcon
            message={intl.formatMessage({ id: 'live.creatorRequired' })}
            action={
              <Button type="link" onClick={() => history.push('/live')}>
                {intl.formatMessage({ id: 'live.creatorRequired.backToLive' })}
              </Button>
            }
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '8px 0 24px' }}>
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={9}>
            <Card variant="borderless" style={{ borderRadius: 20, height: '100%' }}>
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
              <Card variant="borderless" style={{ borderRadius: 20 }}>
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
                    variant="borderless"
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
                      variant="borderless"
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
                        <Text type="secondary">
                          {intl.formatMessage({
                            id: 'live.debug.latestWebrtcInfo',
                          })}
                          : {latestWebRtcCallbackInfo || '-'}
                        </Text>
                        <Text type="secondary">
                          {intl.formatMessage({
                            id: 'live.debug.latestWebrtcError',
                          })}
                          :{' '}
                          {webRtcCallbackError
                            ? JSON.stringify(webRtcCallbackError)
                            : '-'}
                        </Text>
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
                        <Space wrap size={[8, 8]}>
                          <Tag
                            color={getPreflightTagColor(preflightResults.https)}
                          >
                            {intl.formatMessage({ id: 'live.preflight.https' })}
                            :{' '}
                            {preflightResults.https === 'ok'
                              ? 'OK'
                              : preflightResults.https === 'error'
                              ? 'ERROR'
                              : 'PENDING'}
                          </Tag>
                          <Tag
                            color={getPreflightTagColor(
                              preflightResults.mediaDevices,
                            )}
                          >
                            {intl.formatMessage({
                              id: 'live.preflight.mediaDevices',
                            })}
                            :{' '}
                            {preflightResults.mediaDevices === 'ok'
                              ? 'OK'
                              : preflightResults.mediaDevices === 'error'
                              ? 'ERROR'
                              : 'PENDING'}
                          </Tag>
                          <Tag
                            color={getPreflightTagColor(
                              preflightResults.permission,
                            )}
                          >
                            {intl.formatMessage({
                              id: 'live.preflight.permission',
                            })}
                            :{' '}
                            {preflightResults.permission === 'ok'
                              ? 'OK'
                              : preflightResults.permission === 'error'
                              ? 'ERROR'
                              : 'PENDING'}
                          </Tag>
                          <Tag
                            color={getPreflightTagColor(
                              preflightResults.websocket,
                            )}
                          >
                            {intl.formatMessage({
                              id: 'live.preflight.websocket',
                            })}
                            :{' '}
                            {preflightResults.websocket === 'ok'
                              ? 'OK'
                              : preflightResults.websocket === 'error'
                              ? 'ERROR'
                              : 'PENDING'}
                          </Tag>
                          <Tag
                            color={getPreflightTagColor(
                              preflightResults.adaptor,
                            )}
                          >
                            {intl.formatMessage({
                              id: 'live.preflight.adaptor',
                            })}
                            :{' '}
                            {preflightResults.adaptor === 'ok'
                              ? 'OK'
                              : preflightResults.adaptor === 'error'
                              ? 'ERROR'
                              : 'PENDING'}
                          </Tag>
                        </Space>
                      </Space>
                    </Card>
                    {isLoggedIn ? (
                      <Card
                        variant="borderless"
                        style={{ borderRadius: 20 }}
                        title={intl.formatMessage({
                          id: 'live.debug.panelTitle',
                        })}
                      >
                        <Space
                          direction="vertical"
                          size={12}
                          style={{ width: '100%' }}
                        >
                          <div>
                            <Text strong>
                              {intl.formatMessage({
                                id: 'live.debug.prepareResponse',
                              })}
                            </Text>
                            <pre
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                padding: 10,
                                borderRadius: 10,
                                background: 'rgba(0,0,0,0.04)',
                                fontSize: 12,
                                overflowX: 'auto',
                              }}
                            >
                              {JSON.stringify(
                                prepareDebugPayload || {},
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                          <div>
                            <Text strong>
                              {intl.formatMessage({
                                id: 'live.debug.publishConfigInput',
                              })}
                            </Text>
                            <pre
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                padding: 10,
                                borderRadius: 10,
                                background: 'rgba(0,0,0,0.04)',
                                fontSize: 12,
                                overflowX: 'auto',
                              }}
                            >
                              {JSON.stringify(resolvedConfigInput, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <Text strong>
                              {intl.formatMessage({
                                id: 'live.debug.publishConfig',
                              })}
                            </Text>
                            <pre
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                padding: 10,
                                borderRadius: 10,
                                background: 'rgba(0,0,0,0.04)',
                                fontSize: 12,
                                overflowX: 'auto',
                              }}
                            >
                              {JSON.stringify(resolvedPublishConfig, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <Text strong>
                              {intl.formatMessage({
                                id: 'live.debug.currentStates',
                              })}
                            </Text>
                            <pre
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                padding: 10,
                                borderRadius: 10,
                                background: 'rgba(0,0,0,0.04)',
                                fontSize: 12,
                                overflowX: 'auto',
                              }}
                            >
                              {JSON.stringify(
                                {
                                  preparePhase,
                                  publishingStatus,
                                  devicePermissionStatus,
                                  backendStatus,
                                },
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                          <div>
                            <Text strong>
                              {intl.formatMessage({
                                id: 'live.debug.webrtcEvents',
                              })}
                            </Text>
                            <pre
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                padding: 10,
                                borderRadius: 10,
                                background: 'rgba(0,0,0,0.04)',
                                fontSize: 12,
                                overflowX: 'auto',
                              }}
                            >
                              {JSON.stringify(webRtcCallbackEvents, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <Text strong>
                              {intl.formatMessage({
                                id: 'live.debug.webrtcCallbackError',
                              })}
                            </Text>
                            <pre
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                padding: 10,
                                borderRadius: 10,
                                background: 'rgba(0,0,0,0.04)',
                                fontSize: 12,
                                overflowX: 'auto',
                              }}
                            >
                              {JSON.stringify(
                                webRtcCallbackError || {},
                                null,
                                2,
                              )}
                            </pre>
                          </div>
                          <div>
                            <Text strong>
                              {intl.formatMessage({
                                id: 'live.debug.lastError',
                              })}
                            </Text>
                            <pre
                              style={{
                                marginTop: 8,
                                marginBottom: 0,
                                padding: 10,
                                borderRadius: 10,
                                background: 'rgba(0,0,0,0.04)',
                                fontSize: 12,
                                overflowX: 'auto',
                              }}
                            >
                              {debugLastError ||
                                intl.formatMessage({ id: 'live.debug.none' })}
                            </pre>
                          </div>
                        </Space>
                      </Card>
                    ) : null}

                    <Card
                      variant="borderless"
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
                      variant="borderless"
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
                            {intl.formatMessage({
                              id: 'live.control.copyPlayback',
                            })}
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
