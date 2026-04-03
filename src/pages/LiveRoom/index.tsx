import {
  CopyOutlined,
  DownOutlined,
  EyeOutlined,
  GlobalOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  QrcodeOutlined,
  ShopOutlined,
  ShoppingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useIntl, useLocation, useModel, useParams } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Input,
  Row,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';

import LiveInteractionPanel from '@/components/live-room/LiveInteractionPanel';
import ManageLivePaymentsDrawer from '@/components/live-room/ManageLivePaymentsDrawer';
import ManageLiveProductsDrawer from '@/components/live-room/ManageLiveProductsDrawer';
import QrCodePanel from '@/components/QrCodePanel';
import { liveConfig } from '@/config/live';
import {
  endLiveBroadcast,
  getLiveBroadcast,
  getLiveBroadcastStatus,
  getSafeWatchUrl,
  startLiveBroadcast,
  type LiveBroadcast,
  type LiveBroadcastStatus,
} from '@/services/live';
import {
  deleteLiveChatMessage,
  getLiveChatMessages,
  pinLiveChatMessage,
  postLiveChatMessage,
} from '@/services/liveChat';
import {
  createLivePaymentMethod,
  deleteLivePaymentMethod,
  getManageLivePaymentMethods,
  getPublicLivePaymentMethods,
  updateLivePaymentMethod,
} from '@/services/livePaymentMethods';
import {
  createLivePaymentOrder,
  getLivePaymentOrderDetail,
  markLivePaymentOrderPaid,
} from '@/services/livePaymentOrders';
import {
  createLiveProductBinding,
  deleteLiveProductBinding,
  getManageLiveProducts,
  getPublicLiveProducts,
  updateLiveProductBinding,
} from '@/services/liveProducts';
import { getMyProducts } from '@/services/product';
import type { LiveChatMessage } from '@/types/liveChat';
import type {
  LivePaymentMethod,
  ManageLivePaymentMethod,
} from '@/types/livePaymentMethod';
import type { LiveProductBinding } from '@/types/liveProduct';
import type { PaymentOrder } from '@/types/paymentOrder';
import type { Product } from '@/types/product';
import { getLocalizedCategoryLabel } from '@/utils/categoryI18n';
import { getLiveStatusPresentation } from '@/utils/liveStatusPresentation';

const { Title, Text, Paragraph } = Typography;

type PlayerPhase = 'idle' | 'loading' | 'playing' | 'waiting' | 'error';

type HlsCtor = {
  isSupported: () => boolean;
  Events: { MANIFEST_PARSED: string; ERROR: string };
  new (): {
    loadSource: (src: string) => void;
    attachMedia: (media: HTMLVideoElement) => void;
    on: (event: string, callback: (...args: any[]) => void) => void;
    destroy: () => void;
  };
};

declare global {
  interface Window {
    Hls?: HlsCtor;
  }
}

const copyValue = async (value: string, label: string) => {
  if (!value) {
    message.warning(`${label} is not available yet.`);
    return;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      message.success(`${label} copied.`);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error('copy_failed');
    }

    message.success(`${label} copied.`);
  } catch (error) {
    message.info(`Copy ${label.toLowerCase()} manually.`);
  }
};

const loadHlsLibrary = async (): Promise<HlsCtor | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.Hls) {
    return window.Hls;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-hls-js-cdn="true"]',
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Unable to load hls.js.')),
        { once: true },
      );
      return;
    }

    if (!liveConfig.hlsScriptUrl) {
      reject(new Error('Missing HLS script URL configuration.'));
      return;
    }

    const script = document.createElement('script');
    script.src = liveConfig.hlsScriptUrl;
    script.async = true;
    script.dataset.hlsJsCdn = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load hls.js.'));
    document.head.appendChild(script);
  });

  return window.Hls || null;
};

