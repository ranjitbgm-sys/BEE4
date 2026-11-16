import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_PRODUCTS } from '../data/catalog';
import { AgeGroup, ProductCategory } from '../types';
import { buildSitemapEntries, generateRobotsTxt, generateSitemapXml } from './sitemap';

test('buildSitemapEntries covers core routes, all 4 skill categories, all 4 age groups, and all 16 catalog products', () => {
  const entries = buildSitemapEntries({
    products: INITIAL_PRODUCTS,
    origin: 'https://bee4.in/',
    lastmod: '2026-11-15',
  });

  // 5 static/nav views + 4 categories + 4 age groups + 16 products = 29 entries
  assert.equal(entries.length, 29);
  assert.equal(entries[0].loc, 'https://bee4.in/');
  assert.equal(entries[0].priority, '1.0');

  for (const cat of Object.values(ProductCategory)) {
    if (cat === ProductCategory.ALL) continue;
    assert.ok(
      entries.some((e) => e.loc === `https://bee4.in/?page=shop&category=${encodeURIComponent(cat)}`),
      `Missing category sitemap entry for ${cat}`
    );
  }

  for (const age of Object.values(AgeGroup)) {
    if (age === AgeGroup.ALL) continue;
    assert.ok(
      entries.some((e) => e.loc === `https://bee4.in/?page=shop&age=${encodeURIComponent(age)}`),
      `Missing ageGroup sitemap entry for ${age}`
    );
  }

  for (const product of INITIAL_PRODUCTS) {
    const match = entries.find(
      (e) => e.loc === `https://bee4.in/?product=${encodeURIComponent(product.id)}`
    );
    assert.ok(match, `Missing product sitemap entry for ${product.id}`);
    assert.ok(match.images && match.images.length >= 1, `Missing image tags for ${product.id}`);
    assert.ok(
      match.images.every((img) => img.loc.startsWith('https://bee4.in/assets/images/')),
      `Product image URL must be absolute under /assets/images/ for ${product.id}`
    );
  }
});

test('generateSitemapXml emits valid XML with escaped ampersands and image namespace', () => {
  const xml = generateSitemapXml({
    products: INITIAL_PRODUCTS,
    origin: 'https://bee4.netlify.app',
    lastmod: '2026-11-15',
  });

  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
  assert.ok(xml.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'));
  assert.ok(xml.includes('<loc>https://bee4.netlify.app/?page=shop&amp;category=Maths%20%26%20Science</loc>'));
  assert.ok(xml.includes('<loc>https://bee4.netlify.app/?product=bee4-karakuri-trick-box</loc>'));
  assert.equal(xml.includes('&category='), false, 'All ampersands in XML <loc> must be escaped as &amp;');
  assert.ok(xml.trimEnd().endsWith('</urlset>'));
});

test('generateRobotsTxt points crawlers to the resolved sitemap.xml URL', () => {
  const robots = generateRobotsTxt('https://bee4.in/');
  assert.ok(robots.includes('User-agent: *'));
  assert.ok(robots.includes('Allow: /'));
  assert.ok(robots.includes('Sitemap: https://bee4.in/sitemap.xml'));
});
