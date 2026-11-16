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

export type PrimaryStoreCategory =
  | 'Brain-Training Toys'
  | '3D Home Decor'
  | 'Stainless Steel Flasks'
  | 'Lifestyle Gear';

export type HsnCode = '3926' | '7323' | '4202';

export type ProductVisibilityStatus = 'Active' | 'Draft' | 'Archived';

export type ThemeMode = 'daylight' | 'aurora';

export type SortOption = 'featured' | 'price-asc' | 'price-desc';

export type PaymentMethod = 'upi' | 'card' | 'cod';

export type AdminModuleRoute =
  | 'dashboard'
  | 'orders'
  | 'returns'
  | 'messages-reviews'
  | 'products'
  | 'inventory'
  | 'discounts'
  | 'customers'
  | 'settings';

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
  sku?: string;
  slug?: string;
  title: string;
  primaryCategory?: PrimaryStoreCategory;
  category: Exclude<ProductCategory, ProductCategory.ALL>;
  skills?: Exclude<ProductCategory, ProductCategory.ALL>[];
  ageGroup: Exclude<AgeGroup, AgeGroup.ALL>;
  ageGroups?: Exclude<AgeGroup, AgeGroup.ALL>[];
  originConcept: string;
  occasion: Exclude<GiftOccasion, GiftOccasion.ALL>;
  price: number;
  compareAtPrice?: number;
  manufacturingCost?: number;
  image: string;
  gallery: [ProductAngle, ProductAngle, ProductAngle];
  variants: string[];
  shortSpec: string;
  description: string;
  useCaseHi: string;
  brainBenefitsHi: string;
  whyParentsBuyHi: string;
  materials: string;
  careInstruction?: string;
  dimensions: string;
  weightGrams?: number;
  hsnCode?: HsnCode;
  stockQuantity?: number;
  lowStockThreshold?: number;
  giftable?: boolean;
  madeToOrder?: boolean;
  status?: ProductVisibilityStatus;
  damagedScrapCount?: number;
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

export type FulfillmentStage =
  | 'New / Unverified'
  | 'Confirmed'
  | 'Printing / Packing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'RTO / Return';

export type OrderChannel = 'UPI / Prepaid' | 'COD' | 'WhatsApp Order';

