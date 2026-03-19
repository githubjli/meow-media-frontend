import { defineConfig } from '@umijs/max';
import baseConfig from './.umirc.base';
import localConfig from './.umirc.local';

export default defineConfig({
  ...baseConfig,
  ...localConfig,
  proxy: {
    ...(baseConfig.proxy || {}),
    ...(localConfig.proxy || {}),
  },
  locale: {
    ...(baseConfig.locale || {}),
    ...(localConfig.locale || {}),
  },
  antd: {
    ...(baseConfig.antd || {}),
    ...(localConfig.antd || {}),
  },
  layout: {
    ...(baseConfig.layout || {}),
    ...(localConfig.layout || {}),
  },
});
