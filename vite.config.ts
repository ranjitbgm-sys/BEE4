import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig, type Plugin} from 'vite';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

const SKILL_CATEGORIES = [
  'Engineering',
  'Maths & Science',
  'Motor Skills',
  'Imagination',
] as const;

const AGE_GROUPS = [
  '3–5 Years',
  '6–8 Years',
  '9–11 Years',
  '12–15 Years',
] as const;

interface StaticSitemapProduct {
  id: string;
  title: string;
  featured: boolean;
  images: {loc: string; title: string}[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeOrigin(rawOrigin?: string): string {
  const fallback = 'https://bee4.in';
  const candidate = (rawOrigin ?? '').trim();
  if (!candidate || candidate === 'MY_APP_URL') return fallback;
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  return withProtocol.replace(/\/+$/, '');
}

function buildAbsoluteUrl(origin: string, assetPath: string): string {
  const trimmed = assetPath.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin.replace(/\/+$/, '')}${cleanPath}`;
}

function resolveDeployOrigin(fallbackOrigin = 'https://bee4.in'): string {
  const candidates = [
    process.env.SITE_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
  ];
  for (const raw of candidates) {
    const val = raw?.trim();
    if (val && val !== 'MY_APP_URL') {
      return val;
    }
  }
  return fallbackOrigin;
}

function readCatalogProductsForSitemap(rootDir: string, origin: string): StaticSitemapProduct[] {
  const catalogPath = path.join(rootDir, 'src', 'data', 'catalog.ts');
  let source = '';
  try {
    source = fs.readFileSync(catalogPath, 'utf-8');
  } catch {
    return [];
  }

  const imageConsts = new Map<string, string>();
  const constRegex = /const\s+(IMG_[A-Z0-9_]+)\s*=\s*['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(constRegex)) {
    imageConsts.set(match[1], match[2]);
  }

  const productsStart = source.indexOf('export const INITIAL_PRODUCTS');
  if (productsStart === -1) return [];
  const slice = source.slice(productsStart);

  const entries: StaticSitemapProduct[] = [];
  const itemBlocks = slice.split(/\n\s*\{\s*\n\s*id:\s*['"]/).slice(1);

  for (const block of itemBlocks) {
    const idMatch = block.match(/^([^'"]+)['"]/);
    const titleMatch = block.match(/title:\s*['"]([^'"]+)['"]/);
    if (!idMatch || !titleMatch) continue;

    const id = idMatch[1].trim();
    const title = titleMatch[1].trim();
    const featured = /featured:\s*true/.test(block);

    const uniqueImages = new Map<string, {loc: string; title: string}>();
    const addImage = (rawPathOrConst: string, label: string) => {
      const resolved = imageConsts.get(rawPathOrConst.trim()) ?? rawPathOrConst.trim().replace(/^['"]|['"]$/g, '');
      if (!resolved) return;
      const absUrl = buildAbsoluteUrl(origin, resolved);
      if (!uniqueImages.has(absUrl)) {
        uniqueImages.set(absUrl, {loc: absUrl, title: label});
      }
    };

    const mainImageMatch = block.match(/image:\s*([A-Z0-9_]+|['"][^'"]+['"])/);
    if (mainImageMatch) {
      addImage(mainImageMatch[1], title);
    }

    const galleryMatch = block.match(/makeGallery\(\s*([A-Z0-9_]+|['"][^'"]+['"])\s*,\s*['"][^'"]*['"]\s*,\s*([A-Z0-9_]+|['"][^'"]+['"])\s*,\s*['"][^'"]*['"]\s*,\s*([A-Z0-9_]+|['"][^'"]+['"])/);
    if (galleryMatch) {
      addImage(galleryMatch[1], `${title} — View 1: Front`);
      addImage(galleryMatch[2], `${title} — View 2: Mechanism/Inside`);
      addImage(galleryMatch[3], `${title} — View 3: Hands-On Scale`);
    }

    entries.push({
      id,
      title,
      featured,
      images: Array.from(uniqueImages.values()),
    });
  }

  return entries;
}

function buildSitemapXmlString(rootDir: string, rawOrigin?: string): string {
  const origin = normalizeOrigin(rawOrigin);
  const lastmod = new Date().toISOString().slice(0, 10);

  const urls: {
    loc: string;
    changefreq: 'daily' | 'weekly' | 'monthly';
    priority: string;
    images?: {loc: string; title: string}[];
  }[] = [
    {loc: `${origin}/`, changefreq: 'daily', priority: '1.0'},
    {loc: `${origin}/?page=shop`, changefreq: 'daily', priority: '0.9'},
    {loc: `${origin}/?page=gifts`, changefreq: 'weekly', priority: '0.8'},
    {loc: `${origin}/?page=about`, changefreq: 'monthly', priority: '0.6'},
    {loc: `${origin}/?page=contact`, changefreq: 'monthly', priority: '0.6'},
    ...SKILL_CATEGORIES.map((category) => ({
      loc: `${origin}/?page=shop&category=${encodeURIComponent(category)}`,
      changefreq: 'weekly' as const,
      priority: '0.8',
    })),
    ...AGE_GROUPS.map((ageGroup) => ({
      loc: `${origin}/?page=shop&age=${encodeURIComponent(ageGroup)}`,
      changefreq: 'weekly' as const,
      priority: '0.8',
    })),
    ...readCatalogProductsForSitemap(rootDir, origin).map((product) => ({
      loc: `${origin}/?product=${encodeURIComponent(product.id)}`,
      changefreq: 'weekly' as const,
      priority: product.featured ? '0.9' : '0.85',
      images: product.images,
    })),
  ];

  const urlNodes = urls
    .map((entry) => {
      const lines = [
        '  <url>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
      ];
      if (entry.images) {
        for (const img of entry.images) {
          lines.push('    <image:image>');
          lines.push(`      <image:loc>${escapeXml(img.loc)}</image:loc>`);
          lines.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
          lines.push('    </image:image>');
        }
      }
      lines.push('  </url>');
      return lines.join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    urlNodes,
    '</urlset>',
    '',
  ].join('\n');
}

function buildRobotsTxtString(rawOrigin?: string): string {
  const origin = normalizeOrigin(rawOrigin);
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
}

function bee4DynamicSitemapPlugin(): Plugin {
  return {
    name: 'bee4-dynamic-sitemap',
    configureServer(server) {
      server.middlewares.use('/sitemap.xml', (req, res) => {
        const host = req.headers.host || 'localhost:3000';
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const origin = resolveDeployOrigin(`${proto}://${host}`);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.end(buildSitemapXmlString(ROOT_DIR, origin));
      });
      server.middlewares.use('/robots.txt', (req, res) => {
        const host = req.headers.host || 'localhost:3000';
        const proto = req.headers['x-forwarded-proto'] || 'http';
        const origin = resolveDeployOrigin(`${proto}://${host}`);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(buildRobotsTxtString(origin));
      });
    },
    generateBundle() {
      const origin = resolveDeployOrigin('https://bee4.in');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: buildSitemapXmlString(ROOT_DIR, origin),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: buildRobotsTxtString(origin),
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), bee4DynamicSitemapPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(ROOT_DIR, '.'),
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
