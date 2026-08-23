import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://blog.fomiller.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Must match service.port in repo.nix. The standalone server reads HOST and
  // PORT from the environment first, so the cluster can still override these.
  server: { host: '0.0.0.0', port: 8080 },
  env: {
    schema: {
      // In-cluster only. cms.fomiller.com is behind Cloudflare Access, which a
      // server-to-server call cannot pass, so the Service name is the address.
      DIRECTUS_URL: envField.string({
        context: 'server',
        access: 'secret',
        default: 'http://directus.directus.svc.cluster.local',
      }),
      // Optional so the site still builds and boots without a CMS credential.
      // Without it Directus answers 403 and the pages fall back to their empty
      // state rather than the container failing to start.
      DIRECTUS_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
});
