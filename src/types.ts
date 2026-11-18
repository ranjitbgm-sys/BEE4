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

export type PaymentMethod =
  | 'upi'
  | 'card'
  | 'cod'
  | 'COD'
  | 'UPI / Prepaid'
  | 'BEE4 Wallet';

export type PaymentStatus =
  | 'Pending (Collect on Delivery)'
  | 'Paid'
  | 'Partially Paid'
  | 'Refunded';

export type CancelledByRole = 'Customer' | 'Admin';

export type AdminModuleRoute =
  | 'dashboard'
  | 'integrations'
  | 'orders'
  | 'returns'
  | 'automations'
  | 'reconciliation'
  | 'analytics'
  | 'messages-reviews'
  | 'reels'
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
  | 'cart'
  | 'orders'
  | 'order-detail'
  | 'wallet'
  | 'about'
  | 'contact'
  | 'legal-terms'
  | 'legal-privacy'
  | 'legal-returns'
  | 'legal-shipping'
  | 'legal-copyright'
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
  cogsCost?: number;
  filamentCostInr?: number;
  reserveForWebsite?: number;
  marketplaceListings?: MarketplaceListingMap[];
  curatedTags?: ('Best Selling' | 'Newly Launched' | 'Trendy')[];
  inStock: boolean;
  featured?: boolean;
  tag?: string;
}

export type MarketplaceChannel =
  | 'bee4.in'
  | 'Flipkart'
  | 'Amazon'
  | 'Meesho'
  | 'Myntra'
  | 'Ajio'
  | 'Snapdeal'
  | 'WhatsApp';

export type CourierPartnerId =
  | 'Shiprocket'
  | 'Delhivery'
  | 'BlueDart'
  | 'India Post'
  | 'Xpressbees';

export interface MarketplaceListingMap {
  id: string;
  channel: MarketplaceChannel;
  remoteSkuOrAsin: string;
  listingId?: string;
  packMultiplier: number;
  channelStockOverride?: number | null;
  active: boolean;
}

