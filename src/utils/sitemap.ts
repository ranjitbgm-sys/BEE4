import { AgeGroup, Product, ProductCategory } from '../types';
import { buildAbsoluteUrl } from './seoMeta';
import { normalizeAssetUrl } from './storeLogic';

export interface SitemapImageEntry {
  loc: string;
  title?: string;
}

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
  images?: SitemapImageEntry[];
}

export interface GenerateSitemapOptions {
  products: Product[];
  origin?: string;
  lastmod?: string;
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

function formatLastMod(lastmod?: string): string {
  if (lastmod && /^\d{4}-\d{2}-\d{2}/.test(lastmod.trim())) {
    return lastmod.trim().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function buildSitemapEntries(options: GenerateSitemapOptions): SitemapUrlEntry[] {
  const origin = normalizeOrigin(options.origin);
  const lastmod = formatLastMod(options.lastmod);

  const entries: SitemapUrlEntry[] = [
    {
      loc: `${origin}/`,
      lastmod,
      changefreq: 'daily',
      priority: '1.0',
    },
    {
      loc: `${origin}/?page=shop`,
      lastmod,
      changefreq: 'daily',
      priority: '0.9',
    },
    {
      loc: `${origin}/?page=gifts`,
      lastmod,
      changefreq: 'weekly',
      priority: '0.8',
    },
    {
      loc: `${origin}/?page=about`,
      lastmod,
      changefreq: 'monthly',
      priority: '0.6',
    },
    {
      loc: `${origin}/?page=contact`,
      lastmod,
      changefreq: 'monthly',
      priority: '0.6',
    },
  ];

  // Skill Category landing URLs
  for (const category of Object.values(ProductCategory)) {
    if (category === ProductCategory.ALL) continue;
    entries.push({
      loc: `${origin}/?page=shop&category=${encodeURIComponent(category)}`,
      lastmod,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  // Age Group landing URLs
  for (const ageGroup of Object.values(AgeGroup)) {
    if (ageGroup === AgeGroup.ALL) continue;
    entries.push({
      loc: `${origin}/?page=shop&age=${encodeURIComponent(ageGroup)}`,
      lastmod,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  // Dynamic product detail entries from catalog
  const seenIds = new Set<string>();
  for (const product of options.products) {
    if (!product?.id || seenIds.has(product.id)) continue;
    seenIds.add(product.id);

    const uniqueImages = new Map<string, SitemapImageEntry>();
    const mainImage = normalizeAssetUrl(product.image);
    if (mainImage) {
      const absUrl = buildAbsoluteUrl(origin, mainImage);
      uniqueImages.set(absUrl, {
        loc: absUrl,
        title: product.title,
      });
    }
    if (Array.isArray(product.gallery)) {
      for (const angle of product.gallery) {
        const angleUrl = normalizeAssetUrl(angle.url);
        if (!angleUrl) continue;
        const absUrl = buildAbsoluteUrl(origin, angleUrl);
        if (!uniqueImages.has(absUrl)) {
          uniqueImages.set(absUrl, {
            loc: absUrl,
            title: `${product.title} — ${angle.label}`,
          });
        }
      }
    }

    entries.push({
      loc: `${origin}/?product=${encodeURIComponent(product.id)}`,
      lastmod,
      changefreq: 'weekly',
      priority: product.featured ? '0.9' : '0.85',
      images: Array.from(uniqueImages.values()),
    });
  }

  return entries;
}

export function generateSitemapXml(options: GenerateSitemapOptions): string {
  const entries = buildSitemapEntries(options);

  const urlNodes = entries
    .map((entry) => {
      const lines = [
        '  <url>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '',
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
      ].filter(Boolean);

      if (entry.images && entry.images.length > 0) {
        for (const img of entry.images) {
          lines.push('    <image:image>');
          lines.push(`      <image:loc>${escapeXml(img.loc)}</image:loc>`);
          if (img.title) {
            lines.push(`      <image:title>${escapeXml(img.title)}</image:title>`);
          }
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

export function generateRobotsTxt(origin?: string): string {
  const safeOrigin = normalizeOrigin(origin);
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${safeOrigin}/sitemap.xml`,
    '',
  ].join('\n');
}
