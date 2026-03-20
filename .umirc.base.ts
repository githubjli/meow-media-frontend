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
    layout: 'mix',
    fixedHeader: false,
    contentWidth: 'Fluid',
  },
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/login', component: './Login', hideInMenu: true },
    { path: '/register', component: './Register', hideInMenu: true },
    { name: 'Home', path: '/home', icon: 'HomeOutlined', component: './Home' },
    {
      name: 'Education',
      path: '/edu',
      icon: 'ReadOutlined',
      component: './Channel/Education',
    },
    {
      name: 'Gaming',
      path: '/game',
      icon: 'ControlOutlined',
      component: './Channel/Gaming',
    },
    {
      name: 'Technology',
      path: '/tech',
      icon: 'CodeOutlined',
      component: './Channel/Technology',
    },
    {
      name: 'News',
      path: '/news',
      icon: 'GlobalOutlined',
      component: './Channel/News',
    },
    {
      name: 'Live',
      path: '/live',
      icon: 'VideoCameraOutlined',
      component: './Live',
    },

    { path: '/room/:id', component: './LiveRoom', hideInMenu: true },
  ],
  npmClient: 'pnpm',
});
