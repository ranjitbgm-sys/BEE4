import { AgeGroup, Product, ProductCategory, StorePage } from '../types';

export interface BreadcrumbItemSchema {
  '@type': 'ListItem';
  position: number;
  name: string;
  item: string;
}

export interface PageSeoMetadata {
  title: string;
  description: string;
  keywords: string;
  ogType: 'website' | 'product';
  imagePath: string;
  imageAlt: string;
  structuredData: {
    '@context': 'https://schema.org';
    '@graph': Array<Record<string, unknown>>;
  };
}

const DEFAULT_OG_IMAGE_PATH = '/assets/og-brain-toys.jpg';

const BASE_KEYWORDS = [
  'screen-free brain training',
  'screen-free toys India',
  '3D printing educational toys',
  '3D printed brain toys India',
  'age-appropriate learning India',
  'Japanese Karakuri puzzle India',
  'Korean Gabe STEM toys',
  'Chinese logic toys kids',
  'brain development toys ages 3-15',
  'BEE4 India',
].join(', ');

function clampTitle(raw: string): string {
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (clean.length <= 60) return clean;
  return `${clean.slice(0, 57).trimEnd()}...`;
}

function clampDescription(raw: string): string {
  const clean = raw.replace(/\s+/g, ' ').trim();
  if (clean.length <= 160) return clean;
  return `${clean.slice(0, 157).trimEnd()}...`;
}

export function buildAbsoluteUrl(origin: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const safeOrigin = origin.replace(/\/+$/, '');
  const safePath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${safeOrigin}${safePath}`;
}

export function buildBreadcrumbListSchema(
  baseUrl: string,
  crumbs: Array<{ name: string; hashOrQuery?: string }>
): Record<string, unknown> {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const itemListElement: BreadcrumbItemSchema[] = crumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    item: crumb.hashOrQuery ? `${cleanBase}${crumb.hashOrQuery}` : cleanBase,
  }));

  return {
    '@type': 'BreadcrumbList',
    '@id': `${cleanBase}#breadcrumb`,
    itemListElement,
  };
}

