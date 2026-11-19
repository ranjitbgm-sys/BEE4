import type {
  CouponRecord,
  CustomerProfile,
  OrderRecord,
  Product,
  StoreSettings,
  SupportMessageRecord,
  SupportTicketRecord,
  SupportTicketStatus,
} from '../types';
import { formatINR } from './storeLogic';

export const SUPPORT_QUICK_CHIPS = [
  'Track My Order',
  'Return / Damaged Item',
  'Custom Photo Help',
  'Talk to Executive',
] as const;

export type AdminSupportFilter =
  | 'All'
  | 'Open / Needs Executive'
  | 'AI Handled'
  | 'Closed / Resolved';

export interface AiSupportReplyResult {
  replyText: string;
  suggestExecutiveHandoff: boolean;
  detectedTopic: string;
  linkedOrderNumber?: string;
}

export interface SupportDeskKpis {
  total: number;
  openNeedsExecutive: number;
  aiHandled: number;
  closed: number;
  ratedCount: number;
  averageRating: number;
}

export function generateSupportTokenNumber(
  existingTickets: Pick<SupportTicketRecord, 'tokenNumber'>[]
): string {
  const used = new Set(existingTickets.map((t) => t.tokenNumber.trim().toUpperCase()));
  let maxNum = 1041;
  for (const t of existingTickets) {
    const match = /^TKT-BEE4-(\d+)$/i.exec(t.tokenNumber.trim());
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }
  let candidateNum = maxNum + 1;
  let candidate = `TKT-BEE4-${candidateNum}`;
  while (used.has(candidate)) {
    candidateNum += 1;
    candidate = `TKT-BEE4-${candidateNum}`;
  }
  return candidate;
}

export function isTicketOpenForExecutive(ticket: Pick<SupportTicketRecord, 'status' | 'needsExecutive'>): boolean {
  if (ticket.status === 'Closed') return false;
  return (
    ticket.status === 'Open' ||
    ticket.status === 'Waiting for Executive' ||
    Boolean(ticket.needsExecutive)
  );
}

