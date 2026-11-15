/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import {
  DEFAULT_STORE_SETTINGS,
  INITIAL_CUSTOMERS,
  INITIAL_INQUIRIES,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_TESTIMONIALS,
} from './data/catalog';
import {
  CartItem,
  CustomerInquiry,
  CustomerProfile,
  GiftOccasion,
  OrderRecord,
  OrderStatus,
  Product,
  ProductCategory,
  SavedAddress,
  SortOption,
  StorePage,
  StoreSettings,
  Testimonial,
} from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { HomeView } from './components/HomeView';
import { ShopView } from './components/ShopView';
import { GiftIdeasView } from './components/GiftIdeasView';
import { ProductDetailView } from './components/ProductDetailView';
import { CheckoutView } from './components/CheckoutView';
import { AboutView, ContactView } from './components/AboutContactView';
import { AdminPanelView } from './components/AdminPanelView';
import { AdminAuthGate } from './components/AdminAuthGate';
import { CustomerAccountView } from './components/CustomerAccountView';
import { WhatsAppWidget } from './components/WhatsAppWidget';
import { resolveExpectedAdminHash } from './utils/adminAuth';
import { hydrateCustomersWithStarterHashes } from './utils/storeLogic';

const STORAGE_PRODUCTS_KEY = 'bee4_products_v1';
const STORAGE_CART_KEY = 'bee4_cart_v1';
const STORAGE_ORDERS_KEY = 'bee4_orders_v2';
const STORAGE_INQUIRIES_KEY = 'bee4_inquiries_v1';
const STORAGE_SETTINGS_KEY = 'bee4_settings_v1';
const STORAGE_TESTIMONIALS_KEY = 'bee4_testimonials_v1';
const STORAGE_CUSTOMERS_KEY = 'bee4_customers_v1';
const STORAGE_CURRENT_CUSTOMER_ID_KEY = 'bee4_current_customer_id_v1';
const STORAGE_GUEST_WISHLIST_KEY = 'bee4_guest_wishlist_v1';
const STORAGE_ADMIN_PASS_HASH_KEY = 'bee4_admin_pass_hash_v1';
const SESSION_ADMIN_TOKEN_KEY = 'bee4_admin_session_v1';

