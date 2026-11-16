import type {
  CustomerMessageRecord,
  CustomerMessageStatus,
  CustomerMessageTopic,
  ProductReviewRecord,
  ProductReviewStatus,
} from '../types';
import { normalizeIndianPhone10 } from './storeLogic';

export const CUSTOMER_MESSAGE_TOPICS: CustomerMessageTopic[] = [
  'Order Status Inquiry',
  'Custom 3D Print / Gift Request',
  'Bulk / School Order',
  'Product Feedback',
  'General Note',
];

export const CUSTOMER_MESSAGE_STATUSES: CustomerMessageStatus[] = [
  'Unread',
  'Read',
  'Replied / Resolved',
  'Archived',
];

export const PRODUCT_REVIEW_STATUSES: ProductReviewStatus[] = ['Published', 'Pending', 'Hidden'];

export interface CustomerNoteFormInput {
  customerName: string;
  phone: string;
  email?: string;
  topic: CustomerMessageTopic | string;
  message: string;
}

export interface CustomerNoteFormErrors {
  customerName?: string;
  phone?: string;
  email?: string;
  topic?: string;
  message?: string;
}

export function validateCustomerNoteForm(input: CustomerNoteFormInput): {
  valid: boolean;
  normalizedPhone: string;
  errors: CustomerNoteFormErrors;
} {
  const errors: CustomerNoteFormErrors = {};
  const cleanName = input.customerName.trim();
  const phone10 = normalizeIndianPhone10(input.phone);
  const cleanEmail = (input.email ?? '').trim();
  const cleanMessage = input.message.trim();

  if (cleanName.length < 2) {
    errors.customerName = 'Please enter your full name (min 2 characters).';
  }

  if (!/^[6-9]\d{9}$/.test(phone10)) {
    errors.phone = 'Enter a valid 10-digit Indian WhatsApp/mobile number.';
  }

  if (cleanEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    errors.email = 'Please enter a valid email address or leave this field blank.';
  }

  if (!input.topic || !input.topic.trim()) {
    errors.topic = 'Please choose a topic.';
  }

  if (cleanMessage.length < 5) {
    errors.message = 'Please write at least 5 characters in your note.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    normalizedPhone: phone10,
    errors,
  };
}

export interface ProductReviewFormInput {
  customerName: string;
  customerContact: string;
  productId: string;
  productName: string;
  rating: number;
  comment: string;
  photoUrl?: string;
}

export interface ProductReviewFormErrors {
  customerName?: string;
  customerContact?: string;
  productId?: string;
  rating?: string;
  comment?: string;
  photoUrl?: string;
}

export function validateProductReviewForm(input: ProductReviewFormInput): {
  valid: boolean;
  errors: ProductReviewFormErrors;
} {
  const errors: ProductReviewFormErrors = {};
  const cleanName = input.customerName.trim();
  const cleanContact = input.customerContact.trim();
  const contactDigits = normalizeIndianPhone10(cleanContact);
  const isPhone = /^[6-9]\d{9}$/.test(contactDigits) && !cleanContact.includes('@');
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanContact);
  const cleanComment = input.comment.trim();
  const cleanPhoto = (input.photoUrl ?? '').trim();

  if (cleanName.length < 2) {
    errors.customerName = 'Please enter your name.';
  }

  if (!isPhone && !isEmail) {
    errors.customerContact = 'Enter a valid 10-digit mobile number or email address.';
  }

  if (!input.productId.trim() || !input.productName.trim()) {
    errors.productId = 'Please select a BEE4 product.';
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.rating = 'Select a star rating between 1 and 5.';
  }

  if (cleanComment.length < 10) {
    errors.comment = 'Please share at least 10 characters about your experience.';
  }

  if (
    cleanPhoto.length > 0 &&
    !/^https?:\/\/|^\/|^data:image\//i.test(cleanPhoto)
  ) {
    errors.photoUrl = 'Enter a valid image URL starting with https:// or /.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function computeMessageInboxKpis(messages: CustomerMessageRecord[]): {
  totalNotes: number;
  unreadCount: number;
  customPrintAndGiftCount: number;
  resolvedCount: number;
} {
  let unreadCount = 0;
  let customPrintAndGiftCount = 0;
  let resolvedCount = 0;

  for (const m of messages) {
    if (m.status === 'Unread') unreadCount += 1;
    if (m.status === 'Replied / Resolved') resolvedCount += 1;
    if (
      m.topic === 'Custom 3D Print / Gift Request' ||
      m.topic === 'Bulk / School Order'
    ) {
      customPrintAndGiftCount += 1;
    }
  }

  return {
    totalNotes: messages.length,
    unreadCount,
    customPrintAndGiftCount,
    resolvedCount,
  };
}

