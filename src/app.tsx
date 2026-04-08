import { CurrentUser, resolveCurrentUser } from '@/services/auth';
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
import {
  AlertOutlined,
  BgColorsOutlined,
  CarOutlined,
  CoffeeOutlined,
  CompassOutlined,
  DollarOutlined,
  GlobalOutlined,
  HomeOutlined,
  LogoutOutlined,
  MoonOutlined,
  NotificationOutlined,
  PlayCircleOutlined,
  PlaySquareOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SettingOutlined,
  ShopOutlined,
  SunOutlined,
  ThunderboltOutlined,
  UploadOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history, setLocale, useIntl } from '@umijs/max';
import {
  Avatar,
  Button,
  ConfigProvider,
  Dropdown,
  Input,
  message,
  Space,
  Tag,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect } from 'react';

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

const getCategoryIcon = (slug?: string) => {
  return <ReadOutlined />;
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

export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  const intl = useIntl();
  const isDark = initialState?.darkTheme;
  const currentUser = initialState?.currentUser;
  const isLoggedIn = Boolean(currentUser?.email);
  const isAdmin = isAdminUser(currentUser);
  const isCreator = isCreatorUser(currentUser);
  const sellerHasStore = Boolean(initialState?.sellerHasStore);
  const canUseGoLive = !isLoggedIn || isCreator;
  const displayName =
    currentUser?.name || currentUser?.username || currentUser?.email || '';
  const secondaryIdentity =
    currentUser?.email && currentUser.email !== displayName
      ? currentUser.email
      : currentUser?.username && currentUser.username !== displayName
      ? currentUser.username
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
  const utilityButtonStyle = {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: isDark ? '#E4D5C5' : '#4b5563',
  } as const;
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedLocale = localStorage.getItem('umi_locale');
    if (storedLocale && SUPPORTED_LOCALES.has(storedLocale)) {
      return;
    }

    const browserLocale =
      (navigator.languages && navigator.languages[0]) || navigator.language;
    const nextLocale = resolveSupportedLocale(browserLocale);
    setLocale(nextLocale, true);
  }, []);

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
        ['/home', <VideoCameraOutlined />],
        ['/browse', <CompassOutlined />],
        ['/news', <NotificationOutlined />],
        ['/live', <ThunderboltOutlined />],
        ['/admin/videos', <SettingOutlined />],
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
            icon: getCategoryIcon(slug),
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          padding: '0 20px',
        }}
      >
        <Input.Search
          placeholder={intl.formatMessage({ id: 'search.global.placeholder' })}
          allowClear
          style={{
            maxWidth: 560,
            width: '100%',
            borderRadius: 12,
          }}
          size="middle"
          onSearch={(value) => console.log('Searching for:', value)}
        />
      </div>
    ),
    rightContentRender: () => (
      <Space
        size={6}
        style={{ marginRight: 6, display: 'flex', alignItems: 'center' }}
      >
        <Dropdown
          trigger={['click']}
          menu={{ items: languageMenuItems as any }}
        >
          <Button
            type="text"
            icon={<GlobalOutlined />}
            style={{
              ...utilityButtonStyle,
              fontSize: 18,
              color: isDark ? '#EFBC5C' : '#4b5563',
            }}
          />
        </Dropdown>
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
              <MoonOutlined />
            )
          }
          style={{
            ...utilityButtonStyle,
            fontSize: 18,
            color: isDark ? '#EFBC5C' : '#4b5563',
          }}
          onClick={() => applyThemeMode(isDark ? 'light' : 'dark')}
        />
        {isLoggedIn ? (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'profile-header',
                  disabled: true,
                  label: (
                    <Space size={10} style={{ width: '100%' }}>
                      <Avatar size={30} icon={<UserOutlined />} />
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
                    ]
                  : []),
                {
                  key: 'my-payment-orders',
                  icon: <DollarOutlined />,
                  label: intl.formatMessage({ id: 'nav.myPaymentOrders' }),
                  onClick: () => history.push('/account/payment-orders'),
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
              <Avatar size={32} icon={<UserOutlined />} />
              <Tag
                bordered={false}
                style={{
                  marginInlineEnd: 0,
                  borderRadius: 999,
                  paddingInline: 10,
                  maxWidth: 180,
                }}
              >
                <Text style={{ fontWeight: 600, maxWidth: 150 }} ellipsis>
                  {currentUser?.email}
                </Text>
              </Tag>
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
    ),
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
    },
  };
};
