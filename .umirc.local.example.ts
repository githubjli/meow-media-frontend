import { defineConfig } from '@umijs/max';

export default defineConfig({
  proxy: {
    '/live-api': {
      target: 'https://your-api-domain.example.com',
      changeOrigin: true,
      pathRewrite: { '^/live-api': '/live' },
    },
  },
});