export function resolvePageSeoMetadata(params: {
  page: StorePage;
  activeProduct?: Product | null;
  quickViewProduct?: Product | null;
  shopCategory?: ProductCategory;
  shopAgeGroup?: AgeGroup;
  origin?: string;
  pathname?: string;
}): PageSeoMetadata {
  const {
    page,
    activeProduct,
    quickViewProduct,
    shopCategory = ProductCategory.ALL,
    shopAgeGroup = AgeGroup.ALL,
    origin = 'https://bee4.in',
    pathname = '/',
  } = params;

  const pageUrl = buildAbsoluteUrl(origin, pathname || '/');
  const focusedProduct = quickViewProduct ?? (page === 'product' ? activeProduct : null);

  if (focusedProduct) {
    const productImageUrl = buildAbsoluteUrl(origin, DEFAULT_OG_IMAGE_PATH);
    const productSlug = encodeURIComponent(focusedProduct.id);
    const catParam = encodeURIComponent(focusedProduct.category);
    const ageParam = encodeURIComponent(focusedProduct.ageGroup);

    const productEntity: Record<string, unknown> = {
      '@type': 'Product',
      '@id': `${pageUrl}?product=${productSlug}`,
      name: focusedProduct.title,
      description: focusedProduct.description,
      category: `${focusedProduct.category} · Ages ${focusedProduct.ageGroup}`,
      image: productImageUrl,
      brand: {
        '@type': 'Brand',
        name: 'BEE4',
      },
      audience: {
        '@type': 'PeopleAudience',
        suggestedMinAge: focusedProduct.ageGroup.split('–')[0]?.replace(/\D/g, '') || '3',
        suggestedMaxAge: focusedProduct.ageGroup.split('–')[1]?.replace(/\D/g, '') || '15',
      },
      offers: {
        '@type': 'Offer',
        url: `${pageUrl}?product=${productSlug}`,
        priceCurrency: 'INR',
        price: String(focusedProduct.price),
        availability: focusedProduct.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        areaServed: {
          '@type': 'Country',
          name: 'India',
        },
      },
    };

    const breadcrumbEntity = buildBreadcrumbListSchema(pageUrl, [
      { name: 'Home' },
      { name: focusedProduct.category, hashOrQuery: `?category=${catParam}` },
      {
        name: `Ages ${focusedProduct.ageGroup}`,
        hashOrQuery: `?category=${catParam}&age=${ageParam}`,
      },
      { name: focusedProduct.title, hashOrQuery: `?product=${productSlug}` },
    ]);

    return {
      title: clampTitle(`${focusedProduct.title} | BEE4 Brain Toys India`),
      description: clampDescription(
        `${focusedProduct.title} (Ages ${focusedProduct.ageGroup}) — Screen-free ${focusedProduct.category} toy, 3D-printed in India for ₹${focusedProduct.price}. Shop now at BEE4.`
      ),
      keywords: `${focusedProduct.title}, ${focusedProduct.category}, Ages ${focusedProduct.ageGroup}, ${BASE_KEYWORDS}`,
      ogType: 'product',
      imagePath: DEFAULT_OG_IMAGE_PATH,
      imageAlt: `${focusedProduct.title} — screen-free 3D-printed brain toy for ages ${focusedProduct.ageGroup}`,
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [productEntity, breadcrumbEntity],
      },
    };
  }

  if (page === 'shop') {
    const agePrefix = shopAgeGroup !== AgeGroup.ALL ? `Ages ${shopAgeGroup} ` : '';
    const skillPrefix = shopCategory !== ProductCategory.ALL ? `${shopCategory} ` : '';
    const dynamicTitle =
      agePrefix || skillPrefix
        ? `BEE4 – ${agePrefix}${skillPrefix}3D-Printed Brain Toys India`
        : 'BEE4 – Shop Screen-Free 3D-Printed Brain Toys India';

    const shopCrumbs: Array<{ name: string; hashOrQuery?: string }> = [
      { name: 'Home' },
      { name: 'Shop All Brain Toys', hashOrQuery: '?page=shop' },
    ];
    if (shopCategory !== ProductCategory.ALL) {
      shopCrumbs.push({
        name: shopCategory,
        hashOrQuery: `?page=shop&category=${encodeURIComponent(shopCategory)}`,
      });
    }
    if (shopAgeGroup !== AgeGroup.ALL) {
      shopCrumbs.push({
        name: `Ages ${shopAgeGroup}`,
        hashOrQuery: `?page=shop&age=${encodeURIComponent(shopAgeGroup)}`,
      });
    }

    return {
      title: clampTitle(dynamicTitle),
      description: clampDescription(
        `Explore ${agePrefix}${skillPrefix}screen-free brain-training toys custom 3D-printed in India for age-appropriate learning (₹349–₹899).`
      ),
      keywords: BASE_KEYWORDS,
      ogType: 'website',
      imagePath: DEFAULT_OG_IMAGE_PATH,
      imageAlt: 'BEE4 screen-free East-Asian 3D-printed brain toys catalog',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: dynamicTitle,
            url: pageUrl,
            inLanguage: 'en-IN',
            about:
              'Screen-free brain training, custom 3D printing, and age-appropriate learning in India',
          },
          buildBreadcrumbListSchema(pageUrl, shopCrumbs),
        ],
      },
    };
  }

  if (page === 'gifts') {
    return {
      title: clampTitle('BEE4 – Screen-Free Educational Brain Toy Gifts India'),
      description: clampDescription(
        'Gift meaningful screen-free brain-training toys 3D-printed in India. Age-appropriate STEM & logic gifts for birthdays & festivals (₹349–₹899).'
      ),
      keywords: `screen-free birthday return gifts India, ${BASE_KEYWORDS}`,
      ogType: 'website',
      imagePath: DEFAULT_OG_IMAGE_PATH,
      imageAlt: 'BEE4 curated screen-free 3D-printed brain-training gift boxes',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'CollectionPage',
            name: 'BEE4 Screen-Free Brain Toy Gift Finder',
            url: pageUrl,
            inLanguage: 'en-IN',
          },
          buildBreadcrumbListSchema(pageUrl, [
            { name: 'Home' },
            { name: 'Screen-Free Gift Ideas', hashOrQuery: '?page=gifts' },
          ]),
        ],
      },
    };
  }

  if (
    page === 'orders' ||
    page === 'order-detail' ||
    page === 'wallet' ||
    page === 'cart' ||
    page === 'account'
  ) {
    const titleMap: Record<string, string> = {
      orders: 'My Orders | BEE4 Official Store',
      'order-detail': 'Order Details & Tracking | BEE4',
      wallet: 'Gift Cards & BEE4 Wallet | BEE4',
      cart: 'Shopping Cart | BEE4 Official Store',
      account: 'My BEE4 Account | BEE4',
    };
    const docTitle = titleMap[page] || 'BEE4 Official Store';
    return {
      title: clampTitle(docTitle),
      description: clampDescription(
        'Manage your BEE4 orders, wallet credits, gift cards, and account preferences securely.'
      ),
      keywords: BASE_KEYWORDS,
      ogType: 'website',
      imagePath: DEFAULT_OG_IMAGE_PATH,
      imageAlt: 'BEE4 Official Store',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          buildBreadcrumbListSchema(pageUrl, [
            { name: 'Home' },
            { name: docTitle.replace(' | BEE4 Official Store', '').replace(' | BEE4', '') },
          ]),
        ],
      },
    };
  }

  if (
    page === 'legal-terms' ||
    page === 'legal-privacy' ||
    page === 'legal-returns' ||
    page === 'legal-shipping' ||
    page === 'legal-copyright'
  ) {
    const legalTitleMap: Record<string, string> = {
      'legal-terms': 'Terms & Conditions | BEE4',
      'legal-privacy': 'Privacy Policy | BEE4',
      'legal-returns': 'Return & Refund Policy | BEE4',
      'legal-shipping': 'Shipping Policy | BEE4',
      'legal-copyright': 'Copyrights & IP | BEE4',
    };
    const legalTitle = legalTitleMap[page] || 'BEE4 Policies';
    return {
      title: clampTitle(legalTitle),
      description: clampDescription(
        'Official BEE4 terms, privacy commitments, return & replacement rules, and shipping policy.'
      ),
      keywords: BASE_KEYWORDS,
      ogType: 'website',
      imagePath: DEFAULT_OG_IMAGE_PATH,
      imageAlt: 'BEE4 Official Store Policies',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          buildBreadcrumbListSchema(pageUrl, [
            { name: 'Home' },
            { name: legalTitle.replace(' | BEE4', '') },
          ]),
        ],
      },
    };
  }

  if (page === 'about' || page === 'contact') {
    const label = page === 'about' ? 'About Our 3D-Printed Studio' : 'Contact BEE4 India';
    return {
      title: clampTitle('BEE4 – About Our 3D-Printed Brain Toy Studio India'),
      description: clampDescription(
        'Learn how BEE4 crafts East-Asian screen-free brain-training toys via custom 3D printing in India for age-appropriate learning from ages 3 to 15.'
      ),
      keywords: BASE_KEYWORDS,
      ogType: 'website',
      imagePath: DEFAULT_OG_IMAGE_PATH,
      imageAlt: 'BEE4 3D-printing studio crafting screen-free toys in India',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            name: 'BEE4',
            url: origin,
            areaServed: 'IN',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Banka',
              addressRegion: 'Bihar',
              postalCode: '813103',
              addressCountry: 'IN',
            },
            description:
              'India’s first brand offering East-Asian screen-free brain-training toys custom 3D-printed in India.',
          },
          buildBreadcrumbListSchema(pageUrl, [
            { name: 'Home' },
            { name: label, hashOrQuery: `?page=${page}` },
          ]),
        ],
      },
    };
  }

  return {
    title: 'BEE4 – Screen-Free 3D-Printed Brain Toys India',
    description:
      'Shop screen-free brain-training toys custom 3D-printed in India. Age-appropriate learning for ages 3–15, from ₹349. Order now at BEE4.',
    keywords: BASE_KEYWORDS,
    ogType: 'website',
    imagePath: DEFAULT_OG_IMAGE_PATH,
    imageAlt: 'BEE4 East-Asian screen-free 3D-printed brain-training toys crafted in India',
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Store',
          '@id': `${pageUrl}#store`,
          name: 'BEE4',
          url: pageUrl,
          image: buildAbsoluteUrl(origin, DEFAULT_OG_IMAGE_PATH),
          description:
            'Screen-free brain training toys inspired by Japanese, Korean & Chinese mechanisms, custom 3D-printed in India for age-appropriate learning (ages 3–15).',
          priceRange: '₹349–₹899',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Banka',
            addressRegion: 'Bihar',
            postalCode: '813103',
            addressCountry: 'IN',
          },
          areaServed: {
            '@type': 'Country',
            name: 'India',
          },
          keywords:
            'screen-free brain training, 3D printing, age-appropriate learning in India, STEM toys',
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'East-Asian Screen-Free 3D-Printed Brain Toys',
            itemListElement: [
              { '@type': 'OfferCatalog', name: 'Engineering' },
              { '@type': 'OfferCatalog', name: 'Maths & Science' },
              { '@type': 'OfferCatalog', name: 'Motor Skills' },
              { '@type': 'OfferCatalog', name: 'Imagination' },
            ],
          },
        },
        buildBreadcrumbListSchema(pageUrl, [
          { name: 'Home' },
          { name: 'Brain Skill Categories', hashOrQuery: '#brain-toys-catalog' },
          { name: 'All 3D-Printed Brain Toys (Ages 3–15)', hashOrQuery: '#brain-toys-catalog' },
        ]),
      ],
    },
  };
}

