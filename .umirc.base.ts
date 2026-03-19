import { defineConfig } from '@umijs/max';

export default defineConfig({
  initialState: {},
  model: {},
  locale: {
    default: 'en-US',
    antd: true,
    baseNavigator: true,
  },
  antd: {
    // 注入品牌色和全局圆角优化
    configProvider: {
      theme: {
        token: {
          colorPrimary: '#5bd1d7',
          borderRadius: 8,
        },
      },
    },
  },
  request: {},
  layout: {
    title: 'Media Stream',
    logo: '/logo_black.svg',
    layout: 'mix', // 混合布局：顶部一级，侧边二级
    splitMenus: true,
    fixedHeader: true,
  },
  routes: [
    { path: '/', redirect: '/home' },
    { name: 'Home', path: '/home', icon: 'HomeOutlined', component: './Home' },
    {
      name: 'Live',
      path: '/live',
      icon: 'VideoCameraOutlined',
      component: './Live',
    },
    {
      name: 'Discover',
      path: '/discover',
      icon: 'CompassOutlined',
      component: './Home',
    },
    { path: '/room/:id', component: './LiveRoom', hideInMenu: true },
  ],
  npmClient: 'pnpm',
});
