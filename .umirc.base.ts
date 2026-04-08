import { defineConfig } from '@umijs/max';

export default defineConfig({
  initialState: {},
  model: {},
  locale: {
    default: 'en-US',
    antd: true,
    baseNavigator: false,
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
  links: [
    { rel: 'icon', href: '/favicon.ico' },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png',
    },
    { rel: 'icon', type: 'image/svg+xml', href: '/assets/meow-main-logo.svg' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  ],
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/login', component: './Login', hideInMenu: true },
    { path: '/register', component: './Register', hideInMenu: true },
    { path: '/videos/upload', component: './Videos/Upload', hideInMenu: true },
    { path: '/videos/mine', component: './Videos/Mine', hideInMenu: true },
    {
      path: '/account/payment-orders',
      component: './Account/PaymentOrders',
      hideInMenu: true,
    },
    { path: '/profile', component: './Account/Profile', hideInMenu: true },
    { path: '/settings', component: './Account/Settings', hideInMenu: true },
    { path: '/admin/videos', component: './Videos/All', hideInMenu: false },
    { path: '/videos/:id', component: './Videos/Detail', hideInMenu: true },
    { path: '/browse/:id', component: './PublicVideoDetail', hideInMenu: true },
    { path: '/store/:slug', component: './Store/Public', hideInMenu: true },
    {
      path: '/store/:slug/products',
      component: './Store/Products',
      hideInMenu: true,
    },
    { path: '/seller/store', component: './Seller/Store', hideInMenu: true },
    {
      path: '/seller/products',
      component: './Seller/Products',
      hideInMenu: true,
    },
    {
      path: '/seller/products/new',
      component: './Seller/Products/New',
      hideInMenu: true,
    },
    {
      path: '/seller/products/:id/edit',
      component: './Seller/Products/Edit',
      hideInMenu: true,
    },
    { path: '/live/create', component: './Live/Create', hideInMenu: true },
    { path: '/live/mine', component: './Live', hideInMenu: true },
    { path: '/live/:id', component: './LiveRoom', hideInMenu: true },
    { path: '/news', redirect: '/news/channel', hideInMenu: true },
    { path: '/news/live', component: './Live', hideInMenu: true },
    { path: '/news/channel', component: './Channel/News', hideInMenu: true },
    {
      path: '/categories/:category',
      component: './Categories',
      hideInMenu: true,
    },
    { name: 'Home', path: '/home', icon: 'HomeOutlined', component: './Home' },
    {
      name: 'Browse',
      path: '/browse',
      icon: 'AppstoreOutlined',
      component: './Browse',
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