export interface OrderRecord {
  orderNumber: string;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  giftWrapFee: number;
  codFee?: number;
  total: number;
  paymentMethod: PaymentMethod;
  orderChannel?: OrderChannel;
  couponCode?: string;
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
  fulfillmentStage?: FulfillmentStage;
  courierPartner?: string;
  awbNumber?: string;
  trackingUrl?: string;
  internalNotes?: string;
  refundStatus?: 'None' | 'Partially Refunded' | 'Refunded';
  refundedAmount?: number;
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

export type CustomerMessageTopic =
  | 'Order Status Inquiry'
  | 'Custom 3D Print / Gift Request'
  | 'Bulk / School Order'
  | 'Product Feedback'
  | 'General Note';

export type CustomerMessageStatus = 'Unread' | 'Read' | 'Replied / Resolved' | 'Archived';

export interface CustomerMessageRecord {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  topic: CustomerMessageTopic | string;
  message: string;
  status: CustomerMessageStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductReviewStatus = 'Published' | 'Pending' | 'Hidden';

export interface ProductReviewRecord {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerContact?: string;
  cityOrRole?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  photoUrl?: string;
  verifiedBuyer: boolean;
  featuredOnHomepage: boolean;
  status: ProductReviewStatus;
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  whatsappNumber: string;
  supportEmail: string;
  announcementText: string;
  announcementEnabled?: boolean;
  heroHeadline?: string;
  heroSubheadline?: string;
  heroCtaText?: string;
  featuredBannerEnabled?: boolean;
  visibleCategories?: PrimaryStoreCategory[];
  freeShippingThreshold: number;
  standardShippingFee?: number;
  codHandlingFee?: number;
  giftWrapFee?: number;
  giftWrapEnabled?: boolean;
  upiEnabled?: boolean;
  codEnabled?: boolean;
  whatsappOrderEnabled?: boolean;
  upiVpa?: string;
  promoCode: string;
  promoDiscountPercent: number;
  giftFinderWeights?: Record<Exclude<GiftOccasion, GiftOccasion.ALL>, number>;
}

export type CouponDiscountType = 'percentage' | 'flat';

export interface CouponRecord {
  id: string;
  code: string;
  description: string;
  discountType: CouponDiscountType;
  value: number;
  minOrderValue: number;
  prepaidOnly: boolean;
  usageLimit: number;
  usedCount: number;
  expiresAt: string;
  active: boolean;
}

export type PrintJobStage = 'Queued' | 'Printing' | 'Quality Check' | 'Ready to Pack';

export interface PrintJobRecord {
  id: string;
  productId: string;
  productTitle: string;
  orderNumber?: string;
  batchQty: number;
  material: string;
  estimatedGrams: number;
  stage: PrintJobStage;
  printerName: string;
  updatedAt: string;
}

export interface FilamentSpool {
  id: string;
  name: string;
  material: 'Eco-PLA' | 'Matte Bio-PLA+' | 'PETG' | 'TPU';
  colorHex: string;
  colorName: string;
  remainingGrams: number;
  capacityGrams: number;
  costPerKg: number;
  gramsPerToyAvg: number;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  entityType:
    | 'order'
    | 'rma'
    | 'message'
    | 'review'
    | 'product'
    | 'inventory'
    | 'coupon'
    | 'settings'
    | 'customer'
    | 'auth';
  entityId: string;
  summary: string;
}

export type ReturnReason =
  | 'Damaged in Transit'
  | 'Missing 3D Puzzle Piece / Part'
  | 'Heat Warping During Delivery (>55°C exposure)'
  | 'Wrong Item Received'
  | 'Quality / Finish Issue'
  | 'Other';

export type ReturnResolutionType =
  | 'Free Instant Replacement'
  | 'Instant Store Credit Coupon (+10% Bonus Value)'
  | 'Refund to Original Payment / UPI ID';

export type ReturnRequestStatus =
  | 'Return Requested'
  | 'Approved — Reverse Pickup Scheduled'
  | 'Rejected'
  | 'Item Received at Banka Hub (Pending QC)'
  | 'QC Passed — Restocked to Inventory'
  | 'QC Failed — Damaged / Scrap PLA (Do Not Restock)'
  | 'Replacement Dispatched'
  | 'Refund Completed';

export type RefundMode = 'UPI Transfer' | 'Original Source' | 'Store Credit Coupon';

export interface ReturnItemEntry {
  productId: string;
  title: string;
  variant: string;
  quantity: number;
  unitPrice: number;
  image: string;
}

export interface ReturnRequestRecord {
  id: string;
  rmaNumber: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  orderPaymentMethod: PaymentMethod;
  orderTotal: number;
  items: ReturnItemEntry[];
  reason: ReturnReason;
  resolutionType: ReturnResolutionType;
  customerComments: string;
  proofImages: string[];
  refundUpiId?: string;
  refundBankAccount?: string;
  refundBankIfsc?: string;
  status: ReturnRequestStatus;
  rejectionReason?: string;
  adminNote?: string;
  reverseCourier?: string;
  reverseAwb?: string;
  replacementAwb?: string;
  autoRestockEnabled: boolean;
  isRestocked: boolean;
  scrapRecorded?: boolean;
  replacementPrintQueued?: boolean;
  refundAmount?: number;
  refundMode?: RefundMode;
  refundUtr?: string;
  issuedCouponCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryAdjustmentRecord {
  id: string;
  timestamp: string;
  productId: string;
  productTitle: string;
  sku?: string;
  delta: number;
  adjustmentType: 'rma_restock' | 'rma_scrap' | 'manual_adjust';
  referenceId: string;
  note: string;
}

export type CrmCustomerFlag = 'VIP' | 'Standard' | 'High-Risk RTO';

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
  crmFlag?: CrmCustomerFlag;
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
