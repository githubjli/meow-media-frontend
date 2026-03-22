import { CurrentUser, resolveCurrentUser } from '@/services/auth';
import {
  listPublicCategories,
  type PublicCategory,
} from '@/services/publicCategories';
import { clearStoredTokens } from '@/utils/auth';
import {
  AppstoreOutlined,
  CloudUploadOutlined,
  GlobalOutlined,
  LogoutOutlined,
  MoonOutlined,
  PlaySquareOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SunOutlined,
  UploadOutlined,
  UserOutlined,
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
  const utilityButtonStyle = {
    width: 36,
    height: 36,
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
    navTheme: isDark ? 'realDark' : 'light',
    colorPrimary: '#35b8be',
    siderWidth: 188,
    menuHeaderRender: false,
    menuDataRender: (menuData) => {
      const stableKeys = new Set(['/home', '/browse', '/live']);
      const stableItems = menuData.filter(
        (item) => item.path && stableKeys.has(item.path),
      );
      const categoryItems = (initialState?.publicCategories || []).map(
        (category) => ({
          name: category.name,
          path: `/categories/${category.slug}`,
          icon: <AppstoreOutlined />,
        }),
      );
      return [...stableItems, ...categoryItems];
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
