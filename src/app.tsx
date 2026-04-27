import { getAccountProfile } from '@/services/accountProfile';
import { CurrentUser, resolveCurrentUser } from '@/services/auth';
import {
  getProductOrderDetail as fetchProductOrderDetail,
  payProductOrderWithWallet as submitProductOrderWalletPayment,
} from '@/services/productOrders';
import {
  listPublicCategories,
  type PublicCategory,
} from '@/services/publicCategories';
import { getMyStore } from '@/services/store';
import { clearStoredTokens } from '@/utils/auth';
import {
  getCanonicalCategorySlug,
  getLocalizedCategoryLabel,
} from '@/utils/categoryI18n';
import { parsePaymentQrText as parseProductPaymentQrText } from '@/utils/paymentQr';
import {
  AlertOutlined,
  BgColorsOutlined,
  CarOutlined,
  CoffeeOutlined,
  CompassOutlined,
  DollarOutlined,
  GlobalOutlined,
  HomeOutlined,
  LockOutlined,
  LogoutOutlined,
  MoonOutlined,
  NotificationOutlined,
  PlayCircleOutlined,
  PlaySquareOutlined,
  QrcodeOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingOutlined,
  SunOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { getIntl, history, setLocale } from '@umijs/max';
import {
  Alert,
  Avatar,
  Button,
  ConfigProvider,
  Dropdown,
  Input,
  message,
  Modal,
  Space,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import { type ReactNode, useEffect, useRef, useState } from 'react';

const { Text } = Typography;
const LANGUAGE_LABELS: Record<string, string> = {
  'en-US': 'English',
  'zh-CN': '中文',
  'th-TH': 'ไทย',
  'my-MM': 'မြန်မာ',
};
const SUPPORTED_LOCALES = new Set(Object.keys(LANGUAGE_LABELS));

const resolveSupportedLocale = (value?: string | null) => {
  const normalized = String(value || '').toLowerCase();

  if (normalized.startsWith('zh')) return 'zh-CN';
  if (normalized.startsWith('th')) return 'th-TH';
  if (normalized.startsWith('my')) return 'my-MM';
  if (normalized.startsWith('en')) return 'en-US';
  return 'en-US';
};

const resolveSystemDarkTheme = () => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const getCategoryIcon = () => {
  return <ReadOutlined />;
};

let hasInitializedLocale = false;

const initializeLocaleOnce = () => {
  if (hasInitializedLocale || typeof window === 'undefined') return;
  hasInitializedLocale = true;

  const storedLocale = localStorage.getItem('umi_locale');
  if (storedLocale && SUPPORTED_LOCALES.has(storedLocale)) return;

  const browserLocale =
    (navigator.languages && navigator.languages[0]) || navigator.language;
  const nextLocale = resolveSupportedLocale(browserLocale);
  setLocale(nextLocale, true);
};

const LayoutChildrenWrapper = ({
  children,
  isDark,
}: {
  children: ReactNode;
  isDark?: boolean;
}) => {
  useEffect(() => {
    const favicon = document.querySelector(
      "link[rel*='icon']",
    ) as HTMLLinkElement;
    const iconPath = '/favicon.ico';
    if (favicon) {
      favicon.href = iconPath;
    }
    document.body.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#B8872E',
          borderRadius: 12,
          ...(isDark
            ? {
                colorBgBase: '#1F1A16',
                colorBgContainer: '#2A241F',
                colorText: '#F5F1EA',
                colorTextSecondary: '#CBBBAA',
                colorBorder: 'rgba(255,255,255,0.08)',
                colorFillSecondary: 'rgba(255,255,255,0.08)',
                colorFillTertiary: 'rgba(255,255,255,0.06)',
              }
            : {}),
        },
        components: {
          Input: {
            borderRadiusLG: 12,
            colorBgContainer: isDark ? 'rgba(255,255,255,0.04)' : undefined,
            colorText: isDark ? '#F5F1EA' : undefined,
            colorBorder: isDark ? 'rgba(255,255,255,0.12)' : undefined,
          },
          Button: {
            borderRadius: 9,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

const getCommerceIcon = (slug?: string) => {
  const value = String(slug || '').toLowerCase();
  if (value === 'food') return <CoffeeOutlined />;
  if (value === 'shops') return <ShopOutlined />;
  if (value === 'real-estate') return <HomeOutlined />;
  if (value === 'vehicles') return <CarOutlined />;
  if (value === 'creators') return <UserOutlined />;
  return <ShopOutlined />;
};

const getLiveChildIcon = (path: string, slug?: string) => {
  if (path === '/live') return <PlayCircleOutlined />;
  if (path === '/live/create') return <VideoCameraOutlined />;
  if (path === '/live/mine') return <PlaySquareOutlined />;

  const value = String(slug || '').toLowerCase();
  if (value === 'selling') return <ShopOutlined />;
  if (value === 'news') return <NotificationOutlined />;
  if (value === 'reporting') return <AlertOutlined />;
  if (value === 'food') return <CoffeeOutlined />;
  return <ThunderboltOutlined />;
};

const CONTENT_CATEGORY_FALLBACKS = [
  { key: 'menu.categories.technology', slug: 'technology' },
  { key: 'menu.categories.education', slug: 'education' },
  { key: 'menu.categories.gaming', slug: 'gaming' },
  { key: 'menu.categories.entertainment', slug: 'entertainment' },
  { key: 'menu.categories.travel', slug: 'travel' },
  { key: 'menu.categories.finance', slug: 'finance' },
  { key: 'menu.categories.movies', slug: 'movies' },
  { key: 'menu.categories.beauty', slug: 'beauty' },
];

const COMMERCE_CATEGORY_ITEMS = [
  { key: 'menu.categories.food', slug: 'food' },
  { key: 'menu.categories.shops', slug: 'shops' },
  { key: 'menu.categories.realEstate', slug: 'real-estate' },
  { key: 'menu.categories.vehicles', slug: 'vehicles' },
  { key: 'menu.categories.creators', slug: 'creators' },
];

const LIVE_SECTION_ITEMS = [
  { key: 'menu.live.explore', path: '/live', slug: 'live' },
  { key: 'menu.live.create', path: '/live/create', slug: 'live-create' },
  { key: 'menu.live.sessions', path: '/live/mine', slug: 'live-sessions' },
];

const NEWS_SECTION_ITEMS = [
  {
    key: 'menu.news.live',
    path: '/news/live',
  },
  {
    key: 'menu.news.channel',
    path: '/news/channel',
  },
  {
    key: 'menu.news.articles',
    path: 'https://meownews.online/',
    target: '_blank',
  },
];

const normalizeCategoryKey = (value?: string) => {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  if (normalized === 'tech') return 'technology';
  if (normalized === 'technology') return 'technology';
  if (normalized === 'edu') return 'education';
  if (normalized === 'learning') return 'education';
  return normalized;
};

const resolveMenuSelectedPath = (pathname: string, search: string) => {
  if (pathname === '/live/create') return '/live/create';
  if (pathname === '/live/mine') return '/live/mine';
  if (
    pathname === '/live' &&
    new URLSearchParams(search || '').get('scope') === 'my'
  ) {
    return '/live/mine';
  }
  if (pathname === '/live') return '/live';
  if (pathname.startsWith('/live/')) return '/live';
  if (pathname.startsWith('/seller/store')) return '/seller/store';
  if (pathname.startsWith('/seller/products')) return '/seller/products';
  return pathname;
};

const isAdminUser = (user?: CurrentUser | null) =>
  Boolean(
    user &&
      (user.is_admin ||
        user.is_staff ||
        user.is_superuser ||
        user.role === 'admin'),
  );

const isCreatorUser = (user?: CurrentUser | null) =>
  Boolean(
    user &&
      (user.is_creator ||
        user.role === 'creator' ||
        user.user_type === 'creator'),
  );

type InitialState = {
  name: string;
  darkTheme: boolean;
  currentUser?: CurrentUser | null;
  sellerHasStore?: boolean;
  authLoading?: boolean;
  fetchCurrentUser?: () => Promise<CurrentUser | null>;
  publicCategories: PublicCategory[];
};

let cachedCategories: PublicCategory[] | null = null;

export async function getInitialState(): Promise<InitialState> {
  let publicCategories: PublicCategory[] = [];

  if (typeof window !== 'undefined') {
    if (cachedCategories) {
      publicCategories = cachedCategories;
    } else {
      publicCategories = await listPublicCategories().catch(() => []);
      cachedCategories = publicCategories;
    }
  }

  const currentUser = await resolveCurrentUser();
  let sellerHasStore = false;

  if (currentUser?.email) {
    try {
      await getMyStore();
      sellerHasStore = true;
    } catch (error: any) {
      sellerHasStore = false;
    }
  }

  return {
    name: 'Meow Media Stream User',
    darkTheme: false,
    currentUser,
    sellerHasStore,
    authLoading: false,
    fetchCurrentUser: resolveCurrentUser,
    publicCategories,
  };
}

const HeaderSearchWithQr = ({
  isDark,
  currentUser,
}: {
  isDark?: boolean;
  currentUser?: CurrentUser | null;
}) => {
  const intl = getIntl();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [qrText, setQrText] = useState('');
  const [parseError, setParseError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<any>(null);
  const [confirmError, setConfirmError] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [payingWithWallet, setPayingWithWallet] = useState(false);
  const [submittedTxid, setSubmittedTxid] = useState('');
  const [profileLinkedWalletId, setProfileLinkedWalletId] = useState('');
  const [hasFetchedProfileWallet, setHasFetchedProfileWallet] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<any>(null);
  const zxingReaderRef = useRef<any>(null);
  const detectedRef = useRef(false);

  const stopCamera = () => {
    zxingControlsRef.current?.stop?.();
    zxingControlsRef.current = null;
    zxingReaderRef.current?.reset?.();
    zxingReaderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    detectedRef.current = false;
  };

  const mapGetUserMediaError = (error: any) => {
    const name = String(error?.name || '');
    const messageText = String(error?.message || '');
    const insecureContext = !window.isSecureContext;

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return intl.formatMessage({ id: 'qrScan.cameraDenied' });
    }
    if (
      name === 'NotFoundError' ||
      name === 'DevicesNotFoundError' ||
      name === 'OverconstrainedError'
    ) {
      return intl.formatMessage({ id: 'qrScan.cameraUnavailable' });
    }
    if (name === 'NotSupportedError') {
      return intl.formatMessage({ id: 'qrScan.cameraUnsupported' });
    }
    if (name === 'SecurityError' || insecureContext) {
      return intl.formatMessage({ id: 'qrScan.cameraInsecureContext' });
    }
    return messageText || intl.formatMessage({ id: 'qrScan.failed' });
  };

  const handleParsedQr = async (text: string) => {
    console.log('[QR_SCAN] raw text:', text);
    const parsed = parseProductPaymentQrText(text);
    if (parsed.orderNo) {
      try {
        setLoadingOrder(true);
        setParseError('');
        const orderDetail = await fetchProductOrderDetail(parsed.orderNo);
        stopCamera();
        setOpen(false);
        setQrText('');
        setParseError('');
        setCameraError('');
        setConfirmError('');
        setWalletPassword('');
        setSubmittedTxid('');
        setConfirmOrder(orderDetail);
        setConfirmOpen(true);
      } catch (error: any) {
        setParseError(
          error?.message ||
            intl.formatMessage({ id: 'qrScan.loadOrderDetailFailed' }),
        );
      } finally {
        setLoadingOrder(false);
      }
      return;
    }

    if (parsed.address || parsed.amount) {
      setParseError(intl.formatMessage({ id: 'qrScan.noOrderNo' }));
      return;
    }

    setParseError(parsed.error || intl.formatMessage({ id: 'qrScan.failed' }));
  };

  const startCameraScan = async () => {
    if (!open) return;

    console.log('[QR_SCAN] secure context', window.isSecureContext);
    console.log(
      '[QR_SCAN] mediaDevices exists',
      Boolean(navigator.mediaDevices?.getUserMedia),
    );

    if (!window.isSecureContext) {
      setCameraError(
        intl.formatMessage({ id: 'qrScan.cameraInsecureContext' }),
      );
      setMode('manual');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(intl.formatMessage({ id: 'qrScan.cameraUnsupported' }));
      setMode('manual');
      return;
    }

    try {
      stopCamera();
      detectedRef.current = false;
      setCameraError('');
      setParseError('');
      setMode('camera');
      console.log('[QR_SCAN] getUserMedia start');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });
      console.log('[QR_SCAN] getUserMedia success');
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          const element = videoRef.current;
          if (!element) return resolve();
          if (element.readyState >= 1) return resolve();
          element.onloadedmetadata = () => resolve();
          setTimeout(() => resolve(), 500);
        });
        await videoRef.current.play();
      }

      try {
        const ZXing = await import(
          /* webpackChunkName: "zxing" */ '@zxing/browser'
        );
        console.log('[QR_SCAN] zxing loaded');
        const { BrowserMultiFormatReader } = ZXing;
        const codeReader = new BrowserMultiFormatReader();
        zxingReaderRef.current = codeReader;
        zxingControlsRef.current = await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current as HTMLVideoElement,
          (result) => {
            const value = String(result?.getText?.() || '');
            if (!value || detectedRef.current) return;
            detectedRef.current = true;
            console.log('[QR_SCAN] decoded text', value);
            stopCamera();
            void handleParsedQr(value);
          },
        );
      } catch (scanError: any) {
        console.log('[QR_SCAN] zxing load failed', scanError?.message);
        setCameraError(
          scanError?.message ||
            intl.formatMessage({ id: 'qrScan.scannerInitFailed' }),
        );
        setMode('manual');
        stopCamera();
      }
    } catch (error: any) {
      console.log(
        '[QR_SCAN] getUserMedia error name/message',
        error?.name,
        error?.message,
      );
      setCameraError(mapGetUserMediaError(error));
      setMode('manual');
      stopCamera();
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const onOpenModal = () => {
    setParseError('');
    setCameraError('');
    setQrText('');
    setOpen(true);
    setMode('manual');
  };

  const onSubmitManualQr = async () => {
    const value = String(qrText || '').trim();
    if (!value) {
      setParseError(intl.formatMessage({ id: 'qrScan.emptyManual' }));
      return;
    }
    await handleParsedQr(value);
  };

  const account = currentUser;
  const effectiveLinkedWalletId = String(
    account?.linked_wallet_id || profileLinkedWalletId || '',
  ).trim();
  const hasLinkedWallet = Boolean(effectiveLinkedWalletId);
  const canUseWalletPayment = Boolean(
    hasLinkedWallet &&
      String(confirmOrder?.status || '').toLowerCase() === 'pending_payment',
  );
  const effectiveTxid = String(
    submittedTxid || confirmOrder?.txid || '',
  ).trim();
  const canSubmitWalletPayment = Boolean(canUseWalletPayment && !effectiveTxid);

  useEffect(() => {
    if (!confirmOpen || hasFetchedProfileWallet) return;
    if (account?.linked_wallet_id) {
      setHasFetchedProfileWallet(true);
      return;
    }
    if (!account?.email) return;

    let cancelled = false;
    (async () => {
      try {
        const profile = await getAccountProfile();
        if (cancelled) return;
        setProfileLinkedWalletId(
          String(profile?.linked_wallet_id || '').trim(),
        );
      } catch (error) {
        // keep silent; fallback UI will show unavailable state.
      } finally {
        if (!cancelled) {
          setHasFetchedProfileWallet(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    confirmOpen,
    hasFetchedProfileWallet,
    account?.linked_wallet_id,
    account?.email,
  ]);

  useEffect(() => {
    if (!confirmOpen) return;
    console.log('[PAYMENT]', {
      linked_wallet_id: account?.linked_wallet_id,
      primary_user_address: account?.primary_user_address,
      profile_linked_wallet_id: profileLinkedWalletId,
      canUseWalletPayment,
    });
  }, [
    confirmOpen,
    account?.linked_wallet_id,
    account?.primary_user_address,
    profileLinkedWalletId,
    canUseWalletPayment,
  ]);

  const onCopyText = async (value?: string | number | null) => {
    const content = String(value || '').trim();
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      message.success(intl.formatMessage({ id: 'qrScan.copied' }));
    } catch (error) {
      message.error(intl.formatMessage({ id: 'qrScan.copyFailed' }));
    }
  };

  const onPayWithLinkedWallet = async () => {
    if (payingWithWallet) return;
    if (!confirmOrder?.order_no) return;
    if (effectiveTxid) return;
    if (!walletPassword) {
      setConfirmError(
        intl.formatMessage({ id: 'qrScan.walletPasswordRequired' }),
      );
      return;
    }

    setPayingWithWallet(true);
    setConfirmError('');
    try {
      const payload: { wallet_id?: string; password: string } = {
        password: walletPassword,
      };
      if (effectiveLinkedWalletId) {
        payload.wallet_id = effectiveLinkedWalletId;
      }
      const response = await submitProductOrderWalletPayment(
        String(confirmOrder.order_no),
        payload,
      );
      const txid = String(response?.txid || response?.transaction_id || '');
      setSubmittedTxid(txid);
      message.success(intl.formatMessage({ id: 'qrScan.walletSubmitted' }));
      const latestOrder = await fetchProductOrderDetail(
        String(confirmOrder.order_no),
      );
      setConfirmOrder(latestOrder);
      setWalletPassword('');
    } catch (error: any) {
      const resolveBackendError = (payload: any): string => {
        if (!payload) return '';
        if (typeof payload === 'string') return payload;
        if (typeof payload.detail === 'string') return payload.detail;
        if (typeof payload.message === 'string') return payload.message;
        if (
          Array.isArray(payload.non_field_errors) &&
          payload.non_field_errors[0]
        ) {
          return String(payload.non_field_errors[0]);
        }
        if (Array.isArray(payload.password) && payload.password[0]) {
          return String(payload.password[0]);
        }
        if (Array.isArray(payload.wallet_id) && payload.wallet_id[0]) {
          return String(payload.wallet_id[0]);
        }
        if (payload.error) {
          return resolveBackendError(payload.error);
        }
        return '';
      };
      const sanitizePaymentError = (value: string) => {
        const text = String(value || '').trim();
        if (!text) return '';
        const hasInternalFieldLeak =
          /wallet_id|funding_account_ids|change_account_id/i.test(text);
        if (hasInternalFieldLeak) {
          return '';
        }
        return text;
      };
      const backendError =
        resolveBackendError(error?.data) ||
        resolveBackendError(error?.response?.data);
      setConfirmError(
        sanitizePaymentError(backendError) ||
          sanitizePaymentError(error?.message) ||
          intl.formatMessage({ id: 'qrScan.walletPayFailed' }),
      );
    } finally {
      setPayingWithWallet(false);
    }
  };

  const onRefreshPaymentStatus = async () => {
    if (!confirmOrder?.order_no) return;
    setLoadingOrder(true);
    try {
      const latestOrder = await fetchProductOrderDetail(
        String(confirmOrder.order_no),
      );
      setConfirmOrder(latestOrder);
    } catch (error: any) {
      setConfirmError(error?.message || '');
    } finally {
      setLoadingOrder(false);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          padding: '0 20px',
          gap: 8,
        }}
      >
        <Input.Search
          placeholder={intl.formatMessage({ id: 'search.global.placeholder' })}
          allowClear
          style={{ maxWidth: 560, width: '100%', borderRadius: 12 }}
          size="middle"
          onSearch={(value) => console.log('Searching for:', value)}
        />
        <Button
          type="text"
          icon={<QrcodeOutlined style={{ fontSize: 16 }} />}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            color: isDark ? '#EFBC5C' : '#4b5563',
          }}
          onClick={onOpenModal}
        />
      </div>
      <Modal
        title={intl.formatMessage({ id: 'qrScan.modalTitle' })}
        open={open}
        onCancel={() => {
          stopCamera();
          setOpen(false);
        }}
        onOk={mode === 'manual' ? onSubmitManualQr : undefined}
        okText={
          mode === 'manual'
            ? intl.formatMessage({ id: 'qrScan.scan' })
            : undefined
        }
        cancelText={intl.formatMessage({ id: 'common.cancel' })}
        confirmLoading={loadingOrder}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Space>
            <Button
              type={mode === 'camera' ? 'primary' : 'default'}
              onClick={() => {
                setMode('camera');
                void startCameraScan();
              }}
            >
              {intl.formatMessage({ id: 'qrScan.mode.camera' })}
            </Button>
            <Button
              type={mode === 'manual' ? 'primary' : 'default'}
              onClick={() => setMode('manual')}
            >
              {intl.formatMessage({ id: 'qrScan.mode.manual' })}
            </Button>
          </Space>

          {mode === 'camera' ? (
            <>
              <video
                ref={videoRef}
                style={{ width: '100%', borderRadius: 12, background: '#000' }}
                muted
                playsInline
                autoPlay
              />
              <Text type="secondary">
                {intl.formatMessage({ id: 'qrScan.cameraHint' })}
              </Text>
              {cameraError ? (
                <Alert type="warning" showIcon message={cameraError} />
              ) : null}
            </>
          ) : (
            <>
              <Text type="secondary">
                {intl.formatMessage({ id: 'qrScan.pasteHint' })}
              </Text>
              <Input.TextArea
                rows={5}
                value={qrText}
                onChange={(event) => setQrText(event.target.value)}
                placeholder={intl.formatMessage({
                  id: 'qrScan.pastePlaceholder',
                })}
              />
            </>
          )}

          {parseError ? (
            <Alert type="error" showIcon message={parseError} />
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={intl.formatMessage({ id: 'qrScan.confirmModal.title' })}
        open={confirmOpen}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmError('');
          setWalletPassword('');
        }}
        footer={null}
      >
        {confirmOrder ? (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Text>
              {intl.formatMessage({ id: 'account.productOrders.product' })}:{' '}
              <Text strong>{confirmOrder.product_title_snapshot || '-'}</Text>
            </Text>
            <Text>
              {intl.formatMessage({ id: 'account.productOrders.orderNo' })}:{' '}
              <Text strong>{confirmOrder.order_no || '-'}</Text>
            </Text>
            <Text>
              {intl.formatMessage({
                id: 'account.productOrders.expectedAmount',
              })}
              :{' '}
              <Text strong>{String(confirmOrder.expected_amount || '-')}</Text>
            </Text>
            <Text>
              {intl.formatMessage({ id: 'account.productOrders.currency' })}:{' '}
              <Text strong>{confirmOrder.currency || 'THB-LTT'}</Text>
            </Text>
            <Text>
              {intl.formatMessage({
                id: 'account.productOrders.paymentAddress',
              })}
              : <Text strong>{confirmOrder.pay_to_address || '-'}</Text>
            </Text>
            <Text>
              {intl.formatMessage({ id: 'account.productOrders.expiresAt' })}:{' '}
              <Text strong>{confirmOrder.expires_at || '-'}</Text>
            </Text>
            <Text>
              {intl.formatMessage({
                id: 'account.productOrders.paymentStatus',
              })}
              : <Text strong>{String(confirmOrder.payment_status || '-')}</Text>
            </Text>
            <Alert
              type="warning"
              showIcon
              message={intl.formatMessage({
                id: 'qrScan.confirmModal.notProof',
              })}
            />

            {canUseWalletPayment ? (
              <>
                <Input.Password
                  value={walletPassword}
                  onChange={(event) => setWalletPassword(event.target.value)}
                  placeholder={intl.formatMessage({
                    id: 'qrScan.confirmModal.walletPasswordPlaceholder',
                  })}
                  prefix={<LockOutlined />}
                />
                <Button
                  type="primary"
                  loading={payingWithWallet}
                  disabled={
                    payingWithWallet ||
                    !walletPassword ||
                    !canSubmitWalletPayment
                  }
                  onClick={onPayWithLinkedWallet}
                >
                  {intl.formatMessage({
                    id: 'qrScan.confirmModal.payWithWallet',
                  })}
                </Button>
              </>
            ) : (
              <Alert
                type="info"
                showIcon
                message={intl.formatMessage({
                  id: 'qrScan.confirmModal.walletUnavailable',
                })}
              />
            )}

            {effectiveTxid ? (
              <Alert
                type="success"
                showIcon
                message={intl.formatMessage({
                  id: 'qrScan.confirmModal.txSubmitted',
                })}
                description={
                  <Space>
                    <Text code>{effectiveTxid}</Text>
                    <Button
                      size="small"
                      onClick={() => onCopyText(effectiveTxid)}
                    >
                      {intl.formatMessage({ id: 'common.copy' })}
                    </Button>
                  </Space>
                }
              />
            ) : null}
            {effectiveTxid ? (
              <Alert
                type="info"
                showIcon
                message={intl.formatMessage({
                  id: 'qrScan.confirmModal.waitingVerification',
                })}
              />
            ) : null}
            {confirmError ? (
              <Alert type="error" showIcon message={confirmError} />
            ) : null}

            <Space wrap>
              <Button loading={loadingOrder} onClick={onRefreshPaymentStatus}>
                {intl.formatMessage({
                  id: 'account.productOrders.refreshPaymentStatus',
                })}
              </Button>
              <Button
                onClick={() =>
                  history.push(
                    `/account/product-orders/${confirmOrder.order_no}`,
                  )
                }
              >
                {intl.formatMessage({ id: 'qrScan.confirmModal.viewDetail' })}
              </Button>
              <Button onClick={() => onCopyText(confirmOrder.pay_to_address)}>
                {intl.formatMessage({ id: 'qrScan.confirmModal.copyAddress' })}
              </Button>
              <Button onClick={() => onCopyText(confirmOrder.expected_amount)}>
                {intl.formatMessage({ id: 'qrScan.confirmModal.copyAmount' })}
              </Button>
            </Space>
          </Space>
        ) : null}
      </Modal>
    </>
  );
};

export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  const intl = getIntl();
  const isDark = initialState?.darkTheme;
  const currentUser = initialState?.currentUser;
  const isLoggedIn = Boolean(currentUser?.email);
  const isAdmin = isAdminUser(currentUser);
  const isCreator = isCreatorUser(currentUser);
  const sellerHasStore = Boolean(initialState?.sellerHasStore);
  const canUseGoLive = !isLoggedIn || isCreator;
  const displayName =
    currentUser?.display_name ||
    currentUser?.name ||
    currentUser?.username ||
    currentUser?.email ||
    '';
  const secondaryIdentity =
    currentUser?.username && currentUser.username !== displayName
      ? currentUser.username
      : currentUser?.email && currentUser.email !== displayName
      ? currentUser.email
      : '';
  const profileHints = [
    isCreator
      ? { key: 'profile-hint-creator', label: 'nav.profile.role.creator' }
      : null,
    sellerHasStore
      ? { key: 'profile-hint-seller', label: 'nav.profile.role.seller' }
      : null,
    isAdmin
      ? { key: 'profile-hint-admin', label: 'nav.profile.role.admin' }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;
  const languageMenuItems = [
    {
      key: 'lang-en-us',
      label: LANGUAGE_LABELS['en-US'],
      onClick: () => setLocale('en-US', true),
    },
    {
      key: 'lang-zh-cn',
      label: LANGUAGE_LABELS['zh-CN'],
      onClick: () => setLocale('zh-CN', true),
    },
    {
      key: 'lang-th-th',
      label: LANGUAGE_LABELS['th-TH'],
      onClick: () => setLocale('th-TH', true),
    },
    {
      key: 'lang-my-mm',
      label: LANGUAGE_LABELS['my-MM'],
      onClick: () => setLocale('my-MM', true),
    },
  ] as const;
  initializeLocaleOnce();

  const handleGoLiveClick = () => {
    if (isLoggedIn && !isCreator) {
      message.info(intl.formatMessage({ id: 'live.creatorRequired' }));
      return;
    }

    history.push(
      isLoggedIn
        ? '/live/create'
        : `/login?redirect=${encodeURIComponent('/live/create')}`,
    );
  };

  const handleLogout = async () => {
    clearStoredTokens();
    await setInitialState((prev) => ({
      ...prev,
      currentUser: null,
      authLoading: false,
    }));
    history.push('/home');
  };

  const applyThemeMode = async (mode: 'light' | 'dark' | 'system') => {
    const nextDarkTheme =
      mode === 'system' ? resolveSystemDarkTheme() : mode === 'dark';

    await setInitialState((prev) => ({
      ...prev,
      darkTheme: nextDarkTheme,
    }));
  };

  return {
    title: intl.formatMessage({ id: 'app.name' }),
    layout: 'mix',
    splitMenus: false,
    defaultCollapsed: true,
    navTheme: isDark ? 'realDark' : 'light',
    colorPrimary: '#B8872E',
    siderWidth: 224,
    collapsedWidth: 76,
    menuHeaderRender: false,
    menuDataRender: (menuData) => {
      const stableItemMap = new Map<string, any>([
        ['/home', <VideoCameraOutlined key="icon-home" />],
        ['/browse', <CompassOutlined key="icon-browse" />],
        ['/news', <NotificationOutlined key="icon-news" />],
        ['/live', <ThunderboltOutlined key="icon-live" />],
        ['/admin/videos', <SettingOutlined key="icon-admin-videos" />],
      ]);
      const stableItems = menuData.filter(
        (item) => item.path && stableItemMap.has(item.path),
      );
      const stableItemByPath = new Map(
        stableItems.map((item) => [item.path || '', item]),
      );

      const primaryItems = ['/home', '/browse'].map((path) => ({
        ...(stableItemByPath.get(path) || {}),
        path,
        name:
          path === '/home'
            ? intl.formatMessage({ id: 'menu.home' })
            : path === '/browse'
            ? intl.formatMessage({ id: 'menu.browse' })
            : undefined,
        icon: stableItemMap.get(path),
        className: 'sidebar-menu-item sidebar-menu-item-primary',
      }));

      const adminItems = isAdmin
        ? [
            {
              ...(stableItemByPath.get('/admin/videos') || {}),
              path: '/admin/videos',
              name: intl.formatMessage({ id: 'nav.allVideos' }),
              icon: stableItemMap.get('/admin/videos'),
              className: 'sidebar-menu-item sidebar-menu-item-admin',
            },
          ]
        : [];

      const apiCategories = new Map(
        (initialState?.publicCategories || []).map((category) => [
          normalizeCategoryKey(category.slug || category.name),
          category,
        ]),
      );

      const categoryItems = CONTENT_CATEGORY_FALLBACKS.map(
        (fallbackCategory) => {
          const matchedCategory = apiCategories.get(
            normalizeCategoryKey(fallbackCategory.slug),
          );
          const slug = matchedCategory?.slug || fallbackCategory.slug;
          const canonicalSlug = getCanonicalCategorySlug(slug);
          const fallbackName = intl.formatMessage({ id: fallbackCategory.key });
          const name = getLocalizedCategoryLabel(intl, {
            slug: canonicalSlug,
            name: matchedCategory?.name || fallbackName,
          });

          return {
            name,
            path: `/categories/${slug}`,
            icon: getCategoryIcon(),
            className: 'sidebar-menu-item sidebar-menu-item-category',
          };
        },
      );

      const commerceItem = {
        name: intl.formatMessage({ id: 'menu.commerce' }),
        path: '/categories/food',
        icon: <ShopOutlined />,
        className: 'sidebar-menu-item sidebar-menu-item-category',
        children: COMMERCE_CATEGORY_ITEMS.map((item) => ({
          name: intl.formatMessage({ id: item.key }),
          path: `/categories/${item.slug}`,
          icon: getCommerceIcon(item.slug),
          className: 'sidebar-menu-item sidebar-menu-item-category',
        })),
      };

      const newsItem = {
        path: '/news',
        name: intl.formatMessage({ id: 'menu.news' }),
        icon: stableItemMap.get('/news'),
        className: 'sidebar-menu-item sidebar-menu-item-primary',
        children: NEWS_SECTION_ITEMS.map((item) => ({
          name:
            item.key === 'menu.news.articles' ? (
              <span style={{ color: '#1677ff' }}>
                {intl.formatMessage({ id: item.key })}
              </span>
            ) : (
              intl.formatMessage({ id: item.key })
            ),
          path: item.path,
          target: item.target,
          className: 'sidebar-menu-item sidebar-menu-item-live-child',
          icon:
            item.path === '/news/channel' || item.path === '/news/live' ? (
              <PlayCircleOutlined />
            ) : (
              <GlobalOutlined />
            ),
        })),
      };

      const liveItem = {
        ...(stableItemByPath.get('/live') || {}),
        path: '/live',
        name: intl.formatMessage({ id: 'menu.live' }),
        icon: stableItemMap.get('/live'),
        className: 'sidebar-menu-item sidebar-menu-item-live',
        children: LIVE_SECTION_ITEMS.filter((item) => {
          if (!isLoggedIn || isCreator) return true;
          return item.path === '/live';
        }).map((item) => ({
          name: intl.formatMessage({ id: item.key }),
          path: item.path,
          icon: getLiveChildIcon(item.path, item.slug),
          className: 'sidebar-menu-item sidebar-menu-item-live-child',
        })),
      };

      const sellerItem = isLoggedIn
        ? {
            name: intl.formatMessage({ id: 'menu.seller' }),
            path: '/seller/products',
            icon: <ShopOutlined />,
            className: 'sidebar-menu-item sidebar-menu-item-category',
            children: [
              {
                name: intl.formatMessage({ id: 'menu.seller.store' }),
                path: '/seller/store',
                icon: <ShopOutlined />,
                className: 'sidebar-menu-item sidebar-menu-item-category',
              },
              {
                name: intl.formatMessage({ id: 'menu.seller.products' }),
                path: '/seller/products',
                icon: <PlaySquareOutlined />,
                className: 'sidebar-menu-item sidebar-menu-item-category',
              },
              {
                name: intl.formatMessage({ id: 'menu.seller.orders' }),
                path: '/seller/orders',
                icon: <ShoppingOutlined />,
                className: 'sidebar-menu-item sidebar-menu-item-category',
              },
              {
                name: intl.formatMessage({ id: 'menu.seller.payoutAddresses' }),
                path: '/seller/payout-addresses',
                icon: <DollarOutlined />,
                className: 'sidebar-menu-item sidebar-menu-item-category',
              },
              {
                name: intl.formatMessage({ id: 'menu.seller.refundRequests' }),
                path: '/seller/refund-requests',
                icon: <NotificationOutlined />,
                className: 'sidebar-menu-item sidebar-menu-item-category',
              },
            ],
          }
        : null;

      return [
        ...primaryItems,
        newsItem,
        liveItem,
        ...adminItems,
        ...(sellerItem ? [sellerItem] : []),
        { type: 'divider', key: 'sidebar-divider-primary' } as any,
        ...categoryItems,
        { type: 'divider', key: 'sidebar-divider-commerce' } as any,
        commerceItem,
      ];
    },
    headerTitleRender: () => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
        onClick={() => history.push('/')}
      >
        <img
          src="/assets/meow-main-logo.svg"
          alt="logo"
          style={{ height: 28, width: 'auto', objectFit: 'contain' }}
        />
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: isDark ? '#f5e8cf' : '#2C2C2C',
            letterSpacing: '-0.01em',
          }}
        >
          {intl.formatMessage({ id: 'app.name' })}
        </span>
      </div>
    ),
    headerContentRender: () => (
      <HeaderSearchWithQr isDark={isDark} currentUser={currentUser} />
    ),
    rightContentRender: () => {
      const utilityButtonStyle = {
        width: 30,
        height: 30,
        borderRadius: 10,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isDark ? '#E4D5C5' : '#4b5563',
      } as const;

      return (
        <Space
          size={6}
          align="center"
          style={{ marginRight: 6, display: 'flex', alignItems: 'center' }}
        >
          <Tooltip
            title={
              canUseGoLive
                ? undefined
                : intl.formatMessage({ id: 'nav.goLive.disabledHint' })
            }
          >
            <Button
              type="primary"
              icon={<VideoCameraOutlined style={{ fontSize: 16 }} />}
              style={{
                borderRadius: 10,
                height: 30,
                display: 'inline-flex',
                alignItems: 'center',
                fontWeight: 700,
                color: '#2C2C2C',
                backgroundColor: '#EFBC5C',
                border: 'none',
                boxShadow: isDark
                  ? '0 8px 18px rgba(239, 188, 92, 0.2)'
                  : '0 8px 18px rgba(184, 135, 46, 0.2)',
              }}
              onClick={handleGoLiveClick}
              disabled={!canUseGoLive}
            >
              {intl.formatMessage({ id: 'nav.goLive' })}
            </Button>
          </Tooltip>
          <Button
            type="text"
            icon={
              isDark ? (
                <SunOutlined style={{ color: '#faad14' }} />
              ) : (
                <MoonOutlined style={{ fontSize: 16 }} />
              )
            }
            style={{
              ...utilityButtonStyle,
              fontSize: 18,
              color: isDark ? '#EFBC5C' : '#4b5563',
            }}
            onClick={() => applyThemeMode(isDark ? 'light' : 'dark')}
          />
          <Dropdown
            trigger={['click']}
            menu={{ items: languageMenuItems as any }}
          >
            <Button
              type="text"
              icon={<GlobalOutlined style={{ fontSize: 16 }} />}
              style={{
                ...utilityButtonStyle,
                color: isDark ? '#EFBC5C' : '#4b5563',
              }}
            />
          </Dropdown>
          {isLoggedIn ? (
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'profile-header',
                    disabled: true,
                    label: (
                      <Space size={10} align="start" style={{ width: '100%' }}>
                        <Avatar
                          size={30}
                          src={
                            currentUser?.avatar_url ||
                            currentUser?.avatar ||
                            undefined
                          }
                          icon={<UserOutlined />}
                        />
                        <Space
                          direction="vertical"
                          size={1}
                          style={{ minWidth: 0, lineHeight: 1.2 }}
                        >
                          <Text
                            style={{ fontWeight: 600, maxWidth: 180 }}
                            ellipsis
                          >
                            {displayName}
                          </Text>
                          {secondaryIdentity ? (
                            <Text
                              type="secondary"
                              style={{ fontSize: 12, maxWidth: 180 }}
                              ellipsis
                            >
                              {secondaryIdentity}
                            </Text>
                          ) : null}
                          {profileHints.length > 0 ? (
                            <Space size={4} wrap>
                              {profileHints.map((hint) => (
                                <Tag
                                  key={hint.key}
                                  bordered={false}
                                  color="gold"
                                  style={{
                                    borderRadius: 999,
                                    marginInlineEnd: 0,
                                    paddingInline: 6,
                                    fontSize: 11,
                                    lineHeight: '18px',
                                  }}
                                >
                                  {intl.formatMessage({ id: hint.label })}
                                </Tag>
                              ))}
                            </Space>
                          ) : null}
                        </Space>
                      </Space>
                    ),
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'profile-dashboard',
                    icon: <UserOutlined />,
                    label: intl.formatMessage({ id: 'nav.profile' }),
                    onClick: () => history.push('/profile'),
                  },
                  {
                    key: 'my-videos',
                    icon: <PlaySquareOutlined />,
                    label: intl.formatMessage({ id: 'nav.myVideos' }),
                    onClick: () => history.push('/videos/mine'),
                  },
                  {
                    key: 'upload-video',
                    icon: <UploadOutlined />,
                    label: intl.formatMessage({ id: 'nav.uploadVideo' }),
                    onClick: () => history.push('/videos/upload'),
                  },
                  {
                    key: 'go-live',
                    icon: <VideoCameraOutlined />,
                    label: intl.formatMessage({ id: 'nav.goLive' }),
                    onClick: handleGoLiveClick,
                    disabled: !isCreator,
                  },
                  {
                    type: 'divider',
                  },
                  ...(sellerHasStore
                    ? [
                        {
                          key: 'seller-center',
                          icon: <ShopOutlined />,
                          label: intl.formatMessage({ id: 'nav.myStore' }),
                          onClick: () => history.push('/seller/store'),
                        } as const,
                        {
                          key: 'seller-orders',
                          icon: <ShoppingOutlined />,
                          label: intl.formatMessage({ id: 'nav.sellerOrders' }),
                          onClick: () => history.push('/seller/orders'),
                        } as const,
                        {
                          key: 'seller-payout-addresses',
                          icon: <DollarOutlined />,
                          label: intl.formatMessage({
                            id: 'nav.sellerPayoutAddresses',
                          }),
                          onClick: () =>
                            history.push('/seller/payout-addresses'),
                        } as const,
                        {
                          key: 'seller-refund-requests',
                          icon: <NotificationOutlined />,
                          label: intl.formatMessage({
                            id: 'nav.sellerRefundRequests',
                          }),
                          onClick: () =>
                            history.push('/seller/refund-requests'),
                        } as const,
                      ]
                    : []),
                  {
                    key: 'my-payment-orders',
                    icon: <DollarOutlined />,
                    label: intl.formatMessage({ id: 'nav.myPaymentOrders' }),
                    onClick: () => history.push('/account/payment-orders'),
                  },
                  {
                    key: 'my-subscription',
                    icon: <DollarOutlined />,
                    label: intl.formatMessage({ id: 'nav.mySubscription' }),
                    onClick: () => history.push('/account/subscription'),
                  },
                  {
                    key: 'my-shipping-addresses',
                    icon: <HomeOutlined />,
                    label: intl.formatMessage({ id: 'nav.shippingAddresses' }),
                    onClick: () => history.push('/account/shipping-addresses'),
                  },
                  {
                    key: 'my-product-orders',
                    icon: <ShoppingOutlined />,
                    label: intl.formatMessage({ id: 'nav.productOrders' }),
                    onClick: () => history.push('/account/product-orders'),
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'language',
                    icon: <CompassOutlined />,
                    label: intl.formatMessage({ id: 'nav.language' }),
                    children: languageMenuItems as any,
                  },
                  {
                    key: 'theme-menu',
                    icon: <BgColorsOutlined />,
                    label: intl.formatMessage({ id: 'nav.theme' }),
                    children: [
                      {
                        key: 'theme-light',
                        icon: <SunOutlined />,
                        label: intl.formatMessage({ id: 'nav.theme.light' }),
                        onClick: () => applyThemeMode('light'),
                      },
                      {
                        key: 'theme-dark',
                        icon: <MoonOutlined />,
                        label: intl.formatMessage({ id: 'nav.theme.dark' }),
                        onClick: () => applyThemeMode('dark'),
                      },
                      {
                        key: 'theme-system',
                        icon: <CompassOutlined />,
                        label: intl.formatMessage({ id: 'nav.theme.system' }),
                        onClick: () => applyThemeMode('system'),
                      },
                    ],
                  },
                  {
                    key: 'settings',
                    icon: <SettingOutlined />,
                    label: intl.formatMessage({ id: 'nav.settings' }),
                    onClick: () => history.push('/settings'),
                  },
                  {
                    key: 'help',
                    icon: <QuestionCircleOutlined />,
                    label: intl.formatMessage({ id: 'nav.help' }),
                  },
                  ...(isAdmin
                    ? ([
                        {
                          type: 'divider',
                        },
                        {
                          key: 'all-videos',
                          icon: <SettingOutlined />,
                          label: intl.formatMessage({ id: 'nav.allVideos' }),
                          onClick: () => history.push('/admin/videos'),
                        },
                        {
                          key: 'admin-product-orders',
                          icon: <ShoppingOutlined />,
                          label: intl.formatMessage({
                            id: 'admin.productOrders.title',
                          }),
                          onClick: () => history.push('/admin/product-orders'),
                        },
                        {
                          key: 'admin-refund-requests',
                          icon: <NotificationOutlined />,
                          label: intl.formatMessage({
                            id: 'admin.refundRequests.title',
                          }),
                          onClick: () => history.push('/admin/refund-requests'),
                        },
                      ] as const)
                    : []),
                  {
                    type: 'divider',
                  },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: intl.formatMessage({ id: 'nav.logOut' }),
                    onClick: handleLogout,
                  },
                ],
              }}
            >
              <Space size={8} style={{ marginLeft: 6, cursor: 'pointer' }}>
                <Avatar
                  size={32}
                  src={
                    currentUser?.avatar_url || currentUser?.avatar || undefined
                  }
                  icon={<UserOutlined />}
                />
              </Space>
            </Dropdown>
          ) : (
            <Space size={8} style={{ marginLeft: 8 }}>
              <Button
                type="text"
                style={{ color: '#745F40', fontWeight: 600 }}
                onClick={() => history.push('/login')}
              >
                {intl.formatMessage({ id: 'nav.logIn' })}
              </Button>
              <Button
                type="primary"
                style={{
                  borderRadius: 9,
                  fontWeight: 700,
                  color: '#2C2C2C',
                  backgroundColor: '#EFBC5C',
                  border: 'none',
                  boxShadow: isDark
                    ? '0 8px 18px rgba(239, 188, 92, 0.2)'
                    : '0 8px 18px rgba(184, 135, 46, 0.2)',
                }}
                onClick={() => history.push('/register')}
              >
                {intl.formatMessage({ id: 'nav.signUp' })}
              </Button>
            </Space>
          )}
        </Space>
      );
    },
    menuProps: {
      selectedKeys: [
        resolveMenuSelectedPath(
          history.location?.pathname || '/',
          history.location?.search || '',
        ),
      ],
    },
    token: {
      pageContainer: {
        paddingInlinePageContainerContent: 16,
        paddingBlockPageContainerContent: 12,
      },
      header: {
        colorBgHeader: isDark
          ? 'rgba(37, 31, 26, 0.94)'
          : 'rgba(255, 252, 243, 0.94)',
      },
    },
    childrenRender: (children) => {
      return (
        <LayoutChildrenWrapper isDark={isDark}>
          {children}
        </LayoutChildrenWrapper>
      );
    },
  };
};