export function computeReviewManagerKpis(reviews: ProductReviewRecord[]): {
  averageRating: number;
  totalReviews: number;
  pendingCount: number;
  featuredCount: number;
  publishedCount: number;
} {
  const published = reviews.filter((r) => r.status === 'Published');
  const pendingCount = reviews.filter((r) => r.status === 'Pending').length;
  const featuredCount = reviews.filter(
    (r) => r.status === 'Published' && r.featuredOnHomepage
  ).length;

  const scoreSource = published.length > 0 ? published : reviews;
  const averageRating =
    scoreSource.length > 0
      ? Math.round(
          (scoreSource.reduce((sum, r) => sum + r.rating, 0) / scoreSource.length) * 10
        ) / 10
      : 0;

  return {
    averageRating,
    totalReviews: reviews.length,
    pendingCount,
    featuredCount,
    publishedCount: published.length,
  };
}

export function getPublishedReviewsForProduct(
  reviews: ProductReviewRecord[],
  productId: string,
  productTitle?: string
): ProductReviewRecord[] {
  const cleanTitle = (productTitle ?? '').trim().toLowerCase();
  return reviews
    .filter((r) => {
      if (r.status !== 'Published') return false;
      if (r.productId === productId) return true;
      return cleanTitle.length > 0 && r.productName.trim().toLowerCase() === cleanTitle;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function computeProductRatingStats(
  reviews: ProductReviewRecord[],
  productId: string,
  productTitle?: string
): { averageRating: number; reviewCount: number } {
  const published = getPublishedReviewsForProduct(reviews, productId, productTitle);
  if (published.length === 0) {
    return { averageRating: 0, reviewCount: 0 };
  }
  const sum = published.reduce((acc, r) => acc + r.rating, 0);
  return {
    averageRating: Math.round((sum / published.length) * 10) / 10,
    reviewCount: published.length,
  };
}

export function getPublishedHomepageReviews(
  reviews: ProductReviewRecord[]
): ProductReviewRecord[] {
  return reviews
    .filter((r) => r.status === 'Published')
    .sort((a, b) => {
      if (a.featuredOnHomepage !== b.featuredOnHomepage) {
        return a.featuredOnHomepage ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function calculateMessagesReviewsBadgeCount(
  messages: CustomerMessageRecord[],
  reviews: ProductReviewRecord[]
): number {
  const unread = messages.filter((m) => m.status === 'Unread').length;
  const pending = reviews.filter((r) => r.status === 'Pending').length;
  return unread + pending;
}

export function buildMessageWhatsAppReplyUrl(msg: CustomerMessageRecord): string {
  const digits = normalizeIndianPhone10(msg.phone);
  const target = /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : digits;
  const text = `Namaste ${msg.customerName}! Team BEE4 (bee4.in, Banka) here regarding your "${msg.topic}" note: "${msg.message.slice(0, 90)}${msg.message.length > 90 ? '...' : ''}". How can we help you today?`;
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}

export function buildMessageMailtoUrl(msg: CustomerMessageRecord): string | null {
  const email = (msg.email ?? '').trim();
  if (!email) return null;
  const subject = `Re: ${msg.topic} — Team BEE4 (bee4.in)`;
  const body = `Hi ${msg.customerName},\n\nThank you for reaching out to BEE4 Studio regarding "${msg.topic}".\n\n---\nYour note:\n${msg.message}\n\nWarm regards,\nTeam BEE4 (bee4.in · Banka, Bihar)`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
