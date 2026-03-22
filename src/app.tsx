import { CurrentUser, resolveCurrentUser } from '@/services/auth';
import { clearStoredTokens } from '@/utils/auth';
import {
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
};

export async function getInitialState(): Promise<InitialState> {
  const currentUser = await resolveCurrentUser();

  return {
    name: 'Media Stream User',
    darkTheme: false,
    currentUser,
    authLoading: false,
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
          onClick={handleUploadClick}
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
