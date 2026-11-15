export enum ProductCategory {
  ALL = 'All Skills',
  ENGINEERING = 'Engineering',
  MATHS_SCIENCE = 'Maths & Science',
  MOTOR_SKILLS = 'Motor Skills',
  IMAGINATION = 'Imagination',
}

export enum AgeGroup {
  ALL = 'All Ages',
  AGE_3_5 = '3–5 Years',
  AGE_6_8 = '6–8 Years',
  AGE_9_11 = '9–11 Years',
  AGE_12_15 = '12–15 Years',
}

export enum GiftOccasion {
  ALL = 'All Occasions',
  BIRTHDAY = 'Birthday',
  FESTIVALS = 'Festivals & Diwali',
  HOUSEWARMING = 'Housewarming',
  DESK_COLLEGE = 'Desk & College',
  EVERYDAY = 'Everyday Use',
}

export type ThemeMode = 'daylight' | 'aurora';

export type SortOption = 'featured' | 'price-asc' | 'price-desc';

export type PaymentMethod = 'upi' | 'card' | 'cod';

export type StorePage =
  | 'home'
  | 'shop'
  | 'gifts'
  | 'product'
  | 'checkout'
  | 'about'
  | 'contact'
  | 'account'
  | 'manager';

export interface ProductAngle {
  id: 'front' | 'mechanism' | 'scale';
  label: string;
  shortLabel: string;
  url: string;
  objectPosition?: string;
}

export interface Product {
  id: string;
  title: string;
  category: Exclude<ProductCategory, ProductCategory.ALL>;
  ageGroup: Exclude<AgeGroup, AgeGroup.ALL>;
  originConcept: string;
  occasion: Exclude<GiftOccasion, GiftOccasion.ALL>;
  price: number;
  compareAtPrice?: number;
  image: string;
  gallery: [ProductAngle, ProductAngle, ProductAngle];
  variants: string[];
  shortSpec: string;
  description: string;
  useCaseHi: string;
  brainBenefitsHi: string;
  whyParentsBuyHi: string;
  materials: string;
  dimensions: string;
  inStock: boolean;
  featured?: boolean;
  tag?: string;
}

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  image: string;
  variant: string;
  quantity: number;
  category: string;
}

export interface CheckoutFormValues {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  paymentMethod: PaymentMethod;
  giftWrap: boolean;
  giftMessage: string;
  promoCode: string;
}

export interface CheckoutErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
}

export type OrderStatus =
  | 'Confirmed'
  | 'Preparing Shipment'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface OrderRecord {
  orderNumber: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  giftWrapFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pinCode: string;
  };
  giftWrap: boolean;
  giftMessage: string;
  status: OrderStatus;
}

export interface CustomerInquiry {
  id: string;
  createdAt: string;
  name: string;
  contact: string;
  topic: string;
  message: string;
  status: 'New' | 'Resolved';
}

export interface StoreSettings {
  whatsappNumber: string;
  supportEmail: string;
  announcementText: string;
  freeShippingThreshold: number;
  promoCode: string;
  promoDiscountPercent: number;
}

export interface Testimonial {
  id: string;
  customerName: string;
  cityOrRole: string;
  productName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback: string;
  createdAt: string;
}

export interface TestimonialFormValues {
  customerName: string;
  cityOrRole: string;
  productName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback: string;
}

export interface TestimonialErrors {
  customerName?: string;
  cityOrRole?: string;
  feedback?: string;
}

export type AddressLabel = 'Home' | 'Work' | 'Other';

export interface SavedAddress {
  id: string;
  label: AddressLabel;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault: boolean;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  passwordHash?: string;
  preferredPayment: PaymentMethod;
  celebrationMonth?: string;
  createdAt: string;
  addresses: SavedAddress[];
  wishlistIds: string[];
}

export interface SavedAddressErrors {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
}

export interface OrderNotificationChannelResult {
  channel: 'sms' | 'email';
  target: string;
  status: 'sent' | 'preview' | 'failed';
  provider: string;
  detail: string;
  previewText: string;
  invoiceFilename?: string;
}

export interface OrderNotificationDispatchResult {
  orderNumber: string;
  dispatchedAt: string;
  sms: OrderNotificationChannelResult;
  email: OrderNotificationChannelResult;
}
