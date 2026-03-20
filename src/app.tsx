import {
  API_BASE_URL,
  CurrentUser,
  getCurrentUser,
  refreshAccessToken,
} from '@/services/auth';
import {
  clearStoredTokens,
  getAccessToken,
  getRefreshToken,
  setStoredTokens,
} from '@/utils/auth';
import {
  CloudUploadOutlined,
  GlobalOutlined,
  LogoutOutlined,
  MoonOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SunOutlined,
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
  authBaseUrl: string;
  fetchCurrentUser?: () => Promise<CurrentUser | null>;
};

const resolveCurrentUser = async (): Promise<CurrentUser | null> => {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken) {
    return null;
  }

  try {
    return await getCurrentUser(accessToken);
  } catch (error) {
    if (!refreshToken) {
      clearStoredTokens();
      return null;
    }

    try {
      const refreshed = await refreshAccessToken(refreshToken);

      if (!refreshed.access) {
        clearStoredTokens();
        return null;
      }

      setStoredTokens({
        access: refreshed.access,
        refresh: refreshed.refresh || refreshToken,
      });

      return await getCurrentUser(refreshed.access);
    } catch (refreshError) {
      clearStoredTokens();
      return null;
    }
  }
};

export async function getInitialState(): Promise<InitialState> {
  const currentUser = await resolveCurrentUser();

  return {
    name: 'Media Stream User',
    darkTheme: false,
    currentUser,
    authLoading: false,
    authBaseUrl: API_BASE_URL,
    fetchCurrentUser: resolveCurrentUser,
  };
}

export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  const isDark = initialState?.darkTheme;
  const currentUser = initialState?.currentUser;
  const isLoggedIn = Boolean(currentUser?.email);

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
    colorPrimary: '#5bd1d7',
    siderWidth: 176,
    menuHeaderRender: false,
    headerTitleRender: () => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
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
            fontSize: 18,
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
          padding: '0 24px',
        }}
      >
        <Input.Search
          placeholder="Search videos, channels, and people"
          allowClear
          style={{ maxWidth: 640, width: '100%' }}
          size="large"
          onSearch={(value) => console.log('Searching for:', value)}
        />
      </div>
    ),
    rightContentRender: () => (
      <Space
        size={8}
        style={{ marginRight: 8, display: 'flex', alignItems: 'center' }}
      >
        <Button
          type="text"
          icon={<CloudUploadOutlined style={{ fontSize: 18 }} />}
          style={{ color: isDark ? '#fff' : '#4b5563' }}
          onClick={() =>
            window.dispatchEvent(new CustomEvent('open-upload-modal'))
          }
        />
        <Button
          type="text"
          icon={<SettingOutlined style={{ fontSize: 18 }} />}
          style={{ color: isDark ? '#fff' : '#4b5563' }}
        />
        <Button
          type="text"
          icon={<QuestionCircleOutlined style={{ fontSize: 18 }} />}
          style={{ color: isDark ? '#fff' : '#4b5563' }}
        />
        <SelectLang
          icon={
            <Button
              type="text"
              icon={<GlobalOutlined style={{ fontSize: 18 }} />}
              style={{ color: isDark ? '#fff' : '#4b5563', padding: 0 }}
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
          style={{ fontSize: 18, color: isDark ? '#faad14' : '#4b5563' }}
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
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: 'Log out',
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <Space size={10} style={{ marginLeft: 8, cursor: 'pointer' }}>
              <Avatar size={36} icon={<UserOutlined />} />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  lineHeight: 1.2,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: isDark ? 'rgba(255,255,255,0.65)' : '#6b7280',
                  }}
                >
                  Signed in as
                </Text>
                <Text style={{ fontWeight: 600, maxWidth: 180 }} ellipsis>
                  {currentUser?.email}
                </Text>
              </div>
            </Space>
          </Dropdown>
        ) : (
          <Space size={8} style={{ marginLeft: 8 }}>
            <Button
              type="text"
              style={{ color: '#08979c', fontWeight: 700 }}
              onClick={() => history.push('/login')}
            >
              Log In
            </Button>
            <Button
              type="primary"
              style={{
                borderRadius: 10,
                fontWeight: 700,
                color: '#000',
                backgroundColor: '#5bd1d7',
                border: 'none',
                boxShadow: '0 8px 18px rgba(91, 209, 215, 0.24)',
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
        colorBgHeader: isDark ? '#141414' : 'rgba(255, 255, 255, 0.92)',
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
              colorPrimary: '#5bd1d7',
              borderRadius: 12,
            },
            components: {
              Input: {
                borderRadiusLG: 14,
              },
              Button: {
                borderRadius: 10,
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