export function generateAiSupportReply(input: {
  query: string;
  customer: CustomerProfile | null;
  customerOrders: OrderRecord[];
  products: Product[];
  settings: StoreSettings;
  coupons: CouponRecord[];
}): AiSupportReplyResult {
  const raw = input.query.trim();
  const q = raw.toLowerCase();
  const firstName =
    input.customer?.firstName?.trim() ||
    input.customer?.fullName?.trim().split(/\s+/)[0] ||
    'there';

  const sortedOrders = [...input.customerOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 1. Explicit Executive Handoff Request
  if (
    /\b(talk to executive|human|executive|agent|representative|call me|speak to|raise.*token|raise.*ticket|escalate|manager|complaint)\b/i.test(
      q
    )
  ) {
    return {
      replyText:
        `Sure ${firstName}, I'll connect you with a BEE4 Support Executive right away. Tap "Raise Support Token / Chat with Executive" below to open a live priority token so our Banka studio team can reply directly in this chat.`,
      suggestExecutiveHandoff: true,
      detectedTopic: 'Executive Support Request',
      linkedOrderNumber: sortedOrders[0]?.orderNumber,
    };
  }

  // 2. Order Status / Tracking Lookup
  const orderIdMatch = raw.match(/\bBEE4-[A-Z0-9-]{3,}\b/i);
  if (
    orderIdMatch ||
    /\b(track|my order|order status|where is my|awb|courier|dispatch status|package status)\b/i.test(
      q
    )
  ) {
    const matchedOrder = orderIdMatch
      ? sortedOrders.find(
          (o) => o.orderNumber.toUpperCase() === orderIdMatch[0].toUpperCase()
        )
      : sortedOrders[0];

    if (matchedOrder) {
      const itemSummary = matchedOrder.items
        .map((it) => `${it.title}${it.quantity > 1 ? ` ×${it.quantity}` : ''}`)
        .join(', ');
      const awbLine = matchedOrder.awbNumber
        ? ` Courier: ${matchedOrder.courierPartner || 'Assigned Partner'} (AWB: ${matchedOrder.awbNumber}).`
        : '';
      const cancelLine =
        matchedOrder.status === 'Cancelled'
          ? ` Cancellation reason: ${matchedOrder.cancellationReason || 'Cancelled on request'}.`
          : ' Orders dispatch within 48 hours from our Banka, Bihar studio and deliver in 3–5 business days across Indian metros.';

      return {
        replyText:
          `Hi ${firstName}! Here is the live status of your order ${matchedOrder.orderNumber}:\n` +
          `• Status: ${matchedOrder.status}\n` +
          `• Items: ${itemSummary}\n` +
          `• Total: ${formatINR(matchedOrder.total)} (${matchedOrder.paymentMethod})${awbLine}${cancelLine}`,
        suggestExecutiveHandoff: false,
        detectedTopic: `Order Tracking (${matchedOrder.orderNumber})`,
        linkedOrderNumber: matchedOrder.orderNumber,
      };
    }

    return {
      replyText:
        `Hi ${firstName}, I don't see an active order linked to your BEE4 account yet${
          orderIdMatch ? ` matching ${orderIdMatch[0].toUpperCase()}` : ''
        }. If you placed an order as a guest or need help locating a shipment, tap "Raise Support Token / Chat with Executive" and share your order number or phone.`,
      suggestExecutiveHandoff: true,
      detectedTopic: 'Order Tracking Help',
    };
  }

  // 3. Returns, Damaged Item, Missing Part, Refund
  if (
    /\b(return|damage|damaged|broken|replace|replacement|refund|missing|defect|warped|rma|wrong item)\b/i.test(
      q
    )
  ) {
    return {
      replyText:
        `We back every BEE4 order with a 7-Day Hassle-Free Return & Free Replacement Guarantee.\n` +
        `• If an item arrives damaged, heat-warped, or missing a puzzle part, open "My Orders" and tap "Return / Replace (7 Days)" with a quick unboxing photo.\n` +
        `• Choose a Free Instant Replacement, +10% Bonus BEE4 Wallet / Store Credit, or Refund to your original UPI/payment mode.\n` +
        `Need an executive to expedite your replacement right now? Raise a Support Token below.`,
      suggestExecutiveHandoff: true,
      detectedTopic: 'Return / Damaged Item',
      linkedOrderNumber: sortedOrders[0]?.orderNumber,
    };
  }

  // 4. Custom Photo, Lithophane, Engraving, Embosser Help
  if (
    /\b(custom|photo|lithophane|engrav|emboss|upload|personaliz|image|logo|bulk|school)\b/i.test(q)
  ) {
    return {
      replyText:
        `Here's how custom 3D orders work on BEE4:\n` +
        `• Custom Photos / Lithophane Frames & Embossers: Go to My Account → "Custom 3D Design Uploads" to upload a bright, high-resolution JPG/PNG photo or add engraving text.\n` +
        `• For best lithophane contrast, choose a clear close-up photo with good lighting.\n` +
        `• Our Banka design desk reviews every custom file before printing (dispatches within 48 hrs after approval). Need custom sizing or school/bulk pricing? Raise a Support Token to chat directly with our studio executive.`,
      suggestExecutiveHandoff: true,
      detectedTopic: 'Custom Photo / 3D Print Help',
    };
  }

  // 5. Eco-PLA Care & 55°C Heat Safety
  if (
    /\b(pla|eco-pla|bio-pla|55|heat|melt|wash|clean|care|safe|toxic|sunlight|dishwasher|material)\b/i.test(
      q
    )
  ) {
    return {
      replyText:
        `BEE4 3D-printed toys & crafts are made from certified non-toxic, plant-based Eco-PLA / Bio-PLA+ polymer with smooth child-safe edges:\n` +
        `• Heat Care: Keep away from temperatures above 55°C (avoid hot car dashboards, boiling water, direct harsh afternoon sun, or dishwashers).\n` +
        `• Cleaning: Wipe gently with a cool damp cloth and mild soap, then air-dry.\n` +
        `• Zero batteries required — designed for safe, screen-free hands-on play.`,
      suggestExecutiveHandoff: false,
      detectedTopic: 'Eco-PLA Material & Care',
    };
  }

  // 6. Coupons, Discounts, SMARTKID15, Gift Cards & Wallet
  if (
    /\b(coupon|discount|promo|offer|smartkid15|code|gift card|voucher|wallet|cashback)\b/i.test(q)
  ) {
    const activeCoupons = input.coupons.filter((c) => c.active);
    const smartKid =
      activeCoupons.find((c) => c.code.toUpperCase() === 'SMARTKID15') ||
      activeCoupons.find(
        (c) => c.code.toUpperCase() === (input.settings.promoCode || '').toUpperCase()
      ) ||
      activeCoupons[0];

    const promoLine = smartKid
      ? `Use code ${smartKid.code} at checkout for ${
          smartKid.discountType === 'flat'
            ? `${formatINR(smartKid.value)} OFF`
            : `${smartKid.value}% OFF`
        }${smartKid.minOrderValue > 0 ? ` on orders above ${formatINR(smartKid.minOrderValue)}` : ''}.`
      : `Use code ${input.settings.promoCode || 'SMARTKID15'} at checkout for ${
          input.settings.promoDiscountPercent || 15
        }% OFF!`;

    const walletBal = input.customer?.walletBalance ?? 0;
    return {
      replyText:
        `Active BEE4 savings for you:\n` +
        `• Promo Code: ${promoLine}\n` +
        `• BEE4 Wallet & Gift Cards: Your current wallet balance is ${formatINR(walletBal)}. Redeem any 16-character BEE4 Gift Card inside "BEE4 Wallet & Gift Cards" for instant checkout credit.`,
      suggestExecutiveHandoff: false,
      detectedTopic: 'Coupons & Wallet',
    };
  }

  // 7. Shipping Timelines, Free Shipping, Payment Options
  if (
    /\b(ship|shipping|deliver|delivery|free shipping|dispatch|how long|days|cod|cash on delivery|upi|payment|pay)\b/i.test(
      q
    )
  ) {
    const threshold = input.settings.freeShippingThreshold ?? 499;
    const stdFee = input.settings.standardShippingFee ?? 49;
    return {
      replyText:
        `BEE4 Shipping & Payment Details:\n` +
        `• Dispatch: Every order is printed, QC-checked, and dispatched within 48 hours from Banka, Bihar.\n` +
        `• Delivery Time: 3–5 business days across Indian metros (5–7 days for remote pincodes).\n` +
        `• Shipping Fee: FREE India shipping on orders ${formatINR(threshold)}+ (flat ${formatINR(stdFee)} below ${formatINR(threshold)}).\n` +
        `• Payments: Direct UPI / QR, BEE4 Wallet, Cash on Delivery (COD), and WhatsApp Order.`,
      suggestExecutiveHandoff: false,
      detectedTopic: 'Shipping & Payments',
    };
  }

  // 8. Product-specific lookup from live catalog
  const matchedProduct = input.products.find(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      q.split(/\s+/).some((word) => word.length >= 4 && p.title.toLowerCase().includes(word))
  );
  if (matchedProduct) {
    return {
      replyText:
        `${matchedProduct.title} is currently ${
          matchedProduct.inStock ? 'In Stock' : 'Out of Stock'
        } at ${formatINR(matchedProduct.price)} (Recommended Age: ${matchedProduct.ageGroup}, Category: ${matchedProduct.category}).\n` +
        `• Material: ${matchedProduct.materials}\n` +
        `• Dimensions: ${matchedProduct.dimensions}\n` +
        `Need help with variants, gifting, or bulk quantities? Ask away or raise a Support Token below!`,
      suggestExecutiveHandoff: false,
      detectedTopic: `Product Query (${matchedProduct.title})`,
    };
  }

  // 9. Fallback — helpful guide + suggest Executive Handoff
  return {
    replyText:
      `Thanks for reaching out, ${firstName}! I can instantly help with:\n` +
      `• Tracking your latest BEE4 order\n` +
      `• 7-Day Return / Damaged Item replacements\n` +
      `• Custom photo uploads (Lithophanes & Embossers)\n` +
      `• Active coupons like ${input.settings.promoCode || 'SMARTKID15'}, shipping timelines & 55°C Eco-PLA care\n\n` +
      `If your query needs personal studio assistance, tap "Raise Support Token / Chat with Executive" below and a BEE4 Executive will join this chat.`,
    suggestExecutiveHandoff: true,
    detectedTopic: 'General Support',
  };
}

export function computeSupportDeskKpis(tickets: SupportTicketRecord[]): SupportDeskKpis {
  let openNeedsExecutive = 0;
  let aiHandled = 0;
  let closed = 0;
  let ratingSum = 0;
  let ratedCount = 0;

  for (const t of tickets) {
    if (t.status === 'Closed') {
      closed += 1;
    } else if (isTicketOpenForExecutive(t)) {
      openNeedsExecutive += 1;
    } else {
      aiHandled += 1;
    }
    if (typeof t.satisfactionRating === 'number' && t.satisfactionRating >= 1 && t.satisfactionRating <= 5) {
      ratingSum += t.satisfactionRating;
      ratedCount += 1;
    }
  }

  return {
    total: tickets.length,
    openNeedsExecutive,
    aiHandled,
    closed,
    ratedCount,
    averageRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : 0,
  };
}

export function filterSupportTickets(
  tickets: SupportTicketRecord[],
  filter: AdminSupportFilter,
  search: string
): SupportTicketRecord[] {
  const q = search.trim().toLowerCase();
  return tickets
    .filter((t) => {
      if (filter === 'Open / Needs Executive' && !isTicketOpenForExecutive(t)) return false;
      if (filter === 'AI Handled' && (t.status === 'Closed' || isTicketOpenForExecutive(t))) {
        return false;
      }
      if (filter === 'Closed / Resolved' && t.status !== 'Closed') return false;
      if (q) {
        const hay = [
          t.tokenNumber,
          t.customerName,
          t.customerPhone || '',
          t.customerEmail || '',
          t.subject,
          t.linkedOrderNumber || '',
          t.lastMessagePreview || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function mergeSupportMessages(
  existing: SupportMessageRecord[],
  incoming: SupportMessageRecord[]
): SupportMessageRecord[] {
  const byId = new Map<string, SupportMessageRecord>();
  for (const msg of existing) {
    if (msg?.id) byId.set(msg.id, msg);
  }
  for (const msg of incoming) {
    if (msg?.id) byId.set(msg.id, msg);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function formatSupportStatusLabel(status: SupportTicketStatus): string {
  switch (status) {
    case 'Waiting for Executive':
      return 'Open · Waiting for Executive';
    case 'Open':
      return 'Open';
    case 'AI Handled':
      return 'AI Handled';
    case 'Closed':
      return 'Closed · Resolved';
  }
}

export function buildSupportTicketWhatsAppUrl(
  ticket: SupportTicketRecord,
  fallbackStorePhone: string
): string {
  const digits = (ticket.customerPhone || '').replace(/\D/g, '');
  const phone =
    digits.length === 10
      ? `91${digits}`
      : digits.length >= 11
        ? digits
        : fallbackStorePhone.replace(/\D/g, '') || '919800004004';
  const greeting = `Hi ${ticket.customerName || 'there'}, this is Team BEE4 following up on your Support Token #${ticket.tokenNumber} (${ticket.subject}). How can we help further?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(greeting)}`;
}
