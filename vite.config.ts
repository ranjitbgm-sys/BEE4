import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {INITIAL_PRODUCTS} from './src/data/catalog';
import {generateRobotsTxt, generateSitemapXml} from './src/utils/sitemap';

function resolveDeployOrigin(fallbackOrigin = 'https://bee4.in'): string {
  const candidates = [
    process.env.SITE_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.APP_URL,
  ];
  for (const raw of candidates) {
    const val = raw?.trim();
    if (val && val !== 'MY_APP_URL') {
      return val;
    }
  }
  return fallbackOrigin;
}

function bee4DynamicSitemapPlugin(): Plugin {
  return {
    name: 'bee4-dynamic-sitemap',
    configureServer(server) {
      server.middlewares.use('/sitemap.xml', (req, res) => {
        const host = req.headers.host || 'localhost:3000';
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const origin = resolveDeployOrigin(`${proto}://${host}`);
        const xml = generateSitemapXml({
          products: INITIAL_PRODUCTS,
          origin,
        });
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.end(xml);
      });
      server.middlewares.use('/robots.txt', (req, res) => {
        const host = req.headers.host || 'localhost:3000';
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const origin = resolveDeployOrigin(`${proto}://${host}`);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(generateRobotsTxt(origin));
      });
    },
    generateBundle() {
      const origin = resolveDeployOrigin('https://bee4.in');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: generateSitemapXml({
          products: INITIAL_PRODUCTS,
          origin,
        }),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: generateRobotsTxt(origin),
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), bee4DynamicSitemapPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