export default function LiveRoomPage() {
  const intl = useIntl();
  const { initialState } = useModel('@@initialState');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const chatAfterIdRef = useRef<number | string | null>(null);
  const [broadcast, setBroadcast] = useState<LiveBroadcast | null>(null);
  const [backendStatus, setBackendStatus] =
    useState<LiveBroadcastStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<'start' | 'end' | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [playerStatus, setPlayerStatus] = useState(
    intl.formatMessage({ id: 'live.room.player.waitingPlaybackUrl' }),
  );
  const [playerPhase, setPlayerPhase] = useState<PlayerPhase>('idle');
  const [payQrPayload, setPayQrPayload] = useState('');
  const [publicProducts, setPublicProducts] = useState<LiveProductBinding[]>(
    [],
  );
  const [publicProductsLoading, setPublicProductsLoading] = useState(true);
  const [publicProductsError, setPublicProductsError] = useState('');
  const [manageBindings, setManageBindings] = useState<LiveProductBinding[]>(
    [],
  );
  const [manageEnabled, setManageEnabled] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageDrawerOpen, setManageDrawerOpen] = useState(false);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatError, setChatError] = useState('');
  const [publicPayments, setPublicPayments] = useState<LivePaymentMethod[]>([]);
  const [publicPaymentsLoading, setPublicPaymentsLoading] = useState(true);
  const [publicPaymentsError, setPublicPaymentsError] = useState('');
  const [managePayments, setManagePayments] = useState<
    ManageLivePaymentMethod[]
  >([]);
  const [managePaymentsEnabled, setManagePaymentsEnabled] = useState(false);
  const [managePaymentsLoading, setManagePaymentsLoading] = useState(false);
  const [managePaymentsError, setManagePaymentsError] = useState('');
  const [managePaymentsDrawerOpen, setManagePaymentsDrawerOpen] =
    useState(false);
  const [paymentOrderLoading, setPaymentOrderLoading] = useState(false);
  const [paymentOrderError, setPaymentOrderError] = useState('');
  const [latestPaymentOrder, setLatestPaymentOrder] =
    useState<PaymentOrder | null>(null);
  const [expandedSidebarPanels, setExpandedSidebarPanels] = useState<string[]>(
    [],
  );
  const [showAllPreviewProducts, setShowAllPreviewProducts] = useState(false);

  const isLoggedIn = Boolean(initialState?.currentUser?.email);
  const isCreator = Boolean(
    initialState?.currentUser &&
      (initialState.currentUser.is_creator ||
        initialState.currentUser.role === 'creator' ||
        initialState.currentUser.user_type === 'creator'),
  );
  const effectiveBackendStatus =
    backendStatus?.effective_status ||
    backendStatus?.status ||
    backendStatus?.django_status ||
    broadcast?.normalized_status ||
    broadcast?.status;
  const statusPresentation = getLiveStatusPresentation(
    effectiveBackendStatus,
    intl,
  );
  const playbackUrl =
    backendStatus?.playback_url || broadcast?.playback_url || '';
  const rawWatchUrl =
    backendStatus?.watch_url ||
    broadcast?.watch_url ||
    getSafeWatchUrl({
      id: backendStatus?.id || broadcast?.id,
    });
  const watchUrl = useMemo(() => {
    const candidate = String(rawWatchUrl || '').trim();
    if (!candidate) return '';
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }
    const path = candidate.startsWith('/') ? candidate : `/${candidate}`;
    const origin =
      liveConfig.watchPageOrigin ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    return origin ? `${String(origin).replace(/\/$/, '')}${path}` : path;
  }, [rawWatchUrl]);
  const title =
    broadcast?.title ||
    broadcast?.name ||
    intl.formatMessage({ id: 'live.room.fallbackTitle' });
  const creatorName =
    broadcast?.creator?.name ||
    broadcast?.creator?.username ||
    broadcast?.creator?.email ||
    intl.formatMessage({ id: 'live.common.creatorFallback' });
  const viewerCount =
    backendStatus?.viewer_count ??
    backendStatus?.viewerCount ??
    broadcast?.viewer_count ??
    broadcast?.viewerCount ??
    0;
  const canStartLive =
    typeof backendStatus?.can_start === 'boolean'
      ? backendStatus.can_start
      : statusPresentation.uiStatus !== 'live';
  const canEndLive =
    typeof backendStatus?.can_end === 'boolean'
      ? backendStatus.can_end
      : statusPresentation.uiStatus !== 'ended';
  const canShowChatInput =
    isLoggedIn && statusPresentation.uiStatus !== 'ended';
  const chatDisabledReason = !isLoggedIn
    ? intl.formatMessage({ id: 'live.room.chatSignedOut' })
    : statusPresentation.uiStatus === 'ended'
    ? intl.formatMessage({ id: 'live.room.chatUnavailableEnded' })
    : '';
  const canModerateChat = Boolean(
    initialState?.currentUser &&
      (manageEnabled ||
        initialState.currentUser.is_admin ||
        initialState.currentUser.is_staff ||
        initialState.currentUser.is_superuser),
  );
  const previewProducts = showAllPreviewProducts
    ? publicProducts.slice(0, 3)
    : publicProducts.slice(0, 1);
  const sidebarStoreSummary = useMemo(() => {
    const withStore = publicProducts.find((item) => item?.product?.store);
    return withStore?.product?.store || null;
  }, [publicProducts]);
  const sidebarChatPreview = useMemo(
    () =>
      chatMessages
        .filter((item) => !item.is_deleted && item.content)
        .slice(0, 2),
    [chatMessages],
  );
  const sidebarChatSummary = chatLoading
    ? ''
    : sidebarChatPreview.length > 0
    ? sidebarChatPreview[0].content || ''
    : isLoggedIn
    ? intl.formatMessage({ id: 'live.room.sidebar.chat.noMessages' })
    : intl.formatMessage({ id: 'live.room.sidebar.chat.loginToJoin' });
  const sidebarProductSummary = publicProductsLoading
    ? ''
    : publicProducts.length > 0
    ? intl.formatMessage(
        { id: 'live.room.sidebar.products.summary' },
        { count: publicProducts.length },
      )
    : intl.formatMessage({ id: 'live.room.sidebar.products.none' });

  const loadPublicProducts = async () => {
    if (!id) return;
    setPublicProductsLoading(true);
    setPublicProductsError('');
    try {
      const items = await getPublicLiveProducts(id);
      setPublicProducts(items);
    } catch (error: any) {
      setPublicProducts([]);
      setPublicProductsError(
        error?.message ||
          intl.formatMessage({ id: 'live.products.error.load' }),
      );
    } finally {
      setPublicProductsLoading(false);
    }
  };

  const loadManageProducts = async () => {
    if (!id || !isLoggedIn) {
      setManageEnabled(false);
      return;
    }

    try {
      const items = await getManageLiveProducts(id);
      setManageBindings(items);
      setManageEnabled(true);
      setManageError('');
    } catch (error: any) {
      if (error?.status === 403 || error?.status === 404) {
        setManageEnabled(false);
        setManageBindings([]);
        return;
      }

      setManageEnabled(false);
      setManageError(
        error?.message ||
          intl.formatMessage({ id: 'live.products.error.manage' }),
      );
    }
  };

  const loadPublicPayments = async () => {
    if (!id) return;
    setPublicPaymentsLoading(true);
    setPublicPaymentsError('');
    try {
      const items = await getPublicLivePaymentMethods(id);
      setPublicPayments(items);
    } catch (error: any) {
      setPublicPayments([]);
      setPublicPaymentsError(
        error?.message ||
          intl.formatMessage({ id: 'live.payments.error.load' }),
      );
    } finally {
      setPublicPaymentsLoading(false);
    }
  };

  const loadManagePayments = async () => {
    if (!id || !isLoggedIn) {
      setManagePaymentsEnabled(false);
      return;
    }

    try {
      const items = await getManageLivePaymentMethods(id);
      setManagePayments(items);
      setManagePaymentsEnabled(true);
      setManagePaymentsError('');
    } catch (error: any) {
      if (error?.status === 403 || error?.status === 404) {
        setManagePaymentsEnabled(false);
        setManagePayments([]);
        return;
      }

      setManagePaymentsEnabled(false);
      setManagePaymentsError(
        error?.message ||
          intl.formatMessage({ id: 'live.payments.error.manage' }),
      );
    }
  };

  const loadInitialChat = async () => {
    if (!id) return;
    setChatLoading(true);
    setChatError('');
    try {
      const response = await getLiveChatMessages(id, { limit: 50 });
      setChatMessages(response.results || []);
      const nextAfterId =
        response.next_after_id ??
        (response.results?.length
          ? response.results[response.results.length - 1]?.id
          : null);
      chatAfterIdRef.current = nextAfterId;
    } catch (error: any) {
      setChatMessages([]);
      setChatError(
        error?.message || intl.formatMessage({ id: 'live.chat.error.load' }),
      );
    } finally {
      setChatLoading(false);
    }
  };

  const pollChat = async () => {
    if (!id) return;
    try {
      const response = await getLiveChatMessages(id, {
        limit: 50,
        after_id: chatAfterIdRef.current || undefined,
      });
      if (response.results?.length) {
        setChatMessages((prev) => {
          const seen = new Set(prev.map((item) => String(item.id)));
          const incoming = response.results.filter(
            (item) => !seen.has(String(item.id)),
          );
          return incoming.length ? [...prev, ...incoming] : prev;
        });
      }
      if (
        response.next_after_id !== undefined &&
        response.next_after_id !== null
      ) {
        chatAfterIdRef.current = response.next_after_id;
      } else if (response.results?.length) {
        const nextAfterId =
          response.results[response.results.length - 1]?.id ??
          chatAfterIdRef.current;
        chatAfterIdRef.current = nextAfterId;
      }
    } catch (error) {
      // silent polling failures
    }
  };

  const loadBroadcast = async (showLoader = false) => {
    if (!id) {
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    try {
      const data = await getLiveBroadcast(id);
      setBroadcast(data);
      setPayQrPayload(data?.payment_address || data?.wallet_address || '');
      setErrorMessage('');
      setPlayerPhase(data?.playback_url ? 'loading' : 'waiting');
      setPlayerStatus(
        data?.playback_url
          ? intl.formatMessage({ id: 'live.room.player.waitingStream' })
          : intl.formatMessage({ id: 'live.room.player.notStarted' }),
      );
    } catch (error: any) {
      setErrorMessage(
        error?.message || intl.formatMessage({ id: 'live.room.error.load' }),
      );
      setBroadcast(null);
    } finally {
      setLoading(false);
    }
  };

  const loadBackendStatus = async () => {
    if (!id) {
      return;
    }

    try {
      const data = await getLiveBroadcastStatus(id);
      setBackendStatus(data);
    } catch (error: any) {
      setBackendStatus(null);
    }
  };

  useEffect(() => {
    loadBroadcast(true);
    loadBackendStatus();
    loadPublicProducts();
    loadManageProducts();
    loadPublicPayments();
    loadManagePayments();
    loadInitialChat();
    const detailInterval = window.setInterval(
      () => loadBroadcast(false),
      20000,
    );
    const statusInterval = window.setInterval(() => loadBackendStatus(), 12000);
    const productsInterval = window.setInterval(
      () => loadPublicProducts(),
      18000,
    );
    const paymentsInterval = window.setInterval(
      () => loadPublicPayments(),
      18000,
    );
    const chatInterval = window.setInterval(() => pollChat(), 6000);
    return () => {
      window.clearInterval(detailInterval);
      window.clearInterval(statusInterval);
      window.clearInterval(productsInterval);
      window.clearInterval(paymentsInterval);
      window.clearInterval(chatInterval);
    };
  }, [id]); // chat cursor is tracked via chatAfterIdRef to avoid reinitializing polling

  useEffect(() => {
    if (!isLoggedIn || !manageEnabled) {
      setSellerProducts([]);
      return;
    }

    getMyProducts()
      .then((data) => setSellerProducts(data.results || []))
      .catch(() => setSellerProducts([]));
  }, [isLoggedIn, manageEnabled]);

  useEffect(() => {
    const videoElement = videoElementRef.current;
    if (!videoElement || !playbackUrl) {
      setPlayerPhase('waiting');
      setPlayerStatus(
        intl.formatMessage({ id: 'live.room.player.notStarted' }),
      );
      return;
    }

    let cancelled = false;

    const attachPlayback = async () => {
      if (cancelled || !videoElement) {
        return;
      }

      hlsRef.current?.destroy();
      hlsRef.current = null;
      setPlayerPhase('loading');
      setPlayerStatus(
        intl.formatMessage({ id: 'live.room.player.waitingStream' }),
      );
      videoElement.pause();
      videoElement.removeAttribute('src');
      videoElement.load();

      const canUseNativeHls = videoElement.canPlayType(
        'application/vnd.apple.mpegurl',
      );

      const handlePlaying = () => {
        if (!cancelled) {
          setPlayerPhase('playing');
          setPlayerStatus(
            intl.formatMessage({ id: 'live.room.player.playing' }),
          );
        }
      };

      const handleWaiting = () => {
        if (!cancelled) {
          setPlayerPhase('waiting');
          setPlayerStatus(
            intl.formatMessage({ id: 'live.room.player.waitingStream' }),
          );
        }
      };

      const handlePlaybackError = () => {
        if (!cancelled) {
          setPlayerPhase('error');
          setPlayerStatus(
            intl.formatMessage({ id: 'live.room.player.notStarted' }),
          );
        }
      };

      videoElement.onplaying = handlePlaying;
      videoElement.onwaiting = handleWaiting;
      videoElement.onerror = handlePlaybackError;
      videoElement.onloadeddata = handlePlaying;

      if (canUseNativeHls) {
        videoElement.src = playbackUrl;
        videoElement.play().catch(() => undefined);
        return;
      }

      try {
        const Hls = await loadHlsLibrary();
        if (cancelled || !videoElement) {
          return;
        }

        if (Hls?.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(playbackUrl);
          hls.attachMedia(videoElement);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!cancelled) {
              setPlayerPhase('loading');
              setPlayerStatus(
                intl.formatMessage({ id: 'live.room.player.waitingStream' }),
              );
              videoElement.play().catch(() => undefined);
            }
          });
          hls.on(Hls.Events.ERROR, () => {
            if (!cancelled) {
              setPlayerPhase('error');
              setPlayerStatus(
                intl.formatMessage({ id: 'live.room.player.notStarted' }),
              );
            }
          });
          return;
        }
      } catch (error) {
        setPlayerPhase('error');
        setPlayerStatus(
          intl.formatMessage({ id: 'live.room.player.hlsLoadError' }),
        );
        return;
      }

      setPlayerPhase('error');
      setPlayerStatus(
        intl.formatMessage({ id: 'live.room.player.hlsUnsupported' }),
      );
    };

    attachPlayback();

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      videoElement.onplaying = null;
      videoElement.onwaiting = null;
      videoElement.onerror = null;
      videoElement.onloadeddata = null;
    };
  }, [playbackUrl]);

  const getReturnUrl = () => `${location.pathname}${location.search}`;

  const navigateToLogin = () => {
    history.push(`/login?redirect=${encodeURIComponent(getReturnUrl())}`);
  };

  const handleAction = async (type: 'start' | 'end') => {
    if (!id) {
      return;
    }

    if (!isLoggedIn) {
      message.info(intl.formatMessage({ id: 'live.control.loginRequired' }));
      navigateToLogin();
      return;
    }
    if (!isCreator) {
      message.warning(intl.formatMessage({ id: 'live.creatorRequired' }));
      return;
    }

    setActionLoading(type);
    try {
      const next =
        type === 'start'
          ? await startLiveBroadcast(id)
          : await endLiveBroadcast(id);
      setBroadcast(next);
      await loadBackendStatus();
      await loadBroadcast(false);
      setPlayerPhase(next?.playback_url ? 'loading' : playerPhase);
      setPlayerStatus(
        next?.playback_url
          ? intl.formatMessage({ id: 'live.room.player.waitingStream' })
          : playerStatus,
      );
      message.success(
        type === 'start'
          ? intl.formatMessage({ id: 'live.control.started' })
          : intl.formatMessage({ id: 'live.control.ended' }),
      );
    } catch (error: any) {
      if (error?.status === 409) {
        message.warning(
          error?.message ||
            intl.formatMessage({ id: 'live.control.conflictTransition' }),
        );
        await loadBackendStatus();
        await loadBroadcast(false);
        return;
      }
      message.error(
        error?.message ||
          intl.formatMessage(
            { id: 'live.control.errorAction' },
            { action: type },
          ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendChat = async (content: string) => {
    if (!id || !content.trim()) return;
    try {
      const created = await postLiveChatMessage(id, {
        content: content.trim(),
      });
      setChatMessages((prev) => [...prev, created]);
      if (created?.id !== undefined && created?.id !== null) {
        chatAfterIdRef.current = created.id;
      }
    } catch (error: any) {
      message.warning(
        error?.message || intl.formatMessage({ id: 'live.chat.error.load' }),
      );
    }
  };

  const handlePinToggleChat = async (item: LiveChatMessage) => {
    if (!id || !item?.id) return;
    try {
      const updated = await pinLiveChatMessage(id, item.id, {
        is_pinned: !item.is_pinned,
      });
      setChatMessages((prev) =>
        prev.map((messageItem) =>
          String(messageItem.id) === String(item.id) ? updated : messageItem,
        ),
      );
    } catch (error: any) {
      message.warning(
        error?.message || intl.formatMessage({ id: 'live.chat.error.load' }),
      );
    }
  };

  const handleDeleteChat = async (item: LiveChatMessage) => {
    if (!id || !item?.id) return;
    try {
      await deleteLiveChatMessage(id, item.id);
      setChatMessages((prev) =>
        prev.filter(
          (messageItem) => String(messageItem.id) !== String(item.id),
        ),
      );
    } catch (error: any) {
      message.warning(
        error?.message || intl.formatMessage({ id: 'live.chat.error.load' }),
      );
    }
  };

  const handleCreatePaymentMethod = async (
    payload: Partial<ManageLivePaymentMethod>,
  ) => {
    if (!id) return;
    setManagePaymentsLoading(true);
    try {
      await createLivePaymentMethod(id, payload);
      await Promise.all([loadManagePayments(), loadPublicPayments()]);
      message.success(intl.formatMessage({ id: 'common.saved' }));
    } catch (error: any) {
      setManagePaymentsError(
        error?.message ||
          intl.formatMessage({ id: 'live.payments.error.manage' }),
      );
    } finally {
      setManagePaymentsLoading(false);
    }
  };

  const handleUpdatePaymentMethod = async (
    paymentMethodId: string | number,
    payload: Partial<ManageLivePaymentMethod>,
  ) => {
    if (!id) return;
    setManagePaymentsLoading(true);
    try {
      await updateLivePaymentMethod(id, paymentMethodId, payload);
      await Promise.all([loadManagePayments(), loadPublicPayments()]);
      message.success(intl.formatMessage({ id: 'common.saved' }));
    } catch (error: any) {
      setManagePaymentsError(
        error?.message ||
          intl.formatMessage({ id: 'live.payments.error.manage' }),
      );
    } finally {
      setManagePaymentsLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (
    paymentMethodId: string | number,
  ) => {
    if (!id) return;
    setManagePaymentsLoading(true);
    try {
      await deleteLivePaymentMethod(id, paymentMethodId);
      await Promise.all([loadManagePayments(), loadPublicPayments()]);
      message.success(intl.formatMessage({ id: 'common.saved' }));
    } catch (error: any) {
      setManagePaymentsError(
        error?.message ||
          intl.formatMessage({ id: 'live.payments.error.manage' }),
      );
    } finally {
      setManagePaymentsLoading(false);
    }
  };

  const handleCreatePaymentOrder = async (values: any) => {
    if (!id) return;
    setPaymentOrderLoading(true);
    setPaymentOrderError('');
    try {
      const created = await createLivePaymentOrder(id, values);
      const detail = await getLivePaymentOrderDetail(id, created.id);
      setLatestPaymentOrder(detail);
      message.success(intl.formatMessage({ id: 'live.orders.created' }));
    } catch (error: any) {
      if (error?.status === 401) {
        navigateToLogin();
        return;
      }
      setPaymentOrderError(
        error?.message ||
          intl.formatMessage({ id: 'live.orders.error.create' }),
      );
    } finally {
      setPaymentOrderLoading(false);
    }
  };

  const handleMarkPaymentOrderPaid = async () => {
    if (!id || !latestPaymentOrder?.id) return;
    setPaymentOrderLoading(true);
    try {
      const updated = await markLivePaymentOrderPaid(id, latestPaymentOrder.id);
      setLatestPaymentOrder(updated);
      message.success(intl.formatMessage({ id: 'live.orders.markPaid' }));
    } catch (error: any) {
      setPaymentOrderError(
        error?.message ||
          intl.formatMessage({ id: 'live.orders.error.detail' }),
      );
    } finally {
      setPaymentOrderLoading(false);
    }
  };

  const startButtonLabel = !isLoggedIn
    ? intl.formatMessage({ id: 'live.control.startCtaLogin' })
    : isCreator
    ? intl.formatMessage({ id: 'live.control.startCta' })
    : intl.formatMessage({ id: 'live.creatorRequired.short' });

  return (
    <PageContainer title={false}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '8px 0 24px' }}>
        {loading ? (
          <Card variant="borderless" style={{ borderRadius: 20 }}>
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        ) : errorMessage ? (
          <Alert type="error" showIcon message={errorMessage} />
        ) : broadcast ? (
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Card variant="borderless" style={{ borderRadius: 20 }}>
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={statusPresentation.color}>
                    {statusPresentation.label}
                  </Tag>
                  {broadcast.category ? (
                    <Tag>
                      {getLocalizedCategoryLabel(intl, {
                        slug: broadcast.category,
                        name: broadcast.category,
                      })}
                    </Tag>
                  ) : null}
                  <Tag icon={<EyeOutlined />}>
                    {intl.formatMessage(
                      { id: 'live.common.viewers' },
                      { count: viewerCount.toLocaleString() },
                    )}
                  </Tag>
                </Space>
                <Row gutter={[14, 10]} align="middle">
                  <Col xs={24} lg={16}>
                    <Title level={2} style={{ margin: 0 }}>
                      {title}
                    </Title>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Space
                      wrap
                      style={{ justifyContent: 'flex-end', width: '100%' }}
                    >
                      {manageEnabled ? (
                        <Button onClick={() => setManageDrawerOpen(true)}>
                          {intl.formatMessage({
                            id: 'live.products.manage.open',
                          })}
                        </Button>
                      ) : null}
                      {managePaymentsEnabled ? (
                        <Button
                          onClick={() => setManagePaymentsDrawerOpen(true)}
                        >
                          {intl.formatMessage({
                            id: 'live.payments.manage.open',
                          })}
                        </Button>
                      ) : null}
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        loading={actionLoading === 'start'}
                        disabled={!canStartLive || !isCreator}
                        onClick={() => handleAction('start')}
                      >
                        {startButtonLabel}
                      </Button>
                      <Button
                        danger
                        icon={<PoweroffOutlined />}
                        loading={actionLoading === 'end'}
                        disabled={!canEndLive || !isCreator}
                        onClick={() => handleAction('end')}
                      >
                        {intl.formatMessage({ id: 'live.control.endCta' })}
                      </Button>
                    </Space>
                  </Col>
                </Row>
                <Row gutter={[14, 10]} align="middle">
                  <Col xs={24} lg={8}>
                    <Space align="center" size={10}>
                      <Avatar
                        icon={<UserOutlined />}
                        src={broadcast.creator?.avatar_url}
                      />
                      <div>
                        <Text
                          style={{
                            display: 'block',
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {creatorName}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {intl.formatMessage({
                            id: 'live.room.streamHost',
                          })}
                        </Text>
                      </div>
                    </Space>
                  </Col>
                  <Col xs={24} lg={16}>
                    <Paragraph
                      type="secondary"
                      style={{
                        marginBottom: 0,
                        fontSize: 13,
                        lineHeight: 1.65,
                      }}
                    >
                      {broadcast.description ||
                        intl.formatMessage({
                          id: 'live.room.descriptionFallback',
                        })}
                    </Paragraph>
                  </Col>
                </Row>
              </Space>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} md={16} xl={16}>
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  <Card
                    variant="borderless"
                    style={{ borderRadius: 20, overflow: 'hidden' }}
                  >
                    {playbackUrl ? (
                      <Space
                        direction="vertical"
                        size={16}
                        style={{ width: '100%' }}
                      >
                        <div
                          style={{
                            borderRadius: 16,
                            overflow: 'hidden',
                            background: '#000',
                            minHeight: 420,
                          }}
                        >
                          <video
                            ref={videoElementRef}
                            autoPlay
                            controls
                            playsInline
                            preload="auto"
                            style={{
                              width: '100%',
                              minHeight: 420,
                              background: '#000',
                            }}
                          />
                        </div>
                        <Alert type="info" showIcon message={playerStatus} />
                      </Space>
                    ) : (
                      <Empty
                        description={intl.formatMessage({
                          id: 'live.room.playbackUnavailable',
                        })}
                      />
                    )}
                  </Card>
                  <LiveInteractionPanel
                    productsLoading={publicProductsLoading}
                    productsError={publicProductsError}
                    products={publicProducts}
                    chatLoading={chatLoading}
                    chatError={chatError}
                    chatMessages={chatMessages}
                    paymentsLoading={publicPaymentsLoading}
                    paymentsError={publicPaymentsError}
                    paymentMethods={publicPayments}
                    createOrderLoading={paymentOrderLoading}
                    createOrderError={paymentOrderError}
                    latestOrder={latestPaymentOrder}
                    canCompose={canShowChatInput}
                    composeDisabledReason={chatDisabledReason}
                    canModerate={canModerateChat}
                    isLoggedIn={isLoggedIn}
                    canMarkOrderPaid={managePaymentsEnabled}
                    onRequireLogin={navigateToLogin}
                    onCopyPaymentValue={copyValue}
                    onCreateOrder={handleCreatePaymentOrder}
                    onMarkOrderPaid={handleMarkPaymentOrderPaid}
                    onSend={handleSendChat}
                    onPinToggle={handlePinToggleChat}
                    onDelete={handleDeleteChat}
                  />
                </Space>
              </Col>

              <Col xs={24} md={8} xl={8}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Card size="small" style={{ borderRadius: 16 }}>
                    <Space
                      align="start"
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Space size={8}>
                        <QrcodeOutlined />
                        <Text strong>
                          {intl.formatMessage({ id: 'live.room.watchQr' })}
                        </Text>
                      </Space>
                      <Space size={0}>
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          style={{ color: 'rgba(0, 0, 0, 0.65)' }}
                          onClick={() =>
                            copyValue(
                              watchUrl,
                              intl.formatMessage({ id: 'live.room.watchUrl' }),
                            )
                          }
                        >
                          {intl.formatMessage({ id: 'live.room.copy' })}
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          style={{ color: 'rgba(0, 0, 0, 0.65)' }}
                          icon={
                            <DownOutlined
                              style={{
                                transform: expandedSidebarPanels.includes(
                                  'watch',
                                )
                                  ? 'rotate(180deg)'
                                  : undefined,
                                transition: 'transform 0.2s ease',
                              }}
                            />
                          }
                          onClick={() =>
                            setExpandedSidebarPanels((prev) =>
                              prev.includes('watch')
                                ? prev.filter((key) => key !== 'watch')
                                : [...prev, 'watch'],
                            )
                          }
                        >
                          {intl.formatMessage({
                            id: 'live.room.sidebar.qr.short',
                          })}
                        </Button>
                      </Space>
                    </Space>
                    {expandedSidebarPanels.includes('watch') ? (
                      <QrCodePanel
                        payload={watchUrl}
                        emptyText={intl.formatMessage({
                          id: 'live.room.watchUrlUnavailable',
                        })}
                      />
                    ) : null}
                  </Card>

                  <Card size="small" style={{ borderRadius: 16 }}>
                    <Space
                      align="start"
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Space size={8}>
                        <QrcodeOutlined />
                        <Text strong>
                          {intl.formatMessage({ id: 'live.room.payQr' })}
                        </Text>
                      </Space>
                      <Space size={0}>
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          style={{ color: 'rgba(0, 0, 0, 0.65)' }}
                          onClick={() =>
                            copyValue(
                              payQrPayload,
                              intl.formatMessage({
                                id: 'live.room.paymentAddress',
                              }),
                            )
                          }
                        >
                          {intl.formatMessage({
                            id: 'live.room.sidebar.copyAddress',
                          })}
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          style={{ color: 'rgba(0, 0, 0, 0.65)' }}
                          icon={
                            <DownOutlined
                              style={{
                                transform: expandedSidebarPanels.includes('pay')
                                  ? 'rotate(180deg)'
                                  : undefined,
                                transition: 'transform 0.2s ease',
                              }}
                            />
                          }
                          onClick={() =>
                            setExpandedSidebarPanels((prev) =>
                              prev.includes('pay')
                                ? prev.filter((key) => key !== 'pay')
                                : [...prev, 'pay'],
                            )
                          }
                        >
                          {intl.formatMessage({
                            id: 'live.room.sidebar.qr.short',
                          })}
                        </Button>
                      </Space>
                    </Space>
                    {expandedSidebarPanels.includes('pay') ? (
                      <QrCodePanel
                        payload={payQrPayload}
                        emptyText={intl.formatMessage({
                          id: 'live.room.paymentAddressUnavailable',
                        })}
                      />
                    ) : null}
                  </Card>

                  <Card size="small" style={{ borderRadius: 16 }}>
                    <Space
                      align="start"
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Space size={8}>
                        <MessageOutlined />
                        <Text strong>
                          {intl.formatMessage({
                            id: 'live.room.sidebar.liveChat',
                          })}
                        </Text>
                      </Space>
                      <Button
                        type="text"
                        size="small"
                        style={{ color: 'rgba(0, 0, 0, 0.65)' }}
                        icon={
                          <DownOutlined
                            style={{
                              transform: expandedSidebarPanels.includes('chat')
                                ? 'rotate(180deg)'
                                : undefined,
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        }
                        onClick={() =>
                          setExpandedSidebarPanels((prev) =>
                            prev.includes('chat')
                              ? prev.filter((key) => key !== 'chat')
                              : [...prev, 'chat'],
                          )
                        }
                      />
                    </Space>
                    {expandedSidebarPanels.includes('chat') ? (
                      chatLoading ? (
                        <Skeleton
                          active
                          paragraph={{ rows: 2 }}
                          title={false}
                        />
                      ) : sidebarChatPreview.length > 0 ? (
                        <Space
                          direction="vertical"
                          size={6}
                          style={{ width: '100%' }}
                        >
                          {sidebarChatPreview.map((item) => (
                            <Text
                              key={String(item.id)}
                              type="secondary"
                              ellipsis={{ tooltip: item.content }}
                            >
                              {(item.user?.name ||
                                item.user?.username ||
                                intl.formatMessage({
                                  id: 'live.room.sidebar.chat.userFallback',
                                })) +
                                ': ' +
                                (item.content || '')}
                            </Text>
                          ))}
                        </Space>
                      ) : (
                        <Text type="secondary">{sidebarChatSummary}</Text>
                      )
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {sidebarChatSummary}
                      </Text>
                    )}
                  </Card>

                  <Card size="small" style={{ borderRadius: 16 }}>
                    <Space
                      align="start"
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Space size={8}>
                        <ShoppingOutlined />
                        <Text strong>
                          {intl.formatMessage({
                            id: 'live.room.sidebar.productListings',
                          })}
                        </Text>
                      </Space>
                      <Button
                        type="text"
                        size="small"
                        style={{ color: 'rgba(0, 0, 0, 0.65)' }}
                        icon={
                          <DownOutlined
                            style={{
                              transform:
                                expandedSidebarPanels.includes('products')
                                  ? 'rotate(180deg)'
                                  : undefined,
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        }
                        onClick={() =>
                          setExpandedSidebarPanels((prev) =>
                            prev.includes('products')
                              ? prev.filter((key) => key !== 'products')
                              : [...prev, 'products'],
                          )
                        }
                      />
                    </Space>
                    {expandedSidebarPanels.includes('products') ? (
                      publicProductsLoading ? (
                        <Skeleton
                          active
                          paragraph={{ rows: 2 }}
                          title={false}
                        />
                      ) : publicProductsError ? (
                        <Alert
                          type="warning"
                          showIcon
                          message={publicProductsError}
                        />
                      ) : previewProducts.length === 0 ? (
                        <Text type="secondary">
                          {intl.formatMessage({
                            id: 'live.room.sidebar.products.none',
                          })}
                        </Text>
                      ) : (
                        <Space
                          direction="vertical"
                          size={8}
                          style={{ width: '100%' }}
                        >
                          {previewProducts.map((binding) => (
                            <Space
                              key={String(binding.binding_id)}
                              size={10}
                              align="start"
                              style={{ width: '100%' }}
                            >
                              <Avatar
                                shape="square"
                                size={44}
                                src={
                                  binding.product.cover_image_url || undefined
                                }
                                icon={<ShoppingOutlined />}
                              />
                              <Space
                                direction="vertical"
                                size={0}
                                style={{ flex: 1 }}
                              >
                                <Text
                                  strong
                                  ellipsis={{ tooltip: binding.product.title }}
                                >
                                  {binding.product.title}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {(binding.product.price_amount &&
                                    binding.product.price_currency &&
                                    `${binding.product.price_amount} ${binding.product.price_currency}`) ||
                                    intl.formatMessage({
                                      id: 'live.room.sidebar.products.priceUnavailable',
                                    })}
                                </Text>
                                {binding.product.description ? (
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                    ellipsis={{
                                      tooltip: binding.product.description,
                                    }}
                                  >
                                    {binding.product.description}
                                  </Text>
                                ) : null}
                              </Space>
                            </Space>
                          ))}
                          {publicProducts.length > 1 ? (
                            <Button
                              type="link"
                              size="small"
                              style={{
                                paddingInline: 0,
                                alignSelf: 'flex-start',
                              }}
                              onClick={() =>
                                setShowAllPreviewProducts(
                                  (previous) => !previous,
                                )
                              }
                            >
                              {showAllPreviewProducts
                                ? intl.formatMessage({
                                    id: 'live.room.sidebar.products.showLess',
                                  })
                                : intl.formatMessage(
                                    {
                                      id: 'live.room.sidebar.products.showMore',
                                    },
                                    { count: publicProducts.length - 1 },
                                  )}
                            </Button>
                          ) : null}
                        </Space>
                      )
                    ) : (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {sidebarProductSummary}
                      </Text>
                    )}
                  </Card>

                  <Card size="small" style={{ borderRadius: 16 }}>
                    <Space
                      align="center"
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Space size={8} align="center">
                        <ShopOutlined />
                        <Text strong>
                          {intl.formatMessage({
                            id: 'live.room.sidebar.sellerStore',
                          })}
                        </Text>
                      </Space>
                      {sidebarStoreSummary?.slug ? (
                        <Tooltip
                          title={intl.formatMessage({
                            id: 'live.room.sidebar.store.open',
                          })}
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<GlobalOutlined />}
                            onClick={() =>
                              history.push(`/store/${sidebarStoreSummary.slug}`)
                            }
                          />
                        </Tooltip>
                      ) : null}
                    </Space>
                  </Card>

                  <Card size="small" style={{ borderRadius: 16 }}>
                    <Space
                      align="start"
                      style={{ width: '100%', justifyContent: 'space-between' }}
                    >
                      <Space size={8}>
                        <QrcodeOutlined />
                        <Text strong>
                          {intl.formatMessage({
                            id: 'live.room.sidebar.liveStreamQr',
                          })}
                        </Text>
                      </Space>
                      <Space size={0}>
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          style={{ color: 'rgba(0, 0, 0, 0.65)' }}
                          onClick={() =>
                            copyValue(
                              playbackUrl,
                              intl.formatMessage({
                                id: 'live.room.liveStreamUrl',
                              }),
                            )
                          }
                        >
                          {intl.formatMessage({
                            id: 'live.room.sidebar.copyUrl',
                          })}
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          style={{ color: 'rgba(0, 0, 0, 0.65)' }}
                          icon={
                            <DownOutlined
                              style={{
                                transform: expandedSidebarPanels.includes(
                                  'stream',
                                )
                                  ? 'rotate(180deg)'
                                  : undefined,
                                transition: 'transform 0.2s ease',
                              }}
                            />
                          }
                          onClick={() =>
                            setExpandedSidebarPanels((prev) =>
                              prev.includes('stream')
                                ? prev.filter((key) => key !== 'stream')
                                : [...prev, 'stream'],
                            )
                          }
                        >
                          {intl.formatMessage({
                            id: 'live.room.sidebar.qr.short',
                          })}
                        </Button>
                      </Space>
                    </Space>
                    {expandedSidebarPanels.includes('stream') ? (
                      <QrCodePanel
                        payload={playbackUrl}
                        emptyText={intl.formatMessage({
                          id: 'live.room.playbackUnavailable',
                        })}
                      />
                    ) : null}
                  </Card>
                </Space>
              </Col>
            </Row>
            <ManageLiveProductsDrawer
              open={manageDrawerOpen}
              loading={manageLoading}
              errorMessage={manageError}
              bindings={manageBindings}
              sellerProducts={sellerProducts}
              onClose={() => setManageDrawerOpen(false)}
              onRefresh={loadManageProducts}
              onCreate={async (payload) => {
                if (!id) return;
                setManageLoading(true);
                try {
                  await createLiveProductBinding(id, payload);
                  message.success(
                    intl.formatMessage({ id: 'live.products.manage.created' }),
                  );
                  await Promise.all([
                    loadManageProducts(),
                    loadPublicProducts(),
                  ]);
                } catch (error: any) {
                  message.warning(
                    error?.message ||
                      intl.formatMessage({
                        id: 'live.products.manage.error.create',
                      }),
                  );
                } finally {
                  setManageLoading(false);
                }
              }}
              onUpdate={async (bindingId, payload) => {
                if (!id) return;
                setManageLoading(true);
                try {
                  await updateLiveProductBinding(id, bindingId, payload);
                  message.success(
                    intl.formatMessage({ id: 'live.products.manage.updated' }),
                  );
                  await Promise.all([
                    loadManageProducts(),
                    loadPublicProducts(),
                  ]);
                } catch (error: any) {
                  message.warning(
                    error?.message ||
                      intl.formatMessage({
                        id: 'live.products.manage.error.update',
                      }),
                  );
                } finally {
                  setManageLoading(false);
                }
              }}
              onDelete={async (bindingId) => {
                if (!id) return;
                setManageLoading(true);
                try {
                  await deleteLiveProductBinding(id, bindingId);
                  message.success(
                    intl.formatMessage({ id: 'live.products.manage.deleted' }),
                  );
                  await Promise.all([
                    loadManageProducts(),
                    loadPublicProducts(),
                  ]);
                } catch (error: any) {
                  message.warning(
                    error?.message ||
                      intl.formatMessage({
                        id: 'live.products.manage.error.delete',
                      }),
                  );
                } finally {
                  setManageLoading(false);
                }
              }}
            />
            <ManageLivePaymentsDrawer
              open={managePaymentsDrawerOpen}
              loading={managePaymentsLoading}
              errorMessage={managePaymentsError}
              items={managePayments}
              onClose={() => setManagePaymentsDrawerOpen(false)}
              onRefresh={loadManagePayments}
              onCreate={handleCreatePaymentMethod}
              onUpdate={handleUpdatePaymentMethod}
              onDelete={handleDeletePaymentMethod}
            />
          </Space>
        ) : (
          <Empty
            description={intl.formatMessage({ id: 'live.room.unavailable' })}
          />
        )}
      </div>
    </PageContainer>
  );
}
