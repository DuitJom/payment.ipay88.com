import { defineConfig } from 'vite';

// Dev-only config for serving the static DuitJom site with live reload.
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});
