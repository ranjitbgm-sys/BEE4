import {
  User,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { INITIAL_PRODUCTS } from '../data/catalog';
import {
  AgeGroup,
  CartItem,
  CustomerInquiry,
  CustomerProfile,
  OrderRecord,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductAngle,
  ProductCategory,
  SavedAddress,
  StoreSettings,
  Testimonial,
} from '../types';

export const BOOTSTRAP_ADMIN_EMAIL = 'ranjitbgm@gmail.com';

const DEVANAGARI_RE = /[\u0900-\u097F]/;

function sanitizeId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned.length >= 2 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

function clampStr(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const trimmed = (val ?? '').trim();
  if (!trimmed) return fallback.slice(0, maxLen);
  return trimmed.slice(0, maxLen);
}

function sanitizeEnglishText(raw: unknown, seedFallback: string | undefined, defaultFallback: string): string {
  const str = typeof raw === 'string' ? raw.trim() : '';
  if (str && !DEVANAGARI_RE.test(str)) {
    return str;
  }
  return seedFallback ?? defaultFallback;
}

function toIsoString(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  if (typeof ts === 'string' && ts.trim()) {
    return ts;
  }
  return new Date().toISOString();
}

export function isVerifiedGoogleAdmin(user: User | null): boolean {
  return Boolean(
    user &&
      user.emailVerified &&
      user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
  );
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFromFirebase(): Promise<void> {
  await signOut(auth);
}

const VALID_SKILL_CATEGORIES = new Set<string>([
  ProductCategory.ENGINEERING,
  ProductCategory.MATHS_SCIENCE,
  ProductCategory.MOTOR_SKILLS,
  ProductCategory.IMAGINATION,
]);

const VALID_AGE_GROUPS = new Set<string>([
  AgeGroup.AGE_3_5,
  AgeGroup.AGE_6_8,
  AgeGroup.AGE_9_11,
  AgeGroup.AGE_12_15,
]);

function buildFallbackGallery(primaryUrl: string): [ProductAngle, ProductAngle, ProductAngle] {
  return [
    {
      id: 'front',
      label: 'View 1: Front',
      shortLabel: 'Front',
      url: primaryUrl || '/src/assets/images/toy_engineering_front_1794767911598.jpg',
      objectPosition: '50% 50%',
    },
    {
      id: 'mechanism',
      label: 'View 2: Mechanism/Inside',
      shortLabel: 'Mechanism',
      url: '/src/assets/images/toy_mechanism_inside_1794767912639.jpg',
      objectPosition: '50% 50%',
    },
    {
      id: 'scale',
      label: 'View 3: Hands-On Scale',
      shortLabel: 'Scale',
      url: '/src/assets/images/toy_hands_on_scale_1794767913261.jpg',
      objectPosition: '50% 50%',
    },
  ];
}

function toProductPayload(product: Product) {
  const id = sanitizeId(product.id, 'prod');
  const variants = (product.variants.length > 0 ? product.variants : ['Standard Studio Edition'])
    .slice(0, 10)
    .map((v) => clampStr(v, 80, 'Standard Studio Edition'));

  const payload: Record<string, unknown> = {
    id,
    title: clampStr(product.title, 140, 'BEE4 Brain Toy'),
    category: VALID_SKILL_CATEGORIES.has(product.category)
      ? product.category
      : ProductCategory.ENGINEERING,
    ageGroup: VALID_AGE_GROUPS.has(product.ageGroup) ? product.ageGroup : AgeGroup.AGE_6_8,
    originConcept: clampStr(product.originConcept, 120, '🇯🇵 East-Asian Brain Toy'),
    occasion: product.occasion,
    price: Math.max(1, Math.min(500000, Number(product.price) || 449)),
    image: clampStr(product.image, 1000, '/src/assets/images/toy_engineering_front_1794767911598.jpg'),
    variants,
    shortSpec: clampStr(product.shortSpec, 200, '3D-printed Bio-PLA+ · Screen-free'),
    description: clampStr(product.description, 2000, 'Custom 3D-printed screen-free brain-training toy.'),
    useCaseHi: clampStr(product.useCaseHi, 1000, 'Hands-on mechanical puzzle engineered to spark curiosity away from screens.'),
    brainBenefitsHi: clampStr(product.brainBenefitsHi, 1000, 'Strengthens logical thinking, focus, and spatial dexterity.'),
    whyParentsBuyHi: clampStr(product.whyParentsBuyHi, 1000, 'Offers a tactile screen-free challenge for kids and families worldwide.'),
    materials: clampStr(product.materials, 300, 'Food-Safe Matte Bio-PLA+'),
    dimensions: clampStr(product.dimensions, 200, 'Standard'),
    inStock: Boolean(product.inStock),
    featured: Boolean(product.featured),
    updatedAt: serverTimestamp(),
  };

  if (typeof product.compareAtPrice === 'number' && product.compareAtPrice > 0) {
    payload.compareAtPrice = Math.min(500000, product.compareAtPrice);
  }
  if (product.tag && product.tag.trim()) {
    payload.tag = clampStr(product.tag, 40);
  }

  return { id, payload };
}

export function subscribePublicProducts(
  onData: (products: Product[]) => void
): () => void {
  const path = 'products';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      if (snapshot.empty) return;
      const list: Product[] = snapshot.docs
        .map((d): Product | null => {
          const data = d.data();
          const cat = String(data.category ?? '');
          const age = String(data.ageGroup ?? '');
          if (!VALID_SKILL_CATEGORIES.has(cat) || !VALID_AGE_GROUPS.has(age)) {
            return null;
          }
          const id = String(data.id ?? d.id);
          const seedMatch = INITIAL_PRODUCTS.find((p) => p.id === id);
          const image = String(
            data.image ?? seedMatch?.image ?? '/src/assets/images/toy_engineering_front_1794767911598.jpg'
          );
          const gallery = seedMatch?.gallery ?? buildFallbackGallery(image);

          return {
            id,
            title: String(data.title ?? ''),
            category: cat as Exclude<ProductCategory, ProductCategory.ALL>,
            ageGroup: age as Exclude<AgeGroup, AgeGroup.ALL>,
            originConcept: String(
              data.originConcept ?? seedMatch?.originConcept ?? '🇯🇵 East-Asian Brain Toy'
            ),
            occasion: data.occasion,
            price: Number(data.price ?? 0),
            compareAtPrice:
              typeof data.compareAtPrice === 'number' ? data.compareAtPrice : undefined,
            image,
            gallery,
            variants: Array.isArray(data.variants) ? data.variants.map(String) : ['Standard'],
            shortSpec: String(data.shortSpec ?? ''),
            description: String(data.description ?? ''),
            useCaseHi: sanitizeEnglishText(
              data.useCaseHi,
              seedMatch?.useCaseHi,
              'Hands-on mechanical puzzle engineered to spark curiosity away from screens.'
            ),
            brainBenefitsHi: sanitizeEnglishText(
              data.brainBenefitsHi,
              seedMatch?.brainBenefitsHi,
              'Strengthens logical thinking, focus, and spatial dexterity.'
            ),
            whyParentsBuyHi: sanitizeEnglishText(
              data.whyParentsBuyHi,
              seedMatch?.whyParentsBuyHi,
              'Offers a tactile screen-free challenge for kids and families worldwide.'
            ),
            materials: String(data.materials ?? ''),
            dimensions: String(data.dimensions ?? ''),
            inStock: Boolean(data.inStock),
            featured: Boolean(data.featured),
            tag: typeof data.tag === 'string' && data.tag ? data.tag : undefined,
          };
        })
        .filter((item): item is Product => item !== null);

      if (list.length > 0) {
        onData(list);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribePublicSettings(
  onData: (settings: StoreSettings) => void
): () => void {
  const path = 'storeSettings/main';
  return onSnapshot(
    doc(db, 'storeSettings', 'main'),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      onData({
        whatsappNumber: String(data.whatsappNumber ?? ''),
        supportEmail: String(data.supportEmail ?? ''),
        announcementText: String(data.announcementText ?? ''),
        freeShippingThreshold: Number(data.freeShippingThreshold ?? 499),
        promoCode: String(data.promoCode ?? ''),
        promoDiscountPercent: Number(data.promoDiscountPercent ?? 0),
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribePublicTestimonials(
  onData: (testimonials: Testimonial[]) => void
): () => void {
  const path = 'testimonials';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) return;
      const list: Testimonial[] = snapshot.docs.map((d) => {
        const data = d.data();
        const rawRating = Number(data.rating ?? 5);
        const clamped = Math.max(1, Math.min(5, Math.round(rawRating))) as 1 | 2 | 3 | 4 | 5;
        return {
          id: String(data.id ?? d.id),
          customerName: String(data.customerName ?? ''),
          cityOrRole: String(data.cityOrRole ?? ''),
          productName: String(data.productName ?? ''),
          rating: clamped,
          feedback: String(data.feedback ?? ''),
          createdAt: toIsoString(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function ensureFirebaseCustomerProfile(
  fbUser: User,
  guestWishlistIds: string[]
): Promise<{
  profile: CustomerProfile;
}> {
  const uid = sanitizeId(fbUser.uid, 'user');
  const publicRef = doc(db, 'users', uid);
  const privateRef = doc(db, 'users', uid, 'private', 'info');
  const path = `users/${uid}/private/info`;

  try {
    const privateSnap = await getDoc(privateRef);
    const addrSnap = await getDocs(collection(db, 'users', uid, 'addresses'));

    const addresses: SavedAddress[] = addrSnap.docs.map((a) => {
      const d = a.data();
      return {
        id: String(d.id ?? a.id),
        label: (d.label as SavedAddress['label']) || 'Home',
        fullName: String(d.fullName ?? ''),
        phone: String(d.phone ?? ''),
        address: String(d.address ?? ''),
        city: String(d.city ?? ''),
        state: String(d.state ?? ''),
        pinCode: String(d.pinCode ?? ''),
        isDefault: Boolean(d.isDefault),
      };
    });

    if (privateSnap.exists()) {
      const data = privateSnap.data();
      const existingWishlist = Array.isArray(data.wishlistIds)
        ? data.wishlistIds.map(String)
        : [];
      const mergedWishlist = Array.from(
        new Set([...existingWishlist, ...guestWishlistIds])
      ).slice(0, 50);

      if (mergedWishlist.length > existingWishlist.length) {
        await updateDoc(privateRef, {
          wishlistIds: mergedWishlist,
          updatedAt: serverTimestamp(),
        });
      }

      return {
        profile: {
          id: uid,
          fullName: String(data.fullName ?? fbUser.displayName ?? 'BEE4 Shopper'),
          phone: String(data.phone ?? ''),
          email: String(data.email ?? fbUser.email ?? ''),
          preferredPayment: (data.preferredPayment as PaymentMethod) || 'upi',
          celebrationMonth:
            typeof data.celebrationMonth === 'string' && data.celebrationMonth
              ? data.celebrationMonth
              : undefined,
          createdAt: toIsoString(data.createdAt),
          addresses,
          wishlistIds: mergedWishlist,
        },
      };
    }

    const displayName = clampStr(fbUser.displayName, 100, 'BEE4 Customer');
    const safeEmail = clampStr(fbUser.email, 160);
    const boundedWishlist = guestWishlistIds.slice(0, 50).map((id) => clampStr(id, 128));

    const batch = writeBatch(db);
    batch.set(publicRef, {
      uid,
      displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(privateRef, {
      uid,
      fullName: displayName,
      phone: '',
      email: safeEmail,
      preferredPayment: 'upi',
      celebrationMonth: '',
      wishlistIds: boundedWishlist,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    return {
      profile: {
        id: uid,
        fullName: displayName,
        phone: '',
        email: safeEmail,
        preferredPayment: 'upi',
        createdAt: new Date().toISOString(),
        addresses,
        wishlistIds: boundedWishlist,
      },
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserPrivateProfileInFirestore(
  uid: string,
  profile: CustomerProfile
): Promise<void> {
  const safeUid = sanitizeId(uid, 'user');
  const privateRef = doc(db, 'users', safeUid, 'private', 'info');
  const publicRef = doc(db, 'users', safeUid);
  const path = `users/${safeUid}/private/info`;

  try {
    const batch = writeBatch(db);
    batch.update(publicRef, {
      displayName: clampStr(profile.fullName, 100, 'BEE4 Customer'),
      updatedAt: serverTimestamp(),
    });
    batch.update(privateRef, {
      fullName: clampStr(profile.fullName, 100, 'BEE4 Customer'),
      phone: clampStr(profile.phone, 20),
      email: clampStr(profile.email, 160),
      preferredPayment: profile.preferredPayment,
      celebrationMonth: clampStr(profile.celebrationMonth, 40),
      wishlistIds: profile.wishlistIds.slice(0, 50).map((id) => clampStr(id, 128)),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncUserAddressesToFirestore(
  uid: string,
  previousAddresses: SavedAddress[],
  nextAddresses: SavedAddress[]
): Promise<void> {
  const safeUid = sanitizeId(uid, 'user');
  const basePath = `users/${safeUid}/addresses`;

  try {
    const nextIds = new Set(nextAddresses.map((a) => sanitizeId(a.id, 'addr')));

    for (const prev of previousAddresses) {
      const prevId = sanitizeId(prev.id, 'addr');
      if (!nextIds.has(prevId)) {
        await deleteDoc(doc(db, 'users', safeUid, 'addresses', prevId));
      }
    }

    for (const addr of nextAddresses) {
      const addrId = sanitizeId(addr.id, 'addr');
      const addrRef = doc(db, 'users', safeUid, 'addresses', addrId);
      const existingSnap = await getDoc(addrRef);
      const pinCode = /^\d{6}$/.test(addr.pinCode) ? addr.pinCode : '560001';

      if (existingSnap.exists()) {
        await updateDoc(addrRef, {
          label: addr.label,
          fullName: clampStr(addr.fullName, 100, 'Recipient'),
          phone: clampStr(addr.phone, 15, '9800000000'),
          address: clampStr(addr.address, 300, 'India'),
          city: clampStr(addr.city, 80, 'Bengaluru'),
          state: clampStr(addr.state, 80, 'Karnataka'),
          pinCode,
          isDefault: Boolean(addr.isDefault),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(addrRef, {
          id: addrId,
          userId: safeUid,
          label: addr.label,
          fullName: clampStr(addr.fullName, 100, 'Recipient'),
          phone: clampStr(addr.phone, 15, '9800000000'),
          address: clampStr(addr.address, 300, 'India'),
          city: clampStr(addr.city, 80, 'Bengaluru'),
          state: clampStr(addr.state, 80, 'Karnataka'),
          pinCode,
          isDefault: Boolean(addr.isDefault),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, basePath);
  }
}

async function hydrateOrdersFromSnapshot(
  docs: { id: string; data: () => Record<string, unknown> }[]
): Promise<OrderRecord[]> {
  const hydrated = await Promise.all(
    docs.map(async (d) => {
      const data = d.data();
      const orderNumber = String(data.orderNumber ?? d.id);
      const itemsSnap = await getDocs(collection(db, 'orders', orderNumber, 'items'));
      const items: CartItem[] = itemsSnap.docs.map((itemDoc) => {
        const it = itemDoc.data();
        return {
          productId: String(it.productId ?? ''),
          title: String(it.title ?? ''),
          price: Number(it.price ?? 0),
          image: String(it.image ?? ''),
          variant: String(it.variant ?? 'Standard'),
          quantity: Number(it.quantity ?? 1),
          category: String(it.category ?? ''),
        };
      });

      return {
        orderNumber,
        createdAt: toIsoString(data.createdAt),
        items,
        subtotal: Number(data.subtotal ?? 0),
        discount: Number(data.discount ?? 0),
        shippingFee: Number(data.shippingFee ?? 0),
        giftWrapFee: Number(data.giftWrapFee ?? 0),
        total: Number(data.total ?? 0),
        paymentMethod: (data.paymentMethod as PaymentMethod) || 'upi',
        customer: {
          fullName: String(data.customerFullName ?? ''),
          phone: String(data.customerPhone ?? ''),
          email: String(data.customerEmail ?? ''),
          address: String(data.shippingAddress ?? ''),
          city: String(data.shippingCity ?? ''),
          state: String(data.shippingState ?? ''),
          pinCode: String(data.shippingPinCode ?? ''),
        },
        giftWrap: Boolean(data.giftWrap),
        giftMessage: String(data.giftMessage ?? ''),
        status: (data.status as OrderStatus) || 'Confirmed',
      } satisfies OrderRecord;
    })
  );

  return hydrated.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function subscribeUserOrders(
  uid: string,
  onData: (orders: OrderRecord[]) => void
): () => void {
  const safeUid = sanitizeId(uid, 'user');
  const q = query(collection(db, 'orders'), where('userId', '==', safeUid));
  return onSnapshot(
    q,
    async (snapshot) => {
      try {
        const orders = await hydrateOrdersFromSnapshot(
          snapshot.docs.map((d) => ({ id: d.id, data: () => d.data() }))
        );
        onData(orders);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

export function subscribeAllOrdersAdmin(
  onData: (orders: OrderRecord[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'orders'),
    async (snapshot) => {
      try {
        const orders = await hydrateOrdersFromSnapshot(
          snapshot.docs.map((d) => ({ id: d.id, data: () => d.data() }))
        );
        onData(orders);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

export function subscribeAllInquiriesAdmin(
  onData: (inquiries: CustomerInquiry[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'inquiries'),
    (snapshot) => {
      const list: CustomerInquiry[] = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: String(data.id ?? d.id),
            createdAt: toIsoString(data.createdAt),
            name: String(data.name ?? ''),
            contact: String(data.contact ?? ''),
            topic: String(data.topic ?? ''),
            message: String(data.message ?? ''),
            status: (data.status as 'New' | 'Resolved') || 'New',
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'inquiries');
    }
  );
}

export async function createOrderInFirestore(
  uid: string,
  order: OrderRecord
): Promise<void> {
  const safeUid = sanitizeId(uid, 'user');
  const orderNumber = sanitizeId(order.orderNumber, 'BEE4');
  const path = `orders/${orderNumber}`;
  const items = order.items.slice(0, 50);
  if (items.length === 0) return;

  try {
    const batch = writeBatch(db);
    const orderRef = doc(db, 'orders', orderNumber);
    const pinCode = /^[1-9][0-9]{5}$/.test(order.customer.pinCode)
      ? order.customer.pinCode
      : '560001';

    batch.set(orderRef, {
      orderNumber,
      userId: safeUid,
      subtotal: Math.max(0, Number(order.subtotal) || 0),
      discount: Math.max(0, Number(order.discount) || 0),
      shippingFee: Math.max(0, Number(order.shippingFee) || 0),
      giftWrapFee: Math.max(0, Number(order.giftWrapFee) || 0),
      total: Math.max(0, Number(order.total) || 0),
      paymentMethod: order.paymentMethod,
      customerFullName: clampStr(order.customer.fullName, 100, 'Customer'),
      customerPhone: clampStr(order.customer.phone, 15, '9800000000'),
      customerEmail: clampStr(order.customer.email, 160),
      shippingAddress: clampStr(order.customer.address, 300, 'India'),
      shippingCity: clampStr(order.customer.city, 80, 'Bengaluru'),
      shippingState: clampStr(order.customer.state, 80, 'Karnataka'),
      shippingPinCode: pinCode,
      giftWrap: Boolean(order.giftWrap),
      giftMessage: clampStr(order.giftMessage, 300),
      itemCount: items.length,
      status: 'Confirmed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    items.forEach((item, index) => {
      const itemRef = doc(db, 'orders', orderNumber, 'items', `item_${index}`);
      batch.set(itemRef, {
        orderNumber,
        userId: safeUid,
        productId: clampStr(item.productId, 128, 'item'),
        title: clampStr(item.title, 160, 'BEE4 Product'),
        price: Math.max(0, Number(item.price) || 0),
        image: clampStr(item.image, 1000, '/src/assets/images/hero_brain_toys_1794767911110.jpg'),
        variant: clampStr(item.variant, 80, 'Standard'),
        quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
        category: clampStr(item.category, 80, 'Engineering'),
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateOrderStatusInFirestore(
  orderNumber: string,
  status: OrderStatus
): Promise<void> {
  const safeId = sanitizeId(orderNumber, 'BEE4');
  const path = `orders/${safeId}`;
  try {
    await updateDoc(doc(db, 'orders', safeId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addTestimonialToFirestore(
  uid: string,
  testimonial: Testimonial
): Promise<void> {
  const safeUid = sanitizeId(uid, 'user');
  const id = sanitizeId(testimonial.id, 'rev');
  const path = `testimonials/${id}`;
  try {
    await setDoc(doc(db, 'testimonials', id), {
      id,
      userId: safeUid,
      customerName: clampStr(testimonial.customerName, 80, 'BEE4 Shopper'),
      cityOrRole: clampStr(testimonial.cityOrRole, 80, 'Verified Buyer'),
      productName: clampStr(testimonial.productName, 160, 'BEE4 Gift Order'),
      rating: Math.max(1, Math.min(5, Number(testimonial.rating) || 5)),
      feedback: clampStr(testimonial.feedback, 600, 'Great quality product.'),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function submitInquiryToFirestore(
  uid: string,
  inquiry: CustomerInquiry
): Promise<void> {
  const safeUid = sanitizeId(uid, 'user');
  const id = sanitizeId(inquiry.id, 'inq');
  const path = `inquiries/${id}`;
  try {
    await setDoc(doc(db, 'inquiries', id), {
      id,
      userId: safeUid,
      name: clampStr(inquiry.name, 100, 'Customer'),
      contact: clampStr(inquiry.contact, 160, 'N/A'),
      topic: clampStr(inquiry.topic, 100, 'General Inquiry'),
      message: clampStr(inquiry.message, 1500, 'Inquiry details'),
      status: 'New',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleInquiryStatusInFirestore(
  id: string,
  status: 'New' | 'Resolved'
): Promise<void> {
  const safeId = sanitizeId(id, 'inq');
  const path = `inquiries/${safeId}`;
  try {
    await updateDoc(doc(db, 'inquiries', safeId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  const { id, payload } = toProductPayload(product);
  const path = `products/${id}`;
  try {
    await setDoc(doc(db, 'products', id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const safeId = sanitizeId(productId, 'prod');
  const path = `products/${safeId}`;
  try {
    await deleteDoc(doc(db, 'products', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveStoreSettingsToFirestore(settings: StoreSettings): Promise<void> {
  const path = 'storeSettings/main';
  try {
    await setDoc(
      doc(db, 'storeSettings', 'main'),
      {
        whatsappNumber: clampStr(settings.whatsappNumber, 20, '919800004004'),
        supportEmail: clampStr(settings.supportEmail, 120, 'hello@bee4.in'),
        announcementText: clampStr(settings.announcementText, 200, 'Free India shipping ₹499+'),
        freeShippingThreshold: Math.max(0, Math.min(50000, Number(settings.freeShippingThreshold) || 499)),
        promoCode: clampStr(settings.promoCode, 32),
        promoDiscountPercent: Math.max(0, Math.min(90, Number(settings.promoDiscountPercent) || 0)),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function seedCatalogIfEmptyAsAdmin(
  uid: string,
  products: Product[],
  settings: StoreSettings,
  testimonials: Testimonial[]
): Promise<void> {
  const path = 'products';
  try {
    const existingProducts = await getDocs(collection(db, 'products'));
    const batch = writeBatch(db);
    let ops = 0;

    if (existingProducts.empty) {
      for (const product of products) {
        const { id, payload } = toProductPayload(product);
        batch.set(doc(db, 'products', id), payload);
        ops++;
      }
    }

    const settingsSnap = await getDoc(doc(db, 'storeSettings', 'main'));
    if (!settingsSnap.exists()) {
      batch.set(doc(db, 'storeSettings', 'main'), {
        whatsappNumber: clampStr(settings.whatsappNumber, 20, '919800004004'),
        supportEmail: clampStr(settings.supportEmail, 120, 'hello@bee4.in'),
        announcementText: clampStr(settings.announcementText, 200, 'Free delivery across India on orders ₹499+'),
        freeShippingThreshold: settings.freeShippingThreshold,
        promoCode: clampStr(settings.promoCode, 32),
        promoDiscountPercent: settings.promoDiscountPercent,
        updatedAt: serverTimestamp(),
      });
      ops++;
    }

    const existingTestimonials = await getDocs(collection(db, 'testimonials'));
    if (existingTestimonials.empty) {
      for (const t of testimonials) {
        const tid = sanitizeId(t.id, 'rev');
        batch.set(doc(db, 'testimonials', tid), {
          id: tid,
          userId: sanitizeId(uid, 'admin'),
          customerName: clampStr(t.customerName, 80, 'Customer'),
          cityOrRole: clampStr(t.cityOrRole, 80, 'Verified Buyer'),
          productName: clampStr(t.productName, 160, 'BEE4 Gift'),
          rating: t.rating,
          feedback: clampStr(t.feedback, 600, 'Great product.'),
          createdAt: serverTimestamp(),
        });
        ops++;
      }
    }

    if (ops > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
