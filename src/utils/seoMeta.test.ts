import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_PRODUCTS } from '../data/catalog.ts';
import { AgeGroup, ProductCategory } from '../types.ts';
import { buildAbsoluteUrl, resolvePageSeoMetadata } from './seoMeta.ts';

function findGraphNode(
  structuredData: { '@graph': Array<Record<string, unknown>> },
  type: string
) {
  return structuredData['@graph'].find((node) => node['@type'] === type);
}

test('default home SEO metadata stays within optimal title/description lengths and emits Store + BreadcrumbList @graph', () => {
  const meta = resolvePageSeoMetadata({
    page: 'home',
    origin: 'https://bee4.in',
    pathname: '/',
  });

  assert.ok(
    meta.title.length >= 30 && meta.title.length <= 60,
    `Unexpected title length: ${meta.title.length}`
  );
  assert.ok(
    meta.description.length >= 120 && meta.description.length <= 160,
    `Unexpected description length: ${meta.description.length}`
  );
  assert.match(meta.keywords, /screen-free brain training/i);
  assert.match(meta.keywords, /3D printing/i);
  assert.match(meta.keywords, /age-appropriate learning India/i);
  assert.equal(meta.ogType, 'website');

  const storeNode = findGraphNode(meta.structuredData, 'Store') as
    | {
        address?: {
          addressLocality: string;
          addressRegion: string;
          postalCode: string;
          addressCountry: string;
        };
      }
    | undefined;
  const breadcrumbNode = findGraphNode(meta.structuredData, 'BreadcrumbList') as
    | { itemListElement: Array<{ position: number; name: string; item: string }> }
    | undefined;

  assert.ok(storeNode, 'Expected Store entity in @graph');
  assert.deepEqual(storeNode.address, {
    '@type': 'PostalAddress',
    addressLocality: 'Banka',
    addressRegion: 'Bihar',
    postalCode: '813103',
    addressCountry: 'IN',
  });
  assert.ok(breadcrumbNode, 'Expected BreadcrumbList entity in @graph');
  assert.equal(breadcrumbNode.itemListElement.length, 3);
  assert.deepEqual(
    breadcrumbNode.itemListElement.map((c) => c.position),
    [1, 2, 3]
  );
  assert.equal(breadcrumbNode.itemListElement[0].name, 'Home');
  assert.equal(breadcrumbNode.itemListElement[0].item, 'https://bee4.in/');
});

test('product view SEO metadata generates Product Schema.org JSON-LD and 4-step BreadcrumbList from Home to Category, Age Group, and Product', () => {
  const sample = INITIAL_PRODUCTS[0];
  const meta = resolvePageSeoMetadata({
    page: 'product',
    activeProduct: sample,
    origin: 'https://bee4.in',
    pathname: '/',
  });

  assert.equal(meta.ogType, 'product');
  assert.ok(meta.title.length <= 60);
  assert.ok(meta.description.length <= 160);

  const productNode = findGraphNode(meta.structuredData, 'Product') as
    | { offers: { priceCurrency: string; price: string } }
    | undefined;
  const breadcrumbNode = findGraphNode(meta.structuredData, 'BreadcrumbList') as
    | { itemListElement: Array<{ position: number; name: string; item: string }> }
    | undefined;

  assert.ok(productNode);
  assert.equal(productNode.offers.priceCurrency, 'INR');
  assert.equal(productNode.offers.price, String(sample.price));

  assert.ok(breadcrumbNode);
  assert.deepEqual(
    breadcrumbNode.itemListElement.map((c) => [c.position, c.name]),
    [
      [1, 'Home'],
      [2, sample.category],
      [3, `Ages ${sample.ageGroup}`],
      [4, sample.title],
    ]
  );
});

test('shop view maps Home -> Shop -> Category -> Age Group in BreadcrumbList and reflects filters dynamically', () => {
  const meta = resolvePageSeoMetadata({
    page: 'shop',
    shopCategory: ProductCategory.ENGINEERING,
    shopAgeGroup: AgeGroup.AGE_6_8,
    origin: 'https://example.run.app',
    pathname: '/',
  });

  assert.match(meta.title, /6–8 Years/);
  assert.match(meta.title, /Engineering/);
  assert.equal(
    buildAbsoluteUrl('https://example.run.app/', '/assets/og-brain-toys.jpg'),
    'https://example.run.app/assets/og-brain-toys.jpg'
  );

  const breadcrumbNode = findGraphNode(meta.structuredData, 'BreadcrumbList') as
    | { itemListElement: Array<{ position: number; name: string; item: string }> }
    | undefined;
  assert.ok(breadcrumbNode);
  assert.deepEqual(
    breadcrumbNode.itemListElement.map((c) => [c.position, c.name]),
    [
      [1, 'Home'],
      [2, 'Shop All Brain Toys'],
      [3, 'Engineering'],
      [4, 'Ages 6–8 Years'],
    ]
  );
});
