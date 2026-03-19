import {
  CloudUploadOutlined,
  GlobalOutlined,
  MoonOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  SunOutlined,
} from '@ant-design/icons';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { SelectLang, history } from '@umijs/max';
import { Button, ConfigProvider, Input, Space, theme } from 'antd';
import React, { useEffect } from 'react';

/**
 * @see https://umijs.org/zh-CN/plugins/plugin-initial-state
 */
export async function getInitialState(): Promise<{
  name: string;
  darkTheme: boolean;
}> {
  return {
    name: 'Media Stream User',
    darkTheme: false, // 默认白天模式
  };
}

type ThemeWrapperProps = {
  children: React.ReactNode;
  isDark?: boolean;
};

// 专门用于包裹全局主题和处理 favicon
const ThemeWrapper: React.FC<ThemeWrapperProps> = ({
  children,
  isDark = false,
}) => {
  useEffect(() => {
    const iconPath = isDark ? '/favicon_white.svg' : '/favicon_black.svg';

    let favicon = document.getElementById(
      'app-favicon',
    ) as HTMLLinkElement | null;

    if (!favicon) {
      favicon = document.querySelector(
        "link[rel*='icon']",
      ) as HTMLLinkElement | null;
    }

    if (!favicon) {
      favicon = document.createElement('link');
      favicon.id = 'app-favicon';
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }

    favicon.href = iconPath;
  }, [isDark]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#5bd1d7' },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

// 运行时布局配置
export const layout: RunTimeLayoutConfig = ({
  initialState,
  setInitialState,
}) => {
  const isDark = initialState?.darkTheme ?? false;

  return {
    title: 'Media Stream',
    layout: 'mix',
    splitMenus: false,
    navTheme: isDark ? 'realDark' : 'light',
    colorPrimary: '#5bd1d7',

    // 顶部左侧 Logo
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
            fontSize: 18,
            fontWeight: 'bold',
            color: isDark ? '#fff' : '#000',
          }}
        >
          Media Stream
        </span>
      </div>
    ),

    // 关闭侧边栏默认 Header
    menuHeaderRender: false,

    // 顶部居中搜索框
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
          style={{ maxWidth: 600, width: '100%' }}
          size="large"
          onSearch={(value) => console.log('Searching for:', value)}
        />
      </div>
    ),

    // 顶部右侧操作区
    rightContentRender: () => (
      <Space
        size={4}
        style={{ marginRight: 16, display: 'flex', alignItems: 'center' }}
      >
        <Button
          type="text"
          icon={<CloudUploadOutlined style={{ fontSize: 20 }} />}
          style={{ color: isDark ? '#fff' : '#595959' }}
        />
        <Button
          type="text"
          icon={<SettingOutlined style={{ fontSize: 20 }} />}
          style={{ color: isDark ? '#fff' : '#595959' }}
        />
        <Button
          type="text"
          icon={<QuestionCircleOutlined style={{ fontSize: 20 }} />}
          style={{ color: isDark ? '#fff' : '#595959' }}
        />

        <SelectLang
          icon={
            <Button
              type="text"
              icon={<GlobalOutlined style={{ fontSize: 20 }} />}
              style={{ color: isDark ? '#fff' : '#595959', padding: 0 }}
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
          style={{ fontSize: 20, color: isDark ? '#faad14' : '#595959' }}
          onClick={() => {
            setInitialState((pre) => ({
              ...pre!,
              darkTheme: !pre?.darkTheme,
            }));
          }}
        />

        <Space size={8} style={{ marginLeft: 12 }}>
          <Button type="text" style={{ color: '#5bd1d7', fontWeight: 'bold' }}>
            Log In
          </Button>
          <Button
            type="primary"
            style={{
              borderRadius: 6,
              fontWeight: 'bold',
              color: '#000',
              backgroundColor: '#5bd1d7',
              border: 'none',
            }}
          >
            Sign Up
          </Button>
        </Space>
      </Space>
    ),

    // 全局包裹器
    childrenRender: (children) => {
      return <ThemeWrapper isDark={isDark}>{children}</ThemeWrapper>;
    },
  };
};