function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(() =>
    loadStoredJson<Product[]>(STORAGE_PRODUCTS_KEY, INITIAL_PRODUCTS)
  );
  const [cart, setCart] = useState<CartItem[]>(() =>
    loadStoredJson<CartItem[]>(STORAGE_CART_KEY, [])
  );
  const [orders, setOrders] = useState<OrderRecord[]>(() =>
    loadStoredJson<OrderRecord[]>(STORAGE_ORDERS_KEY, INITIAL_ORDERS)
  );
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>(() =>
    loadStoredJson<CustomerInquiry[]>(STORAGE_INQUIRIES_KEY, INITIAL_INQUIRIES)
  );
  const [settings, setSettings] = useState<StoreSettings>(() =>
    loadStoredJson<StoreSettings>(STORAGE_SETTINGS_KEY, DEFAULT_STORE_SETTINGS)
  );
  const [testimonials, setTestimonials] = useState<Testimonial[]>(() =>
    loadStoredJson<Testimonial[]>(STORAGE_TESTIMONIALS_KEY, INITIAL_TESTIMONIALS)
  );
  const [customers, setCustomers] = useState<CustomerProfile[]>(() =>
    hydrateCustomersWithStarterHashes(
      loadStoredJson<CustomerProfile[]>(STORAGE_CUSTOMERS_KEY, INITIAL_CUSTOMERS),
      INITIAL_CUSTOMERS
    )
  );
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(() =>
    loadStoredJson<string | null>(STORAGE_CURRENT_CUSTOMER_ID_KEY, null)
  );
  const [guestWishlistIds, setGuestWishlistIds] = useState<string[]>(() =>
    loadStoredJson<string[]>(STORAGE_GUEST_WISHLIST_KEY, [])
  );
  const [storedAdminHash, setStoredAdminHash] = useState<string>(() =>
    loadStoredJson<string>(STORAGE_ADMIN_PASS_HASH_KEY, '')
  );

  const expectedAdminHash = resolveExpectedAdminHash(
    storedAdminHash,
    import.meta.env?.VITE_ADMIN_PASSWORD_HASH
  );

  const [adminSessionToken, setAdminSessionToken] = useState<string>(() => {
    try {
      return window.sessionStorage.getItem(SESSION_ADMIN_TOKEN_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const isAdminAuthenticated = adminSessionToken === expectedAdminHash;

  const [activePage, setActivePage] = useState<StorePage>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (window.location.hash === '#admin' || params.get('admin') === '1') {
        return 'manager';
      }
    }
    return 'home';
  });
  const [selectedProductId, setSelectedProductId] = useState<string>(INITIAL_PRODUCTS[0].id);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const syncAdminHash = () => {
      const params = new URLSearchParams(window.location.search);
      if (window.location.hash === '#admin' || params.get('admin') === '1') {
        setActivePage('manager');
      } else if (activePage === 'manager') {
        setActivePage('home');
      }
    };
    window.addEventListener('hashchange', syncAdminHash);
    return () => window.removeEventListener('hashchange', syncAdminHash);
  }, [activePage]);

  // Shop filter state
  const [shopCategory, setShopCategory] = useState<ProductCategory>(ProductCategory.ALL);
  const [shopOccasion, setShopOccasion] = useState<GiftOccasion>(GiftOccasion.ALL);
  const [shopSearch, setShopSearch] = useState('');
  const [shopMaxPrice, setShopMaxPrice] = useState<number | null>(null);
  const [shopSortBy, setShopSortBy] = useState<SortOption>('featured');
  const [giftFinderOccasion, setGiftFinderOccasion] = useState<GiftOccasion>(GiftOccasion.ALL);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
    } catch {
      // Ignore quota errors gracefully
    }
  }, [products]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    } catch {
      // Ignore storage errors
    }
  }, [orders]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_INQUIRIES_KEY, JSON.stringify(inquiries));
    } catch {
      // Ignore storage errors
    }
  }, [inquiries]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_TESTIMONIALS_KEY, JSON.stringify(testimonials));
    } catch {
      // Ignore storage errors
    }
  }, [testimonials]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(customers));
    } catch {
      // Ignore storage errors
    }
  }, [customers]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_CURRENT_CUSTOMER_ID_KEY,
        JSON.stringify(currentCustomerId)
      );
    } catch {
      // Ignore storage errors
    }
  }, [currentCustomerId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_GUEST_WISHLIST_KEY, JSON.stringify(guestWishlistIds));
    } catch {
      // Ignore storage errors
    }
  }, [guestWishlistIds]);

  useEffect(() => {
    try {
      if (storedAdminHash) {
        window.localStorage.setItem(STORAGE_ADMIN_PASS_HASH_KEY, JSON.stringify(storedAdminHash));
      }
    } catch {
      // Ignore storage errors
    }
  }, [storedAdminHash]);

  const handleUnlockAdmin = () => {
    setAdminSessionToken(expectedAdminHash);
    try {
      window.sessionStorage.setItem(SESSION_ADMIN_TOKEN_KEY, expectedAdminHash);
    } catch {
      // Ignore storage errors
    }
  };

  const handleLockAdmin = () => {
    setAdminSessionToken('');
    try {
      window.sessionStorage.removeItem(SESSION_ADMIN_TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const handleChangeAdminPasswordHash = (nextHash: string) => {
    setStoredAdminHash(nextHash);
    setAdminSessionToken(nextHash);
    try {
      window.sessionStorage.setItem(SESSION_ADMIN_TOKEN_KEY, nextHash);
    } catch {
      // Ignore storage errors
    }
  };

  const navigateTo = (page: StorePage) => {
    setActivePage(page);
    if (page !== 'manager' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hadAdminParam = params.has('admin');
      if (hadAdminParam) params.delete('admin');
      if (window.location.hash === '#admin' || hadAdminParam) {
        const query = params.toString();
        window.history.replaceState(
          null,
          '',
          window.location.pathname + (query ? `?${query}` : '')
        );
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    navigateTo('product');
  };

  const handleAddToCart = (
    product: Product,
    variant: string,
    quantity: number,
    openDrawer: boolean
  ) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && item.variant === variant
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + quantity,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          variant,
          quantity,
          category: product.category,
        },
      ];
    });

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const handleQuickAdd = (product: Product) => {
    handleAddToCart(product, product.variants[0] ?? 'Standard Edition', 1, false);
  };

  const handleBuyNow = (product: Product, variant: string, quantity: number) => {
    handleAddToCart(product, variant, quantity, false);
    navigateTo('checkout');
  };

  const handleUpdateCartQuantity = (productId: string, variant: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.variant === variant
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: string, variant: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.variant === variant))
    );
  };

  const handleOrderComplete = (order: OrderRecord) => {
    setOrders((prev) => [order, ...prev]);
    setCart([]);
  };

  const handleSaveProduct = (saved: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      if (exists) {
        return prev.map((p) => (p.id === saved.id ? saved : p));
      }
      return [saved, ...prev];
    });
  };

  const handleToggleProductStock = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, inStock: !p.inStock } : p))
    );
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleResetCatalog = () => {
    setProducts(INITIAL_PRODUCTS);
  };

  const handleUpdateOrderStatus = (orderNumber: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => (order.orderNumber === orderNumber ? { ...order, status } : order))
    );
  };

  const handleSubmitInquiry = (inquiry: {
    name: string;
    contact: string;
    topic: string;
    message: string;
  }) => {
    const newRecord: CustomerInquiry = {
      id: `inq-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...inquiry,
      status: 'New',
    };
    setInquiries((prev) => [newRecord, ...prev]);
  };

  const handleToggleInquiryStatus = (id: string) => {
    setInquiries((prev) =>
      prev.map((inq) =>
        inq.id === id ? { ...inq, status: inq.status === 'New' ? 'Resolved' : 'New' } : inq
      )
    );
  };

  const handleAddTestimonial = (testimonial: Testimonial) => {
    setTestimonials((prev) => [testimonial, ...prev]);
  };

  const currentCustomer =
    customers.find((c) => c.id === currentCustomerId && Boolean(c.passwordHash)) ?? null;
  const activeWishlistIds = currentCustomer ? currentCustomer.wishlistIds : guestWishlistIds;

  const handleCustomerSignUp = (newCustomer: CustomerProfile) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    setCurrentCustomerId(newCustomer.id);
    setGuestWishlistIds([]);
  };

  const handleCustomerSignIn = (customerId: string) => {
    if (guestWishlistIds.length > 0) {
      setCustomers((prev) =>
        prev.map((cust) => {
          if (cust.id !== customerId) return cust;
          const merged = Array.from(new Set([...cust.wishlistIds, ...guestWishlistIds]));
          return { ...cust, wishlistIds: merged };
        })
      );
      setGuestWishlistIds([]);
    }
    setCurrentCustomerId(customerId);
  };

  const handleCustomerSignOut = () => {
    setCurrentCustomerId(null);
  };

  const handleUpdateCustomer = (updated: CustomerProfile) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleToggleWishlist = (productId: string) => {
    if (currentCustomer) {
      const exists = currentCustomer.wishlistIds.includes(productId);
      const nextIds = exists
        ? currentCustomer.wishlistIds.filter((id) => id !== productId)
        : [productId, ...currentCustomer.wishlistIds];
      handleUpdateCustomer({ ...currentCustomer, wishlistIds: nextIds });
      return;
    }

    setGuestWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [productId, ...prev]
    );
  };

  const handleReorderItems = (itemsToReorder: CartItem[]) => {
    setCart((prev) => {
      const next = [...prev];
      for (const item of itemsToReorder) {
        const liveProduct = products.find((p) => p.id === item.productId);
        const unitPrice = liveProduct ? liveProduct.price : item.price;
        const idx = next.findIndex(
          (c) => c.productId === item.productId && c.variant === item.variant
        );
        if (idx >= 0) {
          next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
        } else {
          next.push({ ...item, price: unitPrice });
        }
      }
      return next;
    });
    setIsCartOpen(true);
  };

  const handleCancelCustomerOrder = (orderNumber: string) => {
    handleUpdateOrderStatus(orderNumber, 'Cancelled');
  };

  const handleSaveAddressFromCheckout = (addr: Omit<SavedAddress, 'id' | 'isDefault'>) => {
    if (!currentCustomer) return;
    const duplicate = currentCustomer.addresses.some(
      (existing) =>
        existing.pinCode === addr.pinCode &&
        existing.address.trim().toLowerCase() === addr.address.trim().toLowerCase()
    );
    if (duplicate) return;

    const newAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      isDefault: currentCustomer.addresses.length === 0,
      ...addr,
    };
    handleUpdateCustomer({
      ...currentCustomer,
      addresses: [...currentCustomer.addresses, newAddr],
    });
  };

  const handleResetShopFilters = () => {
    setShopCategory(ProductCategory.ALL);
    setShopOccasion(GiftOccasion.ALL);
    setShopSearch('');
    setShopMaxPrice(null);
    setShopSortBy('featured');
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeProduct =
    products.find((p) => p.id === selectedProductId) ?? products[0] ?? INITIAL_PRODUCTS[0];
  const relatedProducts = products
    .filter(
      (p) =>
        p.id !== activeProduct.id &&
        (p.category === activeProduct.category || p.occasion === activeProduct.occasion)
    )
    .slice(0, 3);
  const customerFirstName = currentCustomer
    ? currentCustomer.fullName.trim().split(/\s+/)[0]
    : null;

  return (
    <div className="relative isolate min-h-screen flex flex-col text-zinc-900 overflow-x-clip">
      {/* iOS 27 Ambient Frosted Bokeh & Soft Glass Bubble Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
      >
        {/* Soft diffused pastel luminosity blobs */}
        <div className="glass-bokeh-amber absolute -top-24 -left-20 w-[440px] h-[440px] rounded-full blur-3xl opacity-85 animate-bubble-slow" />
        <div className="glass-bokeh-sky absolute top-[14%] -right-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-85 animate-bubble-reverse" />
        <div className="glass-bokeh-peach absolute top-[50%] -left-20 w-[430px] h-[430px] rounded-full blur-3xl opacity-80 animate-bubble-reverse" />
        <div className="glass-bokeh-mint absolute -bottom-24 right-[8%] w-[480px] h-[480px] rounded-full blur-3xl opacity-80 animate-bubble-slow" />

        {/* Delicate liquid-glass bubble spheres with specular crescent highlights */}
        <div className="absolute top-24 right-[4%] sm:right-[6%] w-16 h-16 sm:w-24 sm:h-24 rounded-full glass-orb opacity-85 animate-bubble-slow" />
        <div className="hidden md:block absolute top-[44%] left-[2.5%] w-20 h-20 rounded-full glass-orb opacity-80 animate-bubble-reverse" />
        <div className="hidden md:block absolute bottom-[22%] right-[11%] w-24 h-24 rounded-full glass-orb opacity-75 animate-bubble-reverse" />
        <div className="absolute bottom-14 left-[5%] sm:left-[10%] w-12 h-12 sm:w-16 sm:h-16 rounded-full glass-orb opacity-80 animate-bubble-slow" />
      </div>

      <Header
        activePage={activePage}
        cartCount={totalCartItems}
        announcementText={settings.announcementText}
        customerFirstName={customerFirstName}
        onNavigate={navigateTo}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-1 relative z-10">
        {activePage === 'home' && (
          <HomeView
            products={products}
            testimonials={testimonials}
            wishlistIds={activeWishlistIds}
            onNavigate={navigateTo}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleQuickAdd}
            onToggleWishlist={handleToggleWishlist}
            onBrowseOccasion={(occ) => {
              setGiftFinderOccasion(occ);
              navigateTo('gifts');
            }}
            onAddTestimonial={handleAddTestimonial}
          />
        )}

        {activePage === 'shop' && (
          <ShopView
            products={products}
            wishlistIds={activeWishlistIds}
            category={shopCategory}
            occasion={shopOccasion}
            search={shopSearch}
            maxPrice={shopMaxPrice}
            sortBy={shopSortBy}
            onChangeCategory={setShopCategory}
            onChangeOccasion={setShopOccasion}
            onChangeSearch={setShopSearch}
            onChangeMaxPrice={setShopMaxPrice}
            onChangeSortBy={setShopSortBy}
            onResetFilters={handleResetShopFilters}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleQuickAdd}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activePage === 'gifts' && (
          <GiftIdeasView
            products={products}
            wishlistIds={activeWishlistIds}
            initialOccasion={giftFinderOccasion}
            onSelectProduct={handleSelectProduct}
            onQuickAdd={handleQuickAdd}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activePage === 'product' && activeProduct && (
          <ProductDetailView
            key={activeProduct.id}
            product={activeProduct}
            relatedProducts={relatedProducts}
            wishlistIds={activeWishlistIds}
            whatsappNumber={settings.whatsappNumber}
            onBackToShop={() => navigateTo('shop')}
            onSelectProduct={handleSelectProduct}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activePage === 'checkout' && (
          <CheckoutView
            key={currentCustomer?.id ?? 'guest'}
            items={cart}
            currentCustomer={currentCustomer}
            whatsappNumber={settings.whatsappNumber}
            supportEmail={settings.supportEmail}
            freeShippingThreshold={settings.freeShippingThreshold}
            expectedPromoCode={settings.promoCode}
            promoDiscountPercent={settings.promoDiscountPercent}
            onBackToShop={() => navigateTo('shop')}
            onOrderComplete={handleOrderComplete}
            onSaveAddress={handleSaveAddressFromCheckout}
            onNavigateToAccount={() => navigateTo('account')}
          />
        )}

        {activePage === 'account' && (
          <CustomerAccountView
            currentCustomer={currentCustomer}
            customers={customers}
            orders={orders}
            products={products}
            guestWishlistIds={guestWishlistIds}
            whatsappNumber={settings.whatsappNumber}
            supportEmail={settings.supportEmail}
            onSignIn={handleCustomerSignIn}
            onSignUp={handleCustomerSignUp}
            onSignOut={handleCustomerSignOut}
            onUpdateCustomer={handleUpdateCustomer}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onReorderItems={handleReorderItems}
            onCancelOrder={handleCancelCustomerOrder}
            onSelectProduct={handleSelectProduct}
            onContinueShopping={() => navigateTo('shop')}
          />
        )}

        {activePage === 'about' && <AboutView onNavigate={navigateTo} />}

        {activePage === 'contact' && (
          <ContactView
            whatsappNumber={settings.whatsappNumber}
            supportEmail={settings.supportEmail}
            onSubmitInquiry={handleSubmitInquiry}
          />
        )}

        {activePage === 'manager' &&
          (isAdminAuthenticated ? (
            <AdminPanelView
              products={products}
              orders={orders}
              inquiries={inquiries}
              settings={settings}
              adminPasswordHash={expectedAdminHash}
              onUpdateSettings={setSettings}
              onSaveProduct={handleSaveProduct}
              onToggleProductStock={handleToggleProductStock}
              onDeleteProduct={handleDeleteProduct}
              onResetCatalog={handleResetCatalog}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onToggleInquiryStatus={handleToggleInquiryStatus}
              onChangeAdminPasswordHash={handleChangeAdminPasswordHash}
              onLockAdmin={handleLockAdmin}
              onBackToStore={() => navigateTo('home')}
            />
          ) : (
            <AdminAuthGate
              expectedPasswordHash={expectedAdminHash}
              onUnlock={handleUnlockAdmin}
              onBackToStore={() => navigateTo('home')}
            />
          ))}
      </main>

      <Footer
        whatsappNumber={settings.whatsappNumber}
        supportEmail={settings.supportEmail}
        promoCode={settings.promoCode}
        promoDiscountPercent={settings.promoDiscountPercent}
        onNavigate={navigateTo}
      />

      {activePage !== 'manager' && (
        <WhatsAppWidget
          whatsappNumber={settings.whatsappNumber}
          cart={cart}
          activeProduct={activePage === 'product' ? activeProduct : null}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        items={cart}
        whatsappNumber={settings.whatsappNumber}
        freeShippingThreshold={settings.freeShippingThreshold}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => navigateTo('checkout')}
        onBrowseShop={() => navigateTo('shop')}
      />
    </div>
  );
}