export interface MarketplaceIntegrationConfig {
  id: string;
  key: string;
  name: string;
  category: 'website' | 'marketplace' | 'courier';
  active: boolean;
  sellerId: string;
  apiKey: string;
  webhookUrl: string;
  notes?: string;
  lastSyncedAt?: string;
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
  | 'Pending'
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

export type OperationalOrderBucket =
  | 'New / Upcoming'
  | 'Ready for Process'
  | 'Pending Label Generation'
  | 'Pending Courier Handover'
  | 'Shipped / In Transit'
  | 'Delivered'
  | 'Cancelled / RTO';

export interface PackingVerificationProof {
  verifiedSku: string;
  verifiedAwb: string;
  photoUrl?: string;
  verifiedAt: string;
  verifiedBy: string;
  weightGramsActual?: number;
}

export interface OrderSettlementRecord {
  commissionFee: number;
  paymentGatewayFee: number;
  shippingCharged: number;
  chargedWeightGrams?: number;
  expectedPayout: number;
  actualSettlementReceived: number;
  settledAt?: string;
  utrNumber?: string;
  bankDeposited?: boolean;
}

export interface OrderRecord {
  orderNumber: string;
  userId?: string | null;
  createdAt: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  giftWrapFee: number;
  codFee?: number;
  total: number;
  walletAmountUsed?: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  orderChannel?: OrderChannel;
  sourceChannel?: MarketplaceChannel;
  externalOrderId?: string;
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
  cancellationReason?: string;
  cancelledBy?: CancelledByRole;
  cancelledAt?: string;
  deliveredAt?: string;
  fulfillmentStage?: FulfillmentStage;
  operationalBucket?: OperationalOrderBucket;
  slaDispatchBy?: string;
  labelGeneratedAt?: string;
  picklistGeneratedAt?: string;
  courierPartner?: string;
  awbNumber?: string;
  trackingUrl?: string;
  internalNotes?: string;
  refundStatus?: 'None' | 'Partially Refunded' | 'Refunded';
  refundedAmount?: number;
  packingProof?: PackingVerificationProof;
  settlement?: OrderSettlementRecord;
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
  userId?: string | null;
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

export interface CustomerPanelControls {
  enableGiftCards: boolean;
  enableLanguageSwitcher: boolean;
  enableSelfServiceCancel: boolean;
  enableProductQa: boolean;
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
  customerPanelControls?: CustomerPanelControls;
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
  spoolId?: string;
  estimatedGrams: number;
  gramsUsed?: number;
  filamentCostInr?: number;
  stage: PrintJobStage;
  printerName: string;
  updatedAt: string;
}

export type PrinterBrand = 'Bambu Lab' | 'OctoPrint' | 'Klipper' | 'Moonraker' | 'Manual';

export interface PrinterIntegrationConfig {
  id: string;
  name: string;
  brand: PrinterBrand;
  active: boolean;
  printerSerialOrHost: string;
  apiKeyOrToken: string;
  webhookUrl: string;
  defaultSpoolId: string;
  lastSyncedAt?: string;
  notes?: string;
}

export interface ViralReelRecord {
  id: string;
  title: string;
  videoUrl: string;
  posterUrl?: string;
  productId: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
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
    | 'giftcard'
    | 'settings'
    | 'customer'
    | 'integration'
    | 'automation'
    | 'settlement'
    | 'qa'
    | 'auth';
  entityId: string;
  summary: string;
}

export type AutomationTrigger =
  | 'new_order_placed'
  | 'marketplace_csv_imported'
  | 'order_status_changed'
  | 'return_initiated'
  | 'stock_below_threshold';

export type AutomationConditionField =
  | 'always'
  | 'payment_method_eq'
  | 'source_channel_eq'
  | 'order_total_gte'
  | 'reason_contains'
  | 'state_eq';

export type AutomationActionType =
  | 'auto_accept_order'
  | 'assign_courier'
  | 'flag_crm_vip_or_rto'
  | 'send_to_print_queue'
  | 'generate_gst_label_ready'
  | 'file_spf_alert';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  conditionField: AutomationConditionField;
  conditionValue: string;
  actionType: AutomationActionType;
  actionValue: string;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
}

export interface MonthlyAdSpendRecord {
  id: string;
  month: string; // YYYY-MM
  channel: MarketplaceChannel | 'All Channels';
  amount: number;
  notes?: string;
  updatedAt: string;
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
  sourceChannel?: MarketplaceChannel;
  receivedAtHub?: boolean;
  receivedAtHubDate?: string;
  claimFiled?: boolean;
  claimFiledAt?: string;
  claimReferenceId?: string;
  qcOutcome?: 'Pending' | 'OK_Sellable' | 'Damaged_Unsellable';
  cancelledAfterLabel?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReturnBucket =
  | 'New Returns'
  | 'In Transit to Warehouse'
  | 'Cancelled Returns'
  | 'Cancelled After Label Print'
  | 'Received & QC Done'
  | 'Claim Filed (SPF)';

export interface InventoryAdjustmentRecord {
  id: string;
  timestamp: string;
  productId: string;
  productTitle: string;
  sku?: string;
  delta: number;
  adjustmentType: 'rma_restock' | 'rma_scrap' | 'manual_adjust' | 'cancel_restock';
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

export type AddressLabel = 'Home' | 'Work' | 'Gift' | 'Other';

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

export interface GiftCardRecord {
  id: string;
  code: string;
  pin: string;
  initialAmount: number;
  balance: number;
  purchaserUserId?: string | null;
  purchaserName: string;
  purchaserEmail: string;
  purchaserPhone?: string;
  recipientName: string;
  recipientEmail: string;
  message?: string;
  active: boolean;
  issuedReason?: 'Purchased' | 'Admin Promo' | 'Cancellation Credit';
  redeemedByUserId?: string | null;
  redeemedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface WalletTransactionRecord {
  id: string;
  type: 'credit_gift_card' | 'credit_refund' | 'debit_order' | 'credit_admin_bonus';
  amount: number;
  balanceAfter: number;
  referenceId: string;
  note: string;
  createdAt: string;
}

export interface CustomerCustomDesign {
  id: string;
  title: string;
  productType: 'Lithophane' | 'Embosser' | 'Custom 3D Print';
  imageUrl?: string;
  engravingText?: string;
  notes?: string;
  orderNumber?: string;
  createdAt: string;
}

export interface CustomerDeviceSession {
  id: string;
  deviceLabel: string;
  browser: string;
  platform: string;
  lastActiveAt: string;
  isCurrent?: boolean;
}

export interface CustomerNotificationPreferences {
  orderUpdates: boolean;
  returnAlerts: boolean;
  offersAndLaunches: boolean;
}

export type CustomerGender = 'Male' | 'Female' | 'Other';

export type CustomerAccountStatus = 'Active' | 'Suspended';

export interface ProductQuestionRecord {
  id: string;
  userId?: string | null;
  productId: string;
  productName: string;
  customerName: string;
  customerContact?: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  status: 'Pending' | 'Answered';
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  gender?: CustomerGender;
  avatarUrl?: string;
  phone: string;
  email: string;
  emailVerified?: boolean;
  emailConfirmedAt?: string;
  passwordHash?: string;
  preferredPayment: PaymentMethod;
  preferredLanguage?: 'en' | 'hi';
  notificationPreferences?: CustomerNotificationPreferences;
  savedUpiIds?: string[];
  devices?: CustomerDeviceSession[];
  accountStatus?: CustomerAccountStatus;
  banType?: 'temporary' | 'permanent' | null;
  bannedUntil?: string | null;
  banReason?: string | null;
  bannedAt?: string | null;
  deactivationRequested?: boolean;
  deactivationRequestedAt?: string;
  forceLoggedOutAt?: string;
  celebrationMonth?: string;
  crmFlag?: CrmCustomerFlag;
  walletBalance?: number;
  walletTransactions?: WalletTransactionRecord[];
  customDesigns?: CustomerCustomDesign[];
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
