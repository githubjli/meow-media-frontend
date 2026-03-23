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
  GlobalOutlined,
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
import { SelectLang, history } from '@umijs/max';
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

const getCategoryIcon = (slug?: string) => {
  const value = String(slug || '').toLowerCase();
  if (value.includes('tech')) return <CompassOutlined />;
  if (value.includes('news')) return <NotificationOutlined />;
  if (value.includes('game')) return <FireOutlined />;
  if (value.includes('edu') || value.includes('learn')) return <ReadOutlined />;
  if (value.includes('live')) return <ThunderboltOutlined />;
  return <BookOutlined />;
};

const SIDEBAR_CATEGORY_FALLBACKS = [
  { name: 'Technology', slug: 'technology' },
  { name: 'Education', slug: 'education' },
  { name: 'Gaming', slug: 'gaming' },
  { name: 'News', slug: 'news' },
  { name: 'Entertainment', slug: 'entertainment' },
  { name: 'Other', slug: 'other' },
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
    name: 'Media Stream User',
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
    color: isDark ? '#d7e0ea' : '#4b5563',
  } as const;

  const handleUploadClick = () => {
    history.push(isLoggedIn ? '/videos/upload' : '/login');
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
    title: 'Media Stream',
    layout: 'mix',
    splitMenus: false,
    defaultCollapsed: true,
    navTheme: isDark ? 'realDark' : 'light',
    colorPrimary: '#35b8be',
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
          path === '/home' ? 'Home' : path === '/browse' ? 'Browse' : undefined,
        icon: stableItemMap.get(path),
        className: 'sidebar-menu-item sidebar-menu-item-primary',
      }));

      const adminItems = isAdmin
        ? [
            {
              ...(stableItemByPath.get('/admin/videos') || {}),
              path: '/admin/videos',
              name: 'All Videos',
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

      const categoryItems = SIDEBAR_CATEGORY_FALLBACKS.map(
        (fallbackCategory) => {
          const matchedCategory = apiCategories.get(
            normalizeCategoryKey(fallbackCategory.slug),
          );
          const slug = matchedCategory?.slug || fallbackCategory.slug;
          const name = matchedCategory?.name || fallbackCategory.name;

          return {
            name,
            path: `/categories/${slug}`,
            icon: getCategoryIcon(slug),
            className: 'sidebar-menu-item sidebar-menu-item-category',
          };
        },
      );

      const liveItem = {
        ...(stableItemByPath.get('/live') || {}),
        path: '/live',
        name: 'Live',
        icon: stableItemMap.get('/live'),
        className: 'sidebar-menu-item sidebar-menu-item-live',
      };

      return [
        ...primaryItems,
        ...adminItems,
        { type: 'divider', key: 'sidebar-divider-primary' } as any,
        ...categoryItems,
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
          src={isDark ? '/logo_white.svg' : '/logo_black.svg'}
          alt="logo"
          style={{ height: 28 }}
        />
        <span
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: isDark ? '#fff' : '#111827',
            letterSpacing: '-0.01em',
          }}
        >
          Media Stream
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
          placeholder="Search videos, channels, and people"
          allowClear
          style={{ maxWidth: 560, width: '100%' }}
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
        <SelectLang
          icon={
            <Button
              type="text"
              icon={<GlobalOutlined style={{ fontSize: 18 }} />}
              style={{ ...utilityButtonStyle, padding: 0 }}
            />
          }
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
            color: isDark ? '#f6c453' : '#4b5563',
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
                  label: 'My Videos',
                  onClick: () => history.push('/videos/mine'),
                },
                {
                  key: 'upload-video',
                  icon: <UploadOutlined />,
                  label: 'Upload Video',
                  onClick: () => history.push('/videos/upload'),
                },
                ...(isAdmin
                  ? [
                      {
                        key: 'all-videos',
                        icon: <SettingOutlined />,
                        label: 'All Videos',
                        onClick: () => history.push('/admin/videos'),
                      } as const,
                    ]
                  : []),
                {
                  type: 'divider',
                },
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Log out',
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
              style={{ color: '#0f766e', fontWeight: 600 }}
              onClick={() => history.push('/login')}
            >
              Log In
            </Button>
            <Button
              type="primary"
              style={{
                borderRadius: 9,
                fontWeight: 700,
                color: '#07272a',
                backgroundColor: '#35b8be',
                border: 'none',
                boxShadow: isDark
                  ? '0 8px 18px rgba(53, 184, 190, 0.18)'
                  : '0 8px 18px rgba(53, 184, 190, 0.2)',
              }}
              onClick={() => history.push('/register')}
            >
              Sign Up
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
          ? 'rgba(11, 17, 24, 0.92)'
          : 'rgba(255, 255, 255, 0.92)',
      },
    },
    childrenRender: (children) => {
      useEffect(() => {
        const favicon = document.querySelector(
          "link[rel*='icon']",
        ) as HTMLLinkElement;
        const iconPath = isDark ? '/favicon_white.svg' : '/favicon_black.svg';
        if (favicon) {
          favicon.href = iconPath;
        }
      }, [isDark]);

      return (
        <ConfigProvider
          theme={{
            algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
            token: {
              colorPrimary: '#35b8be',
              borderRadius: 12,
            },
            components: {
              Input: {
                borderRadiusLG: 12,
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
