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
  websocketAdaptor?: {
    wsConn?: WebSocket;
  };
  remotePeerConnection?: Record<string, RTCPeerConnection>;
  peerconnection_config?: RTCConfiguration;
};

declare global {
  interface Window {
    WebRTCAdaptor?: new (config: Record<string, any>) => AntMediaWebRTCAdaptor;
  }
}

const copyValue = async (value: string, label: string) => {
  if (!value) {
    message.warning(`${label} is not available.`);
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
  if (
    !url ||
    typeof window === 'undefined' ||
    window.location.protocol !== 'https:'
  ) {
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

const maskIceServers = (config?: RTCConfiguration | null) => {
  if (!config) return null;
  return {
    ...config,
    iceServers: (config.iceServers || []).map((server) => ({
      ...server,
      credential: server.credential ? '***' : server.credential,
    })),
  };
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
    intl.formatMessage({ id: 'live.create.deviceStatus.initial' }),
  );
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [publishingStatus, setPublishingStatus] =
    useState<PublishingStatus>('idle');
  const [publishingMessage, setPublishingMessage] = useState(
    intl.formatMessage({ id: 'live.create.publishStatus.standby' }),
  );
  const [preparePhase, setPreparePhase] = useState<PreparePhase>('idle');
  const [prepareMessage, setPrepareMessage] = useState(
    intl.formatMessage({ id: 'live.create.prepareStatus.notStarted' }),
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
  const [prepareReturnedStreamId, setPrepareReturnedStreamId] = useState('');
  const [finalPublishStreamId, setFinalPublishStreamId] = useState('');
  const [webRtcCallbackEvents, setWebRtcCallbackEvents] = useState<
    Array<{ event: string; at: string }>
  >([]);
  const [latestWebRtcCallbackInfo, setLatestWebRtcCallbackInfo] = useState('');
  const [webRtcCallbackError, setWebRtcCallbackError] = useState<{
    error?: any;
    messageText?: any;
  } | null>(null);
  const hasTriggeredPublishAttemptRef = useRef(false);
  const hasLoggedFirstPublishFailureRef = useRef(false);
  const startFlowLockRef = useRef(false);
  const prepareRequestInFlightRef = useRef<Promise<LiveBroadcast> | null>(null);
  const [isStartFlowInProgress, setIsStartFlowInProgress] = useState(false);
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
    console.log('LIVE_CREATE diagnostic logging patch active');
  }, []);

  useEffect(() => {
    activePublishStreamIdRef.current = activePublishStreamId || '';
  }, [activePublishStreamId]);

  useEffect(() => {
    return () => {
      const streamId = activePublishStreamIdRef.current || '';
      if (streamId && webRTCAdaptorRef.current) {
        console.log(
          'LIVE_CREATE cleanup(unmount): stopping active publish stream',
          {
            streamId,
          },
        );
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
        intl.formatMessage({ id: 'live.create.deviceStatus.created' }),
      );
      setPublishingStatus('idle');
      setPublishingMessage(
        intl.formatMessage({ id: 'live.create.publishStatus.standby' }),
      );
      setPreparePhase('idle');
      setPrepareMessage(
        intl.formatMessage({ id: 'live.create.prepareStatus.notStarted' }),
      );
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
      setPrepareReturnedStreamId('');
      setFinalPublishStreamId('');
      setDebugLastError('');
      setWebRtcCallbackEvents([]);
      setLatestWebRtcCallbackInfo('');
      setWebRtcCallbackError(null);
      startFlowLockRef.current = false;
      prepareRequestInFlightRef.current = null;
      setIsStartFlowInProgress(false);
      hasTriggeredPublishAttemptRef.current = false;
      setActivePublishStreamId('');
      setBackendStatus(null);
      message.success(
        intl.formatMessage({ id: 'live.create.message.created' }),
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
    if (
      startFlowLockRef.current ||
      isStartFlowInProgress ||
      prepareRequestInFlightRef.current
    ) {
      console.warn(
        'LIVE_CREATE start blocked: startup flow already in progress',
        {
          liveId: createdLive.id,
          startFlowLock: startFlowLockRef.current,
          isStartFlowInProgress,
          hasPrepareRequestInFlight: Boolean(prepareRequestInFlightRef.current),
        },
      );
      return;
    }
    if (
      activePublishStreamIdRef.current ||
      publishingStatus === 'connecting' ||
      publishingStatus === 'publishing' ||
      hasTriggeredPublishAttemptRef.current
    ) {
      console.warn(
        'LIVE_CREATE start blocked: active/pending publish session exists',
        {
          liveId: createdLive.id,
          activePublishStreamId: activePublishStreamIdRef.current || '',
          publishingStatus,
          hasTriggeredPublishAttempt: hasTriggeredPublishAttemptRef.current,
        },
      );
      return;
    }
    startFlowLockRef.current = true;
    setIsStartFlowInProgress(true);
    try {
      const prePrepareChecks = await runPreflightChecks();
      if (!prePrepareChecks.ok) {
        return;
      }

      let preparedLiveForPublish: LiveBroadcast | null = createdLive;
      setPreparePhase('preparing');
      setPrepareMessage('Preparing broadcast session with Django…');
      setPrepareSession(undefined);

      try {
        let preparePromise = prepareRequestInFlightRef.current;
        if (!preparePromise) {
          preparePromise = prepareLiveBroadcast(createdLive.id);
          prepareRequestInFlightRef.current = preparePromise.finally(() => {
            prepareRequestInFlightRef.current = null;
          });
        }
        const preparedLive = await preparePromise;
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
      const prepareStreamId = String(
        preparedAntMediaConfig?.stream_id || '',
      ).trim();
      const chosenPublishStreamId = String(
        resolvedPublishConfig.publishStreamId || prepareStreamId,
      ).trim();
      setPrepareReturnedStreamId(prepareStreamId);
      setFinalPublishStreamId(chosenPublishStreamId);
      console.log('LIVE_CREATE streamId[prepare_api_returned]', {
        streamId: prepareStreamId,
        liveId: preparedLiveForPublish?.id,
        appName: preparedAntMediaConfig?.app_name,
      });
      console.log('LIVE_CREATE streamId[final_chosen_for_publish]', {
        streamId: chosenPublishStreamId,
        source: 'prepare_response.ant_media.stream_id',
      });
      setResolvedConfigInput({
        websocketUrl: String(
          preparedAntMediaConfig?.websocket_url || '',
        ).trim(),
        adaptorScriptUrl: String(
          preparedAntMediaConfig?.adaptor_script_url || '',
        ).trim(),
        publishStreamId: prepareStreamId,
      });
      setResolvedPublishConfig(resolvedPublishConfig);
      console.log(
        'START WITH CAMERA: resolved config input',
        preparedLiveForPublish?.publish_session,
      );
      console.log('START WITH CAMERA: resolved config', resolvedPublishConfig);
      const { websocketUrl, adaptorScriptUrl } = resolvedPublishConfig;
      if (!websocketUrl && !adaptorScriptUrl && !chosenPublishStreamId) {
        setPublishingStatus('error');
        setPublishingMessage(
          'Browser publishing config is missing from prepare response.',
        );
        setDebugLastError(
          'Browser publishing config is missing from prepare response.',
        );
        return;
      }
      if (!websocketUrl || !adaptorScriptUrl || !chosenPublishStreamId) {
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
        const WebRTCAdaptorCtor = await loadWebRTCAdaptorScript(
          adaptorScriptUrl,
        );
        console.log('START WITH CAMERA: adaptor module loaded');
        console.log(
          'WebRTCAdaptor ctor found:',
          !!WebRTCAdaptorCtor,
          WebRTCAdaptorCtor,
        );
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
          publishStreamId: chosenPublishStreamId,
        });
        hasTriggeredPublishAttemptRef.current = false;
        hasLoggedFirstPublishFailureRef.current = false;
        const mediaConstraints = { video: true, audio: true };
        const publishIceServers = [{ urls: 'stun:stun1.l.google.com:19302' }];
        const peerConnectionConfig = {
          iceServers: publishIceServers,
        };
        console.log('LIVE_CREATE adaptor[final_ice_config_input]', {
          streamId: chosenPublishStreamId,
          websocketUrl,
          peerConnectionConfig: maskIceServers(peerConnectionConfig),
        });
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
          reconnectIfRequiredFlag: true,
        };
        console.log('LIVE_CREATE: peerconnection_config (publish)', {
          websocket_url: websocketUrl,
          publishStreamId: chosenPublishStreamId,
          peerconnection_config: {
            ...peerConnectionConfig,
            iceServers: peerConnectionConfig.iceServers.map((server) =>
              server.credential ? { ...server, credential: '***' } : server,
            ),
          },
          iceServerCount: publishIceServers.length,
          containsUdpTurn: publishIceServers.some((server) =>
            String(server.urls || '').includes('transport=udp'),
          ),
          'peerconnection_config.iceServers':
            peerConnectionConfig.iceServers.map((server) =>
              server.credential ? { ...server, credential: '***' } : server,
            ),
        });
        console.log('FINAL ICE CONFIG:', peerConnectionConfig);
        console.log('LIVE_CREATE: adaptor constructor config (expanded)', {
          websocket_url: websocketUrl,
          publishStreamId: chosenPublishStreamId,
          peerconnection_config: peerConnectionConfig,
          'peerconnection_config.iceServers':
            peerConnectionConfig.iceServers.map((server) => ({
              urls: server.urls,
              username: server.username || '',
              credential: server.credential ? '***' : '',
            })),
          mediaConstraints,
          sdp_constraints: sdpConstraints,
        });
        webRTCAdaptorRef.current = new WebRTCAdaptorCtor({
          ...adaptorConfig,
          callback: (info: string, obj?: any) => {
            console.log('WebRTC callback wired', info);
            console.log('WEBRTC_CALLBACK_INFO:', info, obj);
            if (
              info === 'takeConfiguration' ||
              info === 'takeCandidate' ||
              info === 'publish_started' ||
              info === 'publish_finished' ||
              info === 'closed' ||
              info === 'data_channel_closed'
            ) {
              console.log('LIVE_CREATE signaling[callback]', {
                streamId: chosenPublishStreamId,
                info,
                payload: obj,
                hasRemoteAnswer:
                  info === 'takeConfiguration' &&
                  (obj?.type === 'answer' ||
                    String(obj?.sdp || '')
                      .toLowerCase()
                      .includes('a=setup:active')),
              });
            }
            setLatestWebRtcCallbackInfo(info);
            setWebRtcCallbackEvents((current) => [
              ...current.slice(-49),
              { event: info, at: new Date().toISOString() },
            ]);

            if (info === 'initialized') {
              if (hasTriggeredPublishAttemptRef.current) {
                console.warn(
                  'LIVE_CREATE: duplicate initialized callback received; publish already triggered',
                  { publishStreamId: chosenPublishStreamId, info },
                );
                return;
              }
              console.log('START WITH CAMERA: adaptor initialized');
              setPublishingStatus('connecting');
              setPublishingMessage(
                'WebRTC adaptor initialized. Starting browser publish…',
              );
              console.log('START WITH CAMERA: right before publish()', {
                publishStreamId: chosenPublishStreamId,
              });
              console.log('LIVE_CREATE streamId[publish_call_argument]', {
                streamId: chosenPublishStreamId,
              });
              console.log(
                'LIVE_CREATE correlation[publish_stream_vs_server_logs]',
                {
                  publishStreamId: chosenPublishStreamId,
                  liveId: preparedLiveForPublish?.id,
                  note: 'Use this publishStreamId to match Ant Media server log streamId.',
                },
              );
              hasTriggeredPublishAttemptRef.current = true;
              setActivePublishStreamId(chosenPublishStreamId);
              webRTCAdaptorRef.current?.publish(chosenPublishStreamId);
              console.log('START WITH CAMERA: right after publish()', {
                publishStreamId: chosenPublishStreamId,
                adaptorPresent: Boolean(webRTCAdaptorRef.current),
              });
              return;
            }

            if (
              info === 'reconnection_attempt_for_publisher' ||
              info === 'data_channel_closed' ||
              info === 'publish_finished'
            ) {
              console.warn(
                'LIVE_CREATE: publish retry-related callback observed (no frontend auto-retry path)',
                {
                  publishStreamId: chosenPublishStreamId,
                  info,
                },
              );
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
              hasTriggeredPublishAttemptRef.current = false;
              setPublishingStatus('idle');
              setPublishingMessage(
                'Browser publishing stopped. OBS workflow remains available.',
              );
            }
          },
          callbackError: (error: any, messageText: any) => {
            const structuredError = {
              publishStreamId: chosenPublishStreamId,
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
            };
            if (!hasLoggedFirstPublishFailureRef.current) {
              hasLoggedFirstPublishFailureRef.current = true;
              console.error(
                'PUBLISH ERROR (first failure, retry disabled):',
                structuredError,
              );
            }
            console.log('WebRTC callbackError wired', {
              ...structuredError,
            });
            console.log('WEBRTC_CALLBACK_ERROR:', {
              ...structuredError,
            });
            setWebRtcCallbackError({ error, messageText });
            hasTriggeredPublishAttemptRef.current = false;
            setPublishingStatus('error');
            setPublishingMessage(
              messageText ||
                error?.toString?.() ||
                'Browser publishing failed.',
            );
            setDebugLastError(
              messageText ||
                error?.toString?.() ||
                'Browser publishing failed.',
            );
          },
        });
        console.log('WebRTCAdaptor constructor called', {
          publishStreamId: chosenPublishStreamId,
          reconnectIfRequiredFlag: true,
          usedSamePeerConnectionConfigObject:
            adaptorConfig.peerconnection_config === peerConnectionConfig,
          adaptorHasPeerConnectionConfig: Boolean(
            (webRTCAdaptorRef.current as any)?.peerconnection_config,
          ),
          adaptorPeerConnectionConfig: (webRTCAdaptorRef.current as any)
            ?.peerconnection_config
            ? {
                ...((webRTCAdaptorRef.current as any).peerconnection_config ||
                  {}),
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
        hasTriggeredPublishAttemptRef.current = false;
        setPublishingStatus('error');
        setPublishingMessage(
          error?.message ||
            'Unable to connect browser publishing to Ant Media.',
        );
        setDebugLastError(
          error?.message ||
            'Unable to connect browser publishing to Ant Media.',
        );
      }
    } finally {
      startFlowLockRef.current = false;
      setIsStartFlowInProgress(false);
    }
  };

  const handleStopPublishing = () => {
    if (!activePublishStreamId || !webRTCAdaptorRef.current) {
      setPublishingStatus('idle');
      setPublishingMessage('Browser publishing is already stopped.');
      return;
    }

    console.log(
      'LIVE_CREATE handleStopPublishing: stopping active publish stream',
      {
        activePublishStreamId,
      },
    );
    webRTCAdaptorRef.current.stop(activePublishStreamId);
    hasTriggeredPublishAttemptRef.current = false;
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
      message.info(intl.formatMessage({ id: 'live.create.startPreviewFirst' }));
      return;
    }

    const tracks =
      kind === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
    const track = tracks[0];

    if (!track) {
      message.warning(
        kind === 'audio'
          ? intl.formatMessage({ id: 'live.create.noMicTrack' })
          : intl.formatMessage({ id: 'live.create.noCameraTrack' }),
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
      intl.formatMessage(
        {
          id: 'live.create.trackStateChanged',
        },
        {
          kind:
            kind === 'audio'
              ? intl.formatMessage({ id: 'live.create.microphone' })
              : intl.formatMessage({ id: 'live.create.camera' }),
          state: track.enabled
            ? intl.formatMessage({ id: 'live.create.enabled' })
            : intl.formatMessage({ id: 'live.create.muted' }),
        },
      ),
    );
  };

  const infoItems = [
    {
      key: 'stream-key',
      label: intl.formatMessage({ id: 'live.create.streamKey' }),
      value: prepareSession?.ant_media?.stream_id || '',
    },
    {
      key: 'rtmp',
      label: intl.formatMessage({ id: 'live.create.rtmpServerUrl' }),
      value: createdLive?.rtmp_url || '',
    },
    {
      key: 'playback',
      label: intl.formatMessage({ id: 'live.create.playbackUrl' }),
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
      label: intl.formatMessage({ id: 'live.create.prepareHandshake' }),
      value:
        preparePhase === 'prepared'
          ? intl.formatMessage({ id: 'live.create.preparePrepared' })
          : preparePhase === 'preparing'
          ? intl.formatMessage({ id: 'live.create.preparing' })
          : preparePhase === 'error'
          ? intl.formatMessage({ id: 'live.create.prepareFailed' })
          : intl.formatMessage({ id: 'live.create.notPrepared' }),
    },
    {
      label: intl.formatMessage({ id: 'live.create.camera' }),
      value:
        devicePermissionStatus === 'ready'
          ? isCameraEnabled
            ? intl.formatMessage({ id: 'live.create.ready' })
            : intl.formatMessage({ id: 'live.create.disabledInPreview' })
          : intl.formatMessage({ id: 'live.create.awaitingPermission' }),
    },
    {
      label: intl.formatMessage({ id: 'live.create.microphone' }),
      value:
        devicePermissionStatus === 'ready'
          ? isMicEnabled
            ? intl.formatMessage({ id: 'live.create.ready' })
            : intl.formatMessage({ id: 'live.create.mutedInPreview' })
          : intl.formatMessage({ id: 'live.create.awaitingPermission' }),
    },
    {
      label: intl.formatMessage({ id: 'live.create.publishingPipeline' }),
      value:
        publishingStatus === 'publishing'
          ? intl.formatMessage({ id: 'live.create.connectedToAntMedia' })
          : intl.formatMessage({ id: 'live.create.readyForBrowserPublish' }),
    },
    {
      label: intl.formatMessage({ id: 'live.create.liveStatusBackend' }),
      value: backendStatus?.normalized_status
        ? String(backendStatus.normalized_status).toUpperCase()
        : intl.formatMessage({ id: 'live.create.unknown' }),
    },
  ];
  const isStartWithCameraDisabled =
    !createdLive ||
    isStartFlowInProgress ||
    preparePhase === 'preparing' ||
    publishingStatus === 'connecting' ||
    publishingStatus === 'publishing' ||
    Boolean(activePublishStreamId);
  const showLiveDebugPanel =
    process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('liveDebug') === '1';

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
            <Card
              variant="borderless"
              style={{ borderRadius: 20, height: '100%' }}
            >
              <Space direction="vertical" size={20} style={{ width: '100%' }}>
                <div>
                  <Text
                    style={{
                      color: '#B8872E',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {intl.formatMessage({ id: 'live.create.setupEyebrow' })}
                  </Text>
                  <Title level={2} style={{ margin: '8px 0 8px' }}>
                    {intl.formatMessage({ id: 'live.create.title' })}
                  </Title>
                  <Text type="secondary">
                    {intl.formatMessage({ id: 'live.create.subtitle' })}
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
                    label={intl.formatMessage({ id: 'live.create.form.title' })}
                    name="title"
                    rules={[
                      {
                        required: true,
                        message: intl.formatMessage({
                          id: 'live.create.form.titleRequired',
                        }),
                      },
                    ]}
                  >
                    <Input
                      size="large"
                      placeholder={intl.formatMessage({
                        id: 'live.create.form.titlePlaceholder',
                      })}
                    />
                  </Form.Item>
                  <Form.Item
                    label={intl.formatMessage({
                      id: 'live.create.form.description',
                    })}
                    name="description"
                  >
                    <Input.TextArea
                      rows={4}
                      placeholder={intl.formatMessage({
                        id: 'live.create.form.descriptionPlaceholder',
                      })}
                    />
                  </Form.Item>
                  <Form.Item
                    label={intl.formatMessage({
                      id: 'live.create.form.category',
                    })}
                    name="category"
                  >
                    <Select
                      allowClear
                      options={categoryOptions}
                      placeholder={intl.formatMessage({
                        id: 'live.create.form.categoryPlaceholder',
                      })}
                    />
                  </Form.Item>
                  <Form.Item
                    label={intl.formatMessage({
                      id: 'live.create.form.visibility',
                    })}
                    name="visibility"
                    rules={[
                      {
                        required: true,
                        message: intl.formatMessage({
                          id: 'live.create.form.visibilityRequired',
                        }),
                      },
                    ]}
                  >
                    <Select
                      options={[
                        {
                          label: intl.formatMessage({
                            id: 'video.visibility.public',
                          }),
                          value: 'public',
                        },
                        {
                          label: intl.formatMessage({
                            id: 'live.create.form.visibilityUnlisted',
                          }),
                          value: 'unlisted',
                        },
                        {
                          label: intl.formatMessage({
                            id: 'video.visibility.private',
                          }),
                          value: 'private',
                        },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    label={intl.formatMessage({
                      id: 'live.create.form.qrOptional',
                    })}
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
                          {intl.formatMessage({
                            id: 'live.create.form.qrHint',
                          })}
                        </Text>
                        <Input
                          placeholder={intl.formatMessage({
                            id: 'live.create.form.paymentAddress',
                          })}
                          value={payQrPayload}
                          onChange={(event) =>
                            setPayQrPayload(event.target.value)
                          }
                        />
                      </Space>
                      <QrCodePanel
                        payload={payQrPayload}
                        size={160}
                        emptyText={intl.formatMessage({
                          id: 'live.create.form.qrEmpty',
                        })}
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
                      {intl.formatMessage({ id: 'common.cancel' })}
                    </Button>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<VideoCameraOutlined />}
                      loading={submitting}
                    >
                      {intl.formatMessage({ id: 'live.create.form.submit' })}
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
                        {createdLive
                          ? intl.formatMessage({
                              id: 'live.create.sessionReady',
                            })
                          : intl.formatMessage({
                              id: 'live.create.waitingForSession',
                            })}
                      </Tag>
                      <Title level={4} style={{ margin: 0 }}>
                        {intl.formatMessage({
                          id: 'live.create.broadcastPreparation',
                        })}
                      </Title>
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        {intl.formatMessage({
                          id: 'live.create.broadcastPreparationHint',
                        })}
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
                        {intl.formatMessage({
                          id: 'live.create.startWithCamera',
                        })}
                      </Button>
                      <Button
                        type={
                          broadcastMode === 'stream-key' ? 'primary' : 'default'
                        }
                        icon={<CopyOutlined />}
                        disabled={!createdLive}
                        onClick={() => setBroadcastMode('stream-key')}
                      >
                        {intl.formatMessage({ id: 'live.create.useStreamKey' })}
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
                          {intl.formatMessage({
                            id: 'live.create.previewPanel',
                          })}
                        </Title>
                        <Text type="secondary">
                          {broadcastMode === 'camera'
                            ? intl.formatMessage({
                                id: 'live.create.previewPanel.cameraHint',
                              })
                            : intl.formatMessage({
                                id: 'live.create.previewPanel.streamKeyHint',
                              })}
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
                                    ? intl.formatMessage({
                                        id: 'live.create.previewPanel.enableCameraHint',
                                      })
                                    : intl.formatMessage({
                                        id: 'live.create.previewPanel.createFirstHint',
                                      })}
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
                              disabled={isStartWithCameraDisabled}
                              onClick={handleStartWithCamera}
                            >
                              {intl.formatMessage({
                                id: 'live.create.startWithCamera',
                              })}
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
                              {isMicEnabled
                                ? intl.formatMessage({
                                    id: 'live.create.muteMic',
                                  })
                                : intl.formatMessage({
                                    id: 'live.create.unmuteMic',
                                  })}
                            </Button>
                            <Button
                              icon={<VideoCameraOutlined />}
                              disabled={devicePermissionStatus !== 'ready'}
                              onClick={() => toggleTrack('video')}
                            >
                              {isCameraEnabled
                                ? intl.formatMessage({
                                    id: 'live.create.turnCameraOff',
                                  })
                                : intl.formatMessage({
                                    id: 'live.create.turnCameraOn',
                                  })}
                            </Button>
                            <Button
                              icon={<ReloadOutlined />}
                              disabled={isStartWithCameraDisabled}
                              onClick={handleStartWithCamera}
                            >
                              {intl.formatMessage({
                                id: 'live.create.refreshDevices',
                              })}
                            </Button>
                            <Button
                              danger
                              disabled={publishingStatus === 'idle'}
                              onClick={handleStopPublishing}
                            >
                              {intl.formatMessage({
                                id: 'live.create.stopPublishing',
                              })}
                            </Button>
                          </Space>
                        </>
                      ) : createdLive ? (
                        <Alert
                          type="info"
                          showIcon
                          message={intl.formatMessage({
                            id: 'live.create.streamKeyInfo',
                          })}
                        />
                      ) : (
                        <Empty
                          description={intl.formatMessage({
                            id: 'live.create.streamKeyEmpty',
                          })}
                        />
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
                      title={intl.formatMessage({
                        id: 'live.create.statusArea',
                      })}
                    >
                      <Space
                        direction="vertical"
                        size={12}
                        style={{ width: '100%' }}
                      >
                        <Tag
                          color={getPermissionTagColor(devicePermissionStatus)}
                        >
                          {intl.formatMessage({
                            id: 'live.create.deviceReadiness',
                          })}
                          : {devicePermissionStatus.toUpperCase()}
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
                          {intl.formatMessage({
                            id: 'live.create.browserPublish',
                          })}
                          : {publishingStatus.toUpperCase()}
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
                          {intl.formatMessage({
                            id: 'live.create.prepareHandshake',
                          })}
                          : {preparePhase.toUpperCase()}
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
                          {intl.formatMessage({
                            id: 'live.create.liveStatusBackend',
                          })}
                          :{' '}
                          {String(
                            backendStatus?.normalized_status || 'unknown',
                          ).toUpperCase()}
                        </Tag>
                        <Text type="secondary">{prepareMessage}</Text>
                        {prepareSession?.session_id ? (
                          <Text type="secondary">
                            {intl.formatMessage({
                              id: 'live.create.prepareSession',
                            })}
                            : {prepareSession.session_id}
                          </Text>
                        ) : null}
                        {backendStatus?.message ? (
                          <Text type="secondary">
                            {intl.formatMessage({
                              id: 'live.create.backendStatus',
                            })}
                            : {backendStatus.message}
                          </Text>
                        ) : null}
                        {backendStatus?.status_source ? (
                          <Text type="secondary">
                            {intl.formatMessage({
                              id: 'live.create.statusSource',
                            })}
                            : {backendStatus.status_source}
                          </Text>
                        ) : null}
                        {backendStatus?.sync_ok === false ? (
                          <Alert
                            type="warning"
                            showIcon
                            message={
                              backendStatus.sync_error ||
                              intl.formatMessage({
                                id: 'live.create.backendOutOfSync',
                              })
                            }
                          />
                        ) : null}
                        <Text type="secondary">{deviceStatusMessage}</Text>
                        <Text type="secondary">{publishingMessage}</Text>
                        {showLiveDebugPanel ? (
                          <>
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
                          </>
                        ) : null}
                        {typeof window !== 'undefined' &&
                        !window.isSecureContext &&
                        !['localhost', '127.0.0.1'].includes(
                          window.location.hostname,
                        ) ? (
                          <Alert
                            type="warning"
                            showIcon
                            message={intl.formatMessage({
                              id: 'live.create.httpsRequired',
                            })}
                          />
                        ) : null}
                        {devicePermissionStatus === 'error' ? (
                          <Alert
                            type="warning"
                            showIcon
                            message={intl.formatMessage({
                              id: 'live.create.permissionRequiredHint',
                            })}
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
                    {showLiveDebugPanel ? (
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
                                  prepareReturnedStreamId,
                                  finalPublishStreamId,
                                  activePublishStreamId,
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
                      title={intl.formatMessage({
                        id: 'live.create.deviceChecklist',
                      })}
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
                      title={intl.formatMessage({
                        id: 'live.create.streamDetailsCard',
                      })}
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
                                intl.formatMessage({
                                  id: 'live.create.sessionReadyHint',
                                })}
                            </Text>
                          </div>
                          <Space wrap>
                            <Tag>
                              {createdLive.category ||
                                intl.formatMessage({
                                  id: 'live.create.generalCategory',
                                })}
                            </Tag>
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
                                    {item.value ||
                                      intl.formatMessage({
                                        id: 'live.create.notProvided',
                                      })}
                                  </Text>
                                  <Button
                                    icon={<CopyOutlined />}
                                    onClick={() =>
                                      copyValue(item.value, item.label)
                                    }
                                  >
                                    {intl.formatMessage({
                                      id: 'live.create.copy',
                                    })}
                                  </Button>
                                </Space>
                              </Descriptions.Item>
                            ))}
                          </Descriptions>
                          <Alert
                            type="info"
                            showIcon
                            message={intl.formatMessage({
                              id: 'live.create.obsSetupTip',
                            })}
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
                            {intl.formatMessage({
                              id: 'live.create.openWatchPage',
                            })}
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
                              {intl.formatMessage({
                                id: 'live.create.watchQr',
                              })}
                            </Text>
                            <QrCodePanel
                              payload={watchQrPayload}
                              size={150}
                              emptyText={intl.formatMessage({
                                id: 'live.create.watchQrEmpty',
                              })}
                            />
                          </div>
                        </Space>
                      ) : (
                        <Alert
                          type="info"
                          showIcon
                          message={intl.formatMessage({
                            id: 'live.create.sessionDetailsPlaceholder',
                          })}
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
