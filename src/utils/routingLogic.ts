import type { AdminModuleRoute, StorePage } from '../types';

export interface ParsedAppRoute {
  page: StorePage;
  orderNumber?: string;
  productId?: string;
  adminRoute?: AdminModuleRoute;
  categoryQuery?: string;
  searchQuery?: string;
}

const VALID_ADMIN_ROUTES: ReadonlySet<AdminModuleRoute> = new Set([
  'dashboard',
  'integrations',
  'orders',
  'returns',
  'automations',
  'reconciliation',
  'analytics',
  'messages-reviews',
  'reels',
  'products',
  'inventory',
  'discounts',
  'customers',
  'settings',
]);

export function parseAppRoute(
  pathname: string,
  search = ''
): ParsedAppRoute {
  const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search || '');
  const productParam = params.get('product') || undefined;
  const pageParam = params.get('page') || undefined;

  if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
    const seg = cleanPath.replace(/^\/admin\/?/, '') as AdminModuleRoute;
    const adminRoute: AdminModuleRoute = VALID_ADMIN_ROUTES.has(seg) ? seg : 'dashboard';
    return { page: 'manager', adminRoute };
  }

  if (cleanPath === '/orders') {
    return { page: 'orders' };
  }

  if (cleanPath.startsWith('/orders/')) {
    const orderNum = decodeURIComponent(cleanPath.slice('/orders/'.length)).trim();
    if (orderNum) {
      return { page: 'order-detail', orderNumber: orderNum };
    }
    return { page: 'orders' };
  }

  if (cleanPath === '/account') return { page: 'account' };
  if (cleanPath === '/wallet') return { page: 'wallet' };
  if (cleanPath === '/cart') return { page: 'cart' };
  if (cleanPath === '/checkout') return { page: 'checkout' };
  if (cleanPath === '/shop') {
    return {
      page: 'shop',
      categoryQuery: params.get('category') || undefined,
      searchQuery: params.get('q') || undefined,
    };
  }
  if (cleanPath === '/gifts') return { page: 'gifts' };
  if (cleanPath === '/about' || cleanPath === '/about-bee4') return { page: 'about' };
  if (cleanPath === '/contact') return { page: 'contact' };
  if (cleanPath === '/legal/terms') return { page: 'legal-terms' };
  if (cleanPath === '/legal/privacy') return { page: 'legal-privacy' };
  if (cleanPath === '/legal/returns') return { page: 'legal-returns' };
  if (cleanPath === '/legal/shipping') return { page: 'legal-shipping' };
  if (cleanPath === '/legal/copyright') return { page: 'legal-copyright' };

  if (productParam) {
    return { page: 'product', productId: productParam };
  }

  if (pageParam === 'shop') return { page: 'shop' };
  if (pageParam === 'gifts') return { page: 'gifts' };
  if (pageParam === 'about') return { page: 'about' };
  if (pageParam === 'contact') return { page: 'contact' };
  if (pageParam === 'account') return { page: 'account' };
  if (pageParam === 'orders') return { page: 'orders' };
  if (pageParam === 'wallet') return { page: 'wallet' };
  if (pageParam === 'cart') return { page: 'cart' };

  return { page: 'home' };
}

export function buildAppRoutePath(input: {
  page: StorePage;
  orderNumber?: string;
  productId?: string;
  adminRoute?: AdminModuleRoute;
}): string {
  switch (input.page) {
    case 'home':
      return '/';
    case 'shop':
      return '/shop';
    case 'gifts':
      return '/gifts';
    case 'product':
      return input.productId ? `/?product=${encodeURIComponent(input.productId)}` : '/shop';
    case 'checkout':
      return '/checkout';
    case 'cart':
      return '/cart';
    case 'orders':
      return '/orders';
    case 'order-detail':
      return input.orderNumber
        ? `/orders/${encodeURIComponent(input.orderNumber)}`
        : '/orders';
    case 'wallet':
      return '/wallet';
    case 'account':
      return '/account';
    case 'about':
      return '/about-bee4';
    case 'contact':
      return '/contact';
    case 'legal-terms':
      return '/legal/terms';
    case 'legal-privacy':
      return '/legal/privacy';
    case 'legal-returns':
      return '/legal/returns';
    case 'legal-shipping':
      return '/legal/shipping';
    case 'legal-copyright':
      return '/legal/copyright';
    case 'manager':
      if (input.adminRoute && input.adminRoute !== 'dashboard') {
        return `/admin/${input.adminRoute}`;
      }
      return '/admin';
    default:
      return '/';
  }
}