function upsertMetaTag(
  selectorAttr: 'name' | 'property',
  attrValue: string,
  content: string
): void {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${selectorAttr}="${attrValue}"]`
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(selectorAttr, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function applyDocumentSeoMetadata(meta: PageSeoMetadata): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const origin = window.location.origin;
  const canonicalUrl = `${origin}${window.location.pathname}`;
  const absoluteImageUrl = buildAbsoluteUrl(origin, meta.imagePath);

  document.title = meta.title;
  upsertMetaTag('name', 'description', meta.description);
  upsertMetaTag('name', 'keywords', meta.keywords);

  upsertMetaTag('property', 'og:type', meta.ogType);
  upsertMetaTag('property', 'og:title', meta.title);
  upsertMetaTag('property', 'og:description', meta.description);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('property', 'og:image', absoluteImageUrl);
  upsertMetaTag('property', 'og:image:alt', meta.imageAlt);

  upsertMetaTag('name', 'twitter:card', 'summary_large_image');
  upsertMetaTag('name', 'twitter:title', meta.title);
  upsertMetaTag('name', 'twitter:description', meta.description);
  upsertMetaTag('name', 'twitter:image', absoluteImageUrl);
  upsertMetaTag('name', 'twitter:image:alt', meta.imageAlt);

  let canonicalLink = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);

  let jsonLdScript = document.getElementById('bee4-structured-data') as HTMLScriptElement | null;
  if (!jsonLdScript) {
    jsonLdScript = document.createElement('script');
    jsonLdScript.id = 'bee4-structured-data';
    jsonLdScript.type = 'application/ld+json';
    document.head.appendChild(jsonLdScript);
  }
  jsonLdScript.textContent = JSON.stringify(meta.structuredData);
}
