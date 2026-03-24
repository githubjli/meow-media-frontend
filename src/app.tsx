import { CurrentUser, resolveCurrentUser } from '@/services/auth';
import {
  listPublicCategories,
  type PublicCategory,
} from '@/services/publicCategories';
import { clearStoredTokens } from '@/utils/auth';
import {
  BookOutlined,
  CloudUploadOutlined,
  CompassOutlined,
  FireOutlined,
  LogoutOutlined,
  MoonOutlined,
  NotificationOutlined,
  PlaySquareOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  SettingOutlined,
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
  Space,
  Tag,
  Typography,
  theme,
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

const getCategoryIcon = (slug?: string) => {
  const value = String(slug || '').toLowerCase();
  if (value.includes('tech')) return <CompassOutlined />;
  if (value.includes('news')) return <NotificationOutlined />;
  if (value.includes('game')) return <FireOutlined />;
  if (value.includes('edu') || value.includes('learn')) return <ReadOutlined />;
  if (value.includes('live')) return <ThunderboltOutlined />;
  return <BookOutlined />;
};

const CONTENT_CATEGORY_FALLBACKS = [
  { key: 'nav.category.technology', slug: 'technology' },
  { key: 'nav.category.education', slug: 'education' },
  { key: 'nav.category.gaming', slug: 'gaming' },
  { key: 'nav.category.entertainment', slug: 'entertainment' },
  { label: 'Travel', slug: 'travel' },
  { label: 'Finance', slug: 'finance' },
  { label: 'Movies', slug: 'movies' },
  { label: 'Beauty', slug: 'beauty' },
];

const COMMERCE_CATEGORY_ITEMS = [
  { label: 'Food', slug: 'food' },
  { label: 'Shops', slug: 'shops' },
  { label: 'Real Estate', slug: 'real-estate' },
  { label: 'Vehicles', slug: 'vehicles' },
  { label: 'Creators', slug: 'creators' },
];

const LIVE_SECTION_ITEMS = [
  { key: 'nav.exploreLive', path: '/live', slug: 'live' },
  { key: 'nav.goLive', path: '/live/create', slug: 'live-create' },
  { label: 'Selling', path: '/categories/live-selling', slug: 'selling' },
  { label: 'News', path: '/categories/live-news', slug: 'news' },
  { label: 'Reporting', path: '/categories/live-reporting', slug: 'reporting' },
  { label: 'Food', path: '/categories/live-food', slug: 'food' },
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

const isAdminUser = (user?: CurrentUser | null) =>
  Boolean(
    user &&
      (user.is_admin ||
        user.is_staff ||
        user.is_superuser ||
        user.role === 'admin'),
  );

type InitialState = {
  name: string;
  darkTheme: boolean;
  currentUser?: CurrentUser | null;
  authLoading?: boolean;
  fetchCurrentUser?: () => Promise<CurrentUser | null>;
  publicCategories: PublicCategory[];
};

export async function getInitialState(): Promise<InitialState> {
  const [currentUser, publicCategories] = await Promise.all([
    resolveCurrentUser(),
    listPublicCategories().catch(() => []),
  ]);

  return {
    name: 'Meow Media Stream User',
    darkTheme: false,
    currentUser,
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
  const utilityButtonStyle = {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: isDark ? '#E4D5C5' : '#4b5563',
  } as const;

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

  const handleUploadClick = () => {
    history.push(isLoggedIn ? '/videos/upload' : '/login');
  };
  const handleGoLiveClick = () => {
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

  return {
    title: 'Meow Media Stream',
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
            ? intl.formatMessage({ id: 'nav.home' })
            : path === '/browse'
            ? intl.formatMessage({ id: 'nav.browse' })
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
          const name =
            matchedCategory?.name ||
            (fallbackCategory.key
              ? intl.formatMessage({ id: fallbackCategory.key })
              : fallbackCategory.label);

          return {
            name,
            path: `/categories/${slug}`,
            icon: getCategoryIcon(slug),
            className: 'sidebar-menu-item sidebar-menu-item-category',
          };
        },
      );

      const commerceItem = {
        name: 'Commerce',
        path: '/categories/food',
        icon: getCategoryIcon('commerce'),
        className: 'sidebar-menu-item sidebar-menu-item-category',
        children: COMMERCE_CATEGORY_ITEMS.map((item) => ({
          name: item.label,
          path: `/categories/${item.slug}`,
          icon: getCategoryIcon(item.slug),
          className: 'sidebar-menu-item sidebar-menu-item-category',
        })),
      };

      const liveItem = {
        ...(stableItemByPath.get('/live') || {}),
        path: '/live',
        name: intl.formatMessage({ id: 'nav.live' }),
        icon: stableItemMap.get('/live'),
        className: 'sidebar-menu-item sidebar-menu-item-live',
        children: LIVE_SECTION_ITEMS.map((item) => ({
          name: item.key ? intl.formatMessage({ id: item.key }) : item.label,
          path: item.path,
          icon:
            item.path === '/live'
              ? <VideoCameraOutlined />
              : item.path === '/live/create'
              ? <UploadOutlined />
              : getCategoryIcon(item.slug),
          className: 'sidebar-menu-item sidebar-menu-item-live-child',
        })),
      };

      return [
        ...primaryItems,
        ...adminItems,
        { type: 'divider', key: 'sidebar-divider-primary' } as any,
        ...categoryItems,
        { type: 'divider', key: 'sidebar-divider-commerce' } as any,
        commerceItem,
        { type: 'divider', key: 'sidebar-divider-live' } as any,
        liveItem,
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
          {intl.formatMessage({ id: 'app.brand.name' })}
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
        >
          {intl.formatMessage({ id: 'nav.goLive' })}
        </Button>
        <Button
          type="text"
          icon={<CloudUploadOutlined style={{ fontSize: 18 }} />}
          style={utilityButtonStyle}
          onClick={handleUploadClick}
        />
        <Button
          type="text"
          icon={<SettingOutlined style={{ fontSize: 18 }} />}
          style={utilityButtonStyle}
        />
        <Button
          type="text"
          icon={<QuestionCircleOutlined style={{ fontSize: 18 }} />}
          style={utilityButtonStyle}
        />
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
          onClick={() => {
            setInitialState((pre) => ({
              ...pre!,
              darkTheme: !pre?.darkTheme,
            }));
          }}
        />
        {isLoggedIn ? (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
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
                },
                ...(isAdmin
                  ? [
                      {
                        key: 'all-videos',
                        icon: <SettingOutlined />,
                        label: intl.formatMessage({ id: 'nav.allVideos' }),
                        onClick: () => history.push('/admin/videos'),
                      } as const,
                    ]
                  : []),
                {
                  type: 'divider',
                },
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
