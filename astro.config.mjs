import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://blog.fomiller.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Must match service.port in repo.nix. The standalone server reads HOST and
  // PORT from the environment first, so the cluster can still override these.
  server: { host: '0.0.0.0', port: 8080 },
});
