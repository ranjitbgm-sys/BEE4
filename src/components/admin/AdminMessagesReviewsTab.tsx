import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import {
  Archive,
  BadgeCheck,
  Check,
  CheckCheck,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Home,
  Inbox,
  Mail,
  MessageCircle,
  MessageSquare,
  Plus,
  Reply,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { uploadReviewPhotoToSupabaseStorage } from '../../services/supabaseStoreService';
import type {
  CustomerMessageRecord,
  CustomerMessageStatus,
  CustomerMessageTopic,
  Product,
  ProductQuestionRecord,
  ProductReviewRecord,
  ProductReviewStatus,
} from '../../types';
import {
  CUSTOMER_MESSAGE_STATUSES,
  CUSTOMER_MESSAGE_TOPICS,
  PRODUCT_REVIEW_STATUSES,
  buildMessageMailtoUrl,
  buildMessageWhatsAppReplyUrl,
  computeMessageInboxKpis,
  computeReviewManagerKpis,
} from '../../utils/messagesReviewsLogic';

interface AdminMessagesReviewsTabProps {
  messages: CustomerMessageRecord[];
  reviews: ProductReviewRecord[];
  productQuestions?: ProductQuestionRecord[];
  products: Product[];
  onUpdateMessage: (updated: CustomerMessageRecord) => void;
  onDeleteMessage: (id: string) => void;
  onBulkDeleteMessages: (ids: string[]) => void;
  onSaveReview: (review: ProductReviewRecord, isNew?: boolean) => void;
  onDeleteReview: (id: string) => void;
  onSaveQuestion?: (question: ProductQuestionRecord) => void;
  onDeleteQuestion?: (id: string) => void;
}

const STARS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

function messageStatusBadgeClass(status: CustomerMessageStatus): string {
  switch (status) {
    case 'Unread':
      return 'bg-amber-500/18 text-amber-800 dark:text-amber-300 border-amber-500/35';
    case 'Read':
      return 'bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30';
    case 'Replied / Resolved':
      return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
    case 'Archived':
      return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/25';
  }
}

function reviewStatusBadgeClass(status: ProductReviewStatus): string {
  switch (status) {
    case 'Published':
      return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
    case 'Pending':
      return 'bg-amber-500/18 text-amber-800 dark:text-amber-300 border-amber-500/35';
    case 'Hidden':
      return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/25';
  }
}

export function AdminMessagesReviewsTab({
  messages,
  reviews,
  productQuestions = [],
  products,
  onUpdateMessage,
  onDeleteMessage,
  onBulkDeleteMessages,
  onSaveReview,
  onDeleteReview,
  onSaveQuestion,
  onDeleteQuestion,
}: AdminMessagesReviewsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'messages' | 'reviews' | 'qa'>('messages');

  // --- Customer Messages Inbox state ---
  const [msgSearch, setMsgSearch] = useState('');
  const [msgStatusFilter, setMsgStatusFilter] = useState<'All' | CustomerMessageStatus>('All');
  const [msgTopicFilter, setMsgTopicFilter] = useState<'All' | string>('All');
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [activeMessage, setActiveMessage] = useState<CustomerMessageRecord | null>(null);
  const [msgEditDraft, setMsgEditDraft] = useState<{
    topic: CustomerMessageTopic | string;
    message: string;
    adminNote: string;
    status: CustomerMessageStatus;
  }>({
    topic: 'General Note',
    message: '',
    adminNote: '',
    status: 'Unread',
  });
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);

  // --- Product Reviews Manager state ---
  const [revSearch, setRevSearch] = useState('');
  const [revStarFilter, setRevStarFilter] = useState<'All' | '5' | '4' | '3' | 'low'>('All');
  const [revProductFilter, setRevProductFilter] = useState<string>('All');
  const [revStatusFilter, setRevStatusFilter] = useState<'All' | ProductReviewStatus>('All');
  const [confirmDeleteRevId, setConfirmDeleteRevId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption: string } | null>(null);

  // --- Review Add / Edit Modal state ---
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [revDraftCustomerName, setRevDraftCustomerName] = useState('');
  const [revDraftContact, setRevDraftContact] = useState('');
  const [revDraftCity, setRevDraftCity] = useState('');
  const [revDraftProductId, setRevDraftProductId] = useState(products[0]?.id ?? '');
  const [revDraftRating, setRevDraftRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [revDraftComment, setRevDraftComment] = useState('');
  const [revDraftPhotoUrl, setRevDraftPhotoUrl] = useState('');
  const [revDraftVerified, setRevDraftVerified] = useState(true);
  const [revDraftFeatured, setRevDraftFeatured] = useState(false);
  const [revDraftStatus, setRevDraftStatus] = useState<ProductReviewStatus>('Published');
  const [revDraftAdminReply, setRevDraftAdminReply] = useState('');
  const [revDraftError, setRevDraftError] = useState('');
  const [revUploadingPhoto, setRevUploadingPhoto] = useState(false);

  // --- Product Q&A state ---
  const [qaSearch, setQaSearch] = useState('');
  const [qaStatusFilter, setQaStatusFilter] = useState<'All' | 'Pending' | 'Answered'>('All');
  const [qaAnswerDrafts, setQaAnswerDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteQaId, setConfirmDeleteQaId] = useState<string | null>(null);

  const msgKpis = useMemo(() => computeMessageInboxKpis(messages), [messages]);
  const revKpis = useMemo(() => computeReviewManagerKpis(reviews), [reviews]);

  const pendingQaCount = useMemo(
    () => productQuestions.filter((q) => q.status === 'Pending').length,
    [productQuestions]
  );

  const filteredQuestions = useMemo(() => {
    const q = qaSearch.trim().toLowerCase();
    return productQuestions
      .filter((item) => {
        if (qaStatusFilter !== 'All' && item.status !== qaStatusFilter) return false;
        if (!q) return true;
        return [item.productName, item.customerName, item.question, item.answer || '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [productQuestions, qaSearch, qaStatusFilter]);

  const filteredMessages = useMemo(() => {
    const q = msgSearch.trim().toLowerCase();
    return messages
      .filter((m) => {
        if (msgStatusFilter !== 'All' && m.status !== msgStatusFilter) return false;
        if (msgTopicFilter !== 'All' && m.topic !== msgTopicFilter) return false;
        if (q) {
          const hay = [m.customerName, m.phone, m.email || '', m.topic, m.message, m.adminNote || '']
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [messages, msgSearch, msgStatusFilter, msgTopicFilter]);

  const filteredReviews = useMemo(() => {
    const q = revSearch.trim().toLowerCase();
    return reviews
      .filter((r) => {
        if (revStatusFilter !== 'All' && r.status !== revStatusFilter) return false;
        if (revProductFilter !== 'All' && r.productId !== revProductFilter) return false;
        if (revStarFilter === '5' && r.rating !== 5) return false;
        if (revStarFilter === '4' && r.rating !== 4) return false;
        if (revStarFilter === '3' && r.rating !== 3) return false;
        if (revStarFilter === 'low' && r.rating > 2) return false;
        if (q) {
          const hay = [r.customerName, r.productName, r.comment, r.cityOrRole || '', r.adminReply || '']
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reviews, revSearch, revStarFilter, revProductFilter, revStatusFilter]);

  const openMessageDrawer = (msg: CustomerMessageRecord) => {
    const autoRead: CustomerMessageRecord =
      msg.status === 'Unread'
        ? { ...msg, status: 'Read', updatedAt: new Date().toISOString() }
        : msg;
    if (msg.status === 'Unread') {
      onUpdateMessage(autoRead);
    }
    setActiveMessage(autoRead);
    setMsgEditDraft({
      topic: autoRead.topic,
      message: autoRead.message,
      adminNote: autoRead.adminNote ?? '',
      status: autoRead.status,
    });
    setConfirmDeleteMsgId(null);
  };

  const handleSaveMessageDrawer = (e: FormEvent) => {
    e.preventDefault();
    if (!activeMessage) return;
    const updated: CustomerMessageRecord = {
      ...activeMessage,
      topic: msgEditDraft.topic,
      message: msgEditDraft.message.trim() || activeMessage.message,
      adminNote: msgEditDraft.adminNote.trim(),
      status: msgEditDraft.status,
      updatedAt: new Date().toISOString(),
    };
    onUpdateMessage(updated);
    setActiveMessage(updated);
  };

  const handleToggleSelectMsg = (id: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setConfirmBulkDelete(false);
  };

  const handleToggleSelectAllFiltered = () => {
    const filteredIds = filteredMessages.map((m) => m.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedMessageIds.includes(id));
    if (allSelected) {
      setSelectedMessageIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedMessageIds(Array.from(new Set([...selectedMessageIds, ...filteredIds])));
    }
    setConfirmBulkDelete(false);
  };

  const openAddManualReviewModal = () => {
    setEditingReviewId(null);
    setRevDraftCustomerName('');
    setRevDraftContact('');
    setRevDraftCity('');
    setRevDraftProductId(products[0]?.id ?? '');
    setRevDraftRating(5);
    setRevDraftComment('');
    setRevDraftPhotoUrl('');
    setRevDraftVerified(true);
    setRevDraftFeatured(false);
    setRevDraftStatus('Published');
    setRevDraftAdminReply('');
    setRevDraftError('');
    setReviewModalOpen(true);
  };

  const openEditReviewModal = (rev: ProductReviewRecord) => {
    setEditingReviewId(rev.id);
    setRevDraftCustomerName(rev.customerName);
    setRevDraftContact(rev.customerContact ?? '');
    setRevDraftCity(rev.cityOrRole ?? '');
    setRevDraftProductId(rev.productId || products[0]?.id || '');
    setRevDraftRating(rev.rating);
    setRevDraftComment(rev.comment);
    setRevDraftPhotoUrl(rev.photoUrl ?? '');
    setRevDraftVerified(rev.verifiedBuyer);
    setRevDraftFeatured(rev.featuredOnHomepage);
    setRevDraftStatus(rev.status);
    setRevDraftAdminReply(rev.adminReply ?? '');
    setRevDraftError('');
    setReviewModalOpen(true);
  };

  const handleModalPhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRevUploadingPhoto(true);
    setRevDraftError('');
    try {
      const uploaded = await uploadReviewPhotoToSupabaseStorage(
        file,
        revDraftProductId || 'admin-review'
      );
      setRevDraftPhotoUrl(uploaded.url);
    } catch (err) {
      setRevDraftError(err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setRevUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSaveReviewModal = (e: FormEvent) => {
    e.preventDefault();
    if (revDraftCustomerName.trim().length < 2) {
      setRevDraftError('Customer Name must be at least 2 characters.');
      return;
    }
    if (revDraftComment.trim().length < 5) {
      setRevDraftError('Review comment must be at least 5 characters.');
      return;
    }

    const matchedProd = products.find((p) => p.id === revDraftProductId);
    const existing = editingReviewId ? reviews.find((r) => r.id === editingReviewId) : undefined;
    const now = new Date().toISOString();

    const record: ProductReviewRecord = {
      id: existing?.id ?? `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: matchedProd?.id ?? revDraftProductId ?? 'bee4-general',
      productName: matchedProd?.title ?? existing?.productName ?? 'BEE4 Brain-Training Toy',
      customerName: revDraftCustomerName.trim(),
      customerContact: revDraftContact.trim() || undefined,
      cityOrRole: revDraftCity.trim() || undefined,
      rating: revDraftRating,
      comment: revDraftComment.trim(),
      photoUrl: revDraftPhotoUrl.trim() || undefined,
      verifiedBuyer: revDraftVerified,
      featuredOnHomepage: revDraftFeatured,
      status: revDraftStatus,
      adminReply: revDraftAdminReply.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    onSaveReview(record, !existing);
    setReviewModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Hub Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Messages and Reviews sub-modules"
          className="inline-flex flex-wrap gap-1.5 p-1 rounded-2xl glass-subtle"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'messages'}
            onClick={() => setActiveSubTab('messages')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'messages' ? 'glass-btn-ink' : 'text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Customer Messages Inbox</span>
            {msgKpis.unreadCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                  activeSubTab === 'messages'
                    ? 'bg-amber-400 text-zinc-950'
                    : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                }`}
              >
                {msgKpis.unreadCount} unread
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'reviews'}
            onClick={() => setActiveSubTab('reviews')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'reviews' ? 'glass-btn-ink' : 'text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Product Reviews &amp; Ratings</span>
            {revKpis.pendingCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                  activeSubTab === 'reviews'
                    ? 'bg-amber-400 text-zinc-950'
                    : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                }`}
              >
                {revKpis.pendingCount} pending
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === 'qa'}
            onClick={() => setActiveSubTab('qa')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'qa' ? 'glass-btn-ink' : 'text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Product Q&amp;A</span>
            {pendingQaCount > 0 && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                  activeSubTab === 'qa'
                    ? 'bg-amber-400 text-zinc-950'
                    : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                }`}
              >
                {pendingQaCount} pending
              </span>
            )}
          </button>
        </div>

        {activeSubTab === 'reviews' && (
          <button
            type="button"
            onClick={openAddManualReviewModal}
            className="px-4 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Manual Review</span>
          </button>
        )}
      </div>

      {/* ===================================================================== */}
      {/* SUB-TAB 1: CUSTOMER MESSAGES INBOX                                    */}
      {/* ===================================================================== */}
      {activeSubTab === 'messages' && (
        <div className="space-y-5">
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Total Notes Received
              </p>
              <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                {msgKpis.totalNotes}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">All customer notes</p>
            </div>

            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Unread Messages
              </p>
              <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {msgKpis.unreadCount}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Needs team response</p>
            </div>

            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Custom 3D Print / Gift Inquiries
              </p>
              <p className="font-display text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {msgKpis.customPrintAndGiftCount}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Bespoke prints &amp; school kits
              </p>
            </div>

            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Replied &amp; Resolved
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {msgKpis.resolvedCount}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Closed conversations</p>
            </div>
          </div>

          {/* Search & Filters + Bulk Actions */}
          <div className="glass-surface rounded-3xl p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={msgSearch}
                  onChange={(e) => setMsgSearch(e.target.value)}
                  placeholder="Search by customer name, 10-digit phone, or note keywords..."
                  className="w-full h-10 pl-10 pr-3 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  aria-label="Filter messages by status"
                  value={msgStatusFilter}
                  onChange={(e) =>
                    setMsgStatusFilter(e.target.value as 'All' | CustomerMessageStatus)
                  }
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                >
                  <option value="All">Status: All</option>
                  {CUSTOMER_MESSAGE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4">
                <select
                  aria-label="Filter messages by topic"
                  value={msgTopicFilter}
                  onChange={(e) => setMsgTopicFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                >
                  <option value="All">Topic: All Subjects</option>
                  {CUSTOMER_MESSAGE_TOPICS.map((tp) => (
                    <option key={tp} value={tp}>
                      {tp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedMessageIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl glass-subtle">
                <span className="text-xs font-semibold text-zinc-900 dark:text-white tabular-nums">
                  {selectedMessageIds.length} message
                  {selectedMessageIds.length === 1 ? '' : 's'} selected
                </span>
                <div className="flex items-center gap-2">
                  {confirmBulkDelete ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onBulkDeleteMessages(selectedMessageIds);
                          setSelectedMessageIds([]);
                          setConfirmBulkDelete(false);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Bulk Delete ({selectedMessageIds.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmBulkDelete(false)}
                        className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmBulkDelete(true)}
                        className="px-3.5 py-1.5 rounded-xl glass-btn-secondary text-red-600 dark:text-red-400 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Selected</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedMessageIds([])}
                        className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Messages Table (Desktop) & Cards (Mobile) */}
          {filteredMessages.length === 0 ? (
            <div className="glass-surface rounded-3xl p-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
              {messages.length === 0
                ? '0 customer notes received yet. Live submissions from "Send Us a Note" on bee4.in appear here.'
                : 'No customer messages match your current filters.'}
            </div>
          ) : (
            <>
              <div className="hidden md:block glass-surface rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900/10 dark:border-white/10 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        <th className="py-3.5 pl-4 pr-2 w-10">
                          <input
                            type="checkbox"
                            aria-label="Select all visible messages"
                            checked={
                              filteredMessages.length > 0 &&
                              filteredMessages.every((m) => selectedMessageIds.includes(m.id))
                            }
                            onChange={handleToggleSelectAllFiltered}
                            className="w-4 h-4 accent-amber-600"
                          />
                        </th>
                        <th className="py-3.5 px-3">Customer</th>
                        <th className="py-3.5 px-3">Topic</th>
                        <th className="py-3.5 px-3">Message</th>
                        <th className="py-3.5 px-3">Status</th>
                        <th className="py-3.5 px-3">Received</th>
                        <th className="py-3.5 pl-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/8 dark:divide-white/8 text-xs">
                      {filteredMessages.map((msg) => {
                        const checked = selectedMessageIds.includes(msg.id);
                        return (
                          <tr
                            key={msg.id}
                            className="hover:bg-white/45 dark:hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3.5 pl-4 pr-2 align-top">
                              <input
                                type="checkbox"
                                aria-label={`Select message from ${msg.customerName}`}
                                checked={checked}
                                onChange={() => handleToggleSelectMsg(msg.id)}
                                className="w-4 h-4 accent-amber-600 mt-0.5"
                              />
                            </td>
                            <td className="py-3.5 px-3 align-top">
                              <p className="font-bold text-zinc-900 dark:text-white">
                                {msg.customerName}
                              </p>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                                +91 {msg.phone}
                              </p>
                              {msg.email && (
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[170px]">
                                  {msg.email}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-3 align-top">
                              <span className="inline-block px-2.5 py-1 rounded-lg glass-subtle text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                                {msg.topic}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 align-top max-w-xs">
                              <p className="text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-relaxed">
                                {msg.message}
                              </p>
                              {msg.adminNote && (
                                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300 truncate">
                                  Note: {msg.adminNote}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-3 align-top">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap ${messageStatusBadgeClass(
                                  msg.status
                                )}`}
                              >
                                {msg.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 align-top text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                              {new Date(msg.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </td>
                            <td className="py-3.5 pl-3 pr-4 align-top text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <a
                                  href={buildMessageWhatsAppReplyUrl(msg)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Reply on WhatsApp"
                                  className="px-2.5 py-1.5 rounded-xl glass-btn-secondary text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => openMessageDrawer(msg)}
                                  className="px-2.5 py-1.5 rounded-xl glass-btn-ink text-[11px] font-semibold"
                                >
                                  View / Reply
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card Stack */}
              <div className="md:hidden space-y-3">
                {filteredMessages.map((msg) => (
                  <div key={msg.id} className="glass-surface rounded-2xl p-4 space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={selectedMessageIds.includes(msg.id)}
                          onChange={() => handleToggleSelectMsg(msg.id)}
                          className="w-4 h-4 accent-amber-600 mt-1"
                        />
                        <div>
                          <p className="font-bold text-sm text-zinc-900 dark:text-white">
                            {msg.customerName}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                            +91 {msg.phone} · {msg.topic}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${messageStatusBadgeClass(
                          msg.status
                        )}`}
                      >
                        {msg.status}
                      </span>
                    </div>

                    <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{msg.message}</p>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-900/8 dark:border-white/10">
                      <a
                        href={buildMessageWhatsAppReplyUrl(msg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl glass-btn-secondary text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Reply on WhatsApp</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => openMessageDrawer(msg)}
                        className="px-3 py-1.5 rounded-xl glass-btn-ink text-[11px] font-semibold"
                      >
                        Manage Note
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 2: PRODUCT REVIEWS & RATINGS MANAGER                          */}
      {/* ===================================================================== */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-5">
          {/* 4 Review KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Overall Store Avg Rating
              </p>
              <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums inline-flex items-center gap-1.5">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                <span>{revKpis.averageRating.toFixed(1)}</span>
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Across {revKpis.publishedCount} published
              </p>
            </div>

            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Total Customer Reviews
              </p>
              <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                {revKpis.totalReviews}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">All statuses</p>
            </div>

            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Pending Approval
              </p>
              <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {revKpis.pendingCount}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Awaiting moderation
              </p>
            </div>

            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Featured Homepage Reviews
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {revKpis.featuredCount}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Pinned on storefront</p>
            </div>
          </div>

          {/* Review Filters */}
          <div className="glass-surface rounded-3xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={revSearch}
                onChange={(e) => setRevSearch(e.target.value)}
                placeholder="Search reviewer, SKU, or feedback text..."
                className="w-full h-10 pl-10 pr-3 rounded-xl glass-input text-xs focus:outline-none"
              />
            </div>

            <div className="lg:col-span-2">
              <select
                aria-label="Filter reviews by star rating"
                value={revStarFilter}
                onChange={(e) =>
                  setRevStarFilter(e.target.value as 'All' | '5' | '4' | '3' | 'low')
                }
                className="w-full h-10 px-3 rounded-xl glass-input text-xs font-semibold focus:outline-none"
              >
                <option value="All">Stars: All</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="low">1–2 Stars</option>
              </select>
            </div>

            <div className="lg:col-span-4">
              <select
                aria-label="Filter reviews by product"
                value={revProductFilter}
                onChange={(e) => setRevProductFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-xl glass-input text-xs font-semibold focus:outline-none"
              >
                <option value="All">Product: All BEE4 SKUs</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                aria-label="Filter reviews by status"
                value={revStatusFilter}
                onChange={(e) =>
                  setRevStatusFilter(e.target.value as 'All' | ProductReviewStatus)
                }
                className="w-full h-10 px-3 rounded-xl glass-input text-xs font-semibold focus:outline-none"
              >
                <option value="All">Status: All</option>
                {PRODUCT_REVIEW_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reviews Grid */}
          {filteredReviews.length === 0 ? (
            <div className="glass-surface rounded-3xl p-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
              {reviews.length === 0
                ? '0 product reviews submitted yet. Real customer reviews on bee4.in will appear here for moderation.'
                : 'No reviews match your current filters.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredReviews.map((rev) => (
                <article key={rev.id} className="glass-surface rounded-3xl p-5 space-y-3.5 text-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                          {rev.customerName}
                        </span>
                        {rev.verifiedBuyer && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                            <BadgeCheck className="w-3 h-3" />
                            <span>Verified Buyer</span>
                          </span>
                        )}
                        {rev.featuredOnHomepage && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/12 border border-indigo-500/25 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                            <Home className="w-3 h-3" />
                            <span>Homepage Featured</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                        {rev.productName}
                      </p>
                      {(rev.cityOrRole || rev.customerContact) && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {[rev.cityOrRole, rev.customerContact].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${reviewStatusBadgeClass(
                          rev.status
                        )}`}
                      >
                        {rev.status}
                      </span>
                      <div className="inline-flex items-center gap-0.5">
                        {STARS.map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating
                                ? 'fill-amber-500 text-amber-500'
                                : 'text-zinc-300 dark:text-zinc-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <p className="flex-1 text-zinc-800 dark:text-zinc-200 leading-relaxed text-xs sm:text-sm">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                    {rev.photoUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxPhoto({
                            url: rev.photoUrl!,
                            caption: `${rev.customerName} — ${rev.productName}`,
                          })
                        }
                        className="w-16 h-16 rounded-xl overflow-hidden border border-white/60 dark:border-white/15 shrink-0"
                      >
                        <img
                          src={rev.photoUrl}
                          alt={`Review attachment by ${rev.customerName}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )}
                  </div>

                  {rev.adminReply && (
                    <div className="p-3 rounded-2xl glass-subtle border-l-2 border-amber-500 space-y-1">
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                        <Reply className="w-3 h-3" />
                        <span>Official Reply from Team BEE4</span>
                      </p>
                      <p className="text-zinc-700 dark:text-zinc-300">{rev.adminReply}</p>
                    </div>
                  )}

                  {/* Quick Moderation Bar */}
                  <div className="pt-2.5 border-t border-zinc-900/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {rev.status !== 'Published' ? (
                        <button
                          type="button"
                          onClick={() =>
                            onSaveReview({
                              ...rev,
                              status: 'Published',
                              updatedAt: new Date().toISOString(),
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl glass-btn-amber text-white text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Approve &amp; Publish</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            onSaveReview({
                              ...rev,
                              status: 'Hidden',
                              updatedAt: new Date().toISOString(),
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl glass-btn-secondary text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onSaveReview({
                            ...rev,
                            featuredOnHomepage: !rev.featuredOnHomepage,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold inline-flex items-center gap-1 ${
                          rev.featuredOnHomepage ? 'glass-btn-ink' : 'glass-btn-secondary'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{rev.featuredOnHomepage ? 'Featured' : 'Feature'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditReviewModal(rev)}
                        className="px-2.5 py-1.5 rounded-xl glass-btn-secondary text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit / Reply</span>
                      </button>
                    </div>

                    {confirmDeleteRevId === rev.id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteReview(rev.id);
                            setConfirmDeleteRevId(null);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-red-600 text-white text-[11px] font-semibold"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteRevId(null)}
                          className="px-2 py-1.5 rounded-xl glass-btn-secondary text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteRevId(rev.id)}
                        aria-label={`Delete review by ${rev.customerName}`}
                        className="p-1.5 rounded-xl glass-btn-secondary text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUB-TAB 3: PRODUCT Q&A MODERATION & TEAM BEE4 ANSWERS                 */}
      {/* ===================================================================== */}
      {activeSubTab === 'qa' && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3.5">
            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Total Product Questions
              </p>
              <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                {productQuestions.length}
              </p>
            </div>
            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Pending Reply
              </p>
              <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {pendingQaCount}
              </p>
            </div>
            <div className="glass-surface rounded-2xl p-4 space-y-1">
              <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Answered &amp; Live
              </p>
              <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {productQuestions.length - pendingQaCount}
              </p>
            </div>
          </div>

          <div className="glass-surface rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={qaSearch}
                onChange={(e) => setQaSearch(e.target.value)}
                placeholder="Search by product, shopper name, or question..."
                className="w-full h-10 pl-10 pr-3 rounded-xl glass-input text-xs focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(['All', 'Pending', 'Answered'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setQaStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    qaStatusFilter === status ? 'glass-btn-ink' : 'glass-btn-secondary'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="glass-surface rounded-3xl p-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
              {productQuestions.length === 0
                ? '0 customer product questions submitted yet. Questions from product pages & customer accounts appear here.'
                : 'No questions match your current filters.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((qa) => {
                const draftVal = qaAnswerDrafts[qa.id] ?? qa.answer ?? '';
                return (
                  <article
                    key={qa.id}
                    className="glass-surface rounded-3xl p-5 space-y-3 border border-zinc-900/8 dark:border-white/10"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          {qa.productName}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Asked by <strong>{qa.customerName}</strong>
                          {qa.customerContact ? ` (${qa.customerContact})` : ''} ·{' '}
                          {new Date(qa.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          qa.status === 'Answered'
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/18 text-amber-800 dark:text-amber-300 border-amber-500/35'
                        }`}
                      >
                        {qa.status}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Q: {qa.question}
                    </p>

                    <div className="space-y-2 pt-1">
                      <label
                        htmlFor={`qa-reply-${qa.id}`}
                        className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300"
                      >
                        Official Team BEE4 Answer (Visible publicly on product page &amp; customer account)
                      </label>
                      <textarea
                        id={`qa-reply-${qa.id}`}
                        rows={2}
                        value={draftVal}
                        onChange={(e) =>
                          setQaAnswerDrafts((prev) => ({ ...prev, [qa.id]: e.target.value }))
                        }
                        placeholder="Write a helpful, clear answer as Team BEE4..."
                        className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {onDeleteQuestion && (
                        confirmDeleteQaId === qa.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteQuestion(qa.id);
                                setConfirmDeleteQaId(null);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteQaId(null)}
                              className="px-2.5 py-1.5 rounded-xl glass-btn-secondary text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteQaId(qa.id)}
                            className="px-3 py-1.5 rounded-xl glass-btn-secondary text-red-600 dark:text-red-400 text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )
                      )}

                      {onSaveQuestion && (
                        <button
                          type="button"
                          onClick={() => {
                            const cleanAnswer = draftVal.trim();
                            if (!cleanAnswer) return;
                            onSaveQuestion({
                              ...qa,
                              answer: cleanAnswer,
                              answeredBy: 'Team BEE4',
                              status: 'Answered',
                              updatedAt: new Date().toISOString(),
                            });
                          }}
                          className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          <span>{qa.status === 'Answered' ? 'Update Answer' : 'Publish Answer'}</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MESSAGE DETAIL, EDIT & 1-CLICK WHATSAPP / EMAIL REPLY DRAWER          */}
      {/* ===================================================================== */}
      {activeMessage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Manage note from ${activeMessage.customerName}`}
          className="fixed inset-0 z-50 flex justify-end bg-zinc-950/55 backdrop-blur-sm"
          onClick={() => setActiveMessage(null)}
        >
          <div
            className="w-full max-w-lg h-full glass-drawer p-5 sm:p-6 overflow-y-auto space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-900/10 dark:border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  Customer Message #{activeMessage.id}
                </p>
                <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                  {activeMessage.customerName}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
                  +91 {activeMessage.phone}
                  {activeMessage.email ? ` · ${activeMessage.email}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMessage(null)}
                aria-label="Close message drawer"
                className="p-2 rounded-xl glass-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1-Click Direct Reply Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <a
                href={buildMessageWhatsAppReplyUrl(activeMessage)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  const next: CustomerMessageRecord = {
                    ...activeMessage,
                    status: 'Replied / Resolved',
                    updatedAt: new Date().toISOString(),
                  };
                  onUpdateMessage(next);
                  setActiveMessage(next);
                  setMsgEditDraft((prev) => ({ ...prev, status: 'Replied / Resolved' }));
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Reply on WhatsApp</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>

              {buildMessageMailtoUrl(activeMessage) ? (
                <a
                  href={buildMessageMailtoUrl(activeMessage)!}
                  onClick={() => {
                    const next: CustomerMessageRecord = {
                      ...activeMessage,
                      status: 'Replied / Resolved',
                      updatedAt: new Date().toISOString(),
                    };
                    onUpdateMessage(next);
                    setActiveMessage(next);
                    setMsgEditDraft((prev) => ({ ...prev, status: 'Replied / Resolved' }));
                  }}
                  className="py-2.5 px-3 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Reply via Email</span>
                </a>
              ) : (
                <div className="py-2.5 px-3 rounded-xl glass-subtle text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-center">
                  No email provided (WhatsApp ready)
                </div>
              )}
            </div>

            {/* 1-Click Status Pills */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                Quick Status Update
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOMER_MESSAGE_STATUSES.map((st) => {
                  const isCurrent = msgEditDraft.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setMsgEditDraft((prev) => ({ ...prev, status: st }));
                        const next: CustomerMessageRecord = {
                          ...activeMessage,
                          status: st,
                          updatedAt: new Date().toISOString(),
                        };
                        onUpdateMessage(next);
                        setActiveMessage(next);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold inline-flex items-center gap-1 ${
                        isCurrent ? 'glass-btn-ink' : 'glass-btn-secondary'
                      }`}
                    >
                      {st === 'Replied / Resolved' && <CheckCheck className="w-3 h-3" />}
                      {st === 'Archived' && <Archive className="w-3 h-3" />}
                      {st === 'Read' && <Check className="w-3 h-3" />}
                      {st === 'Unread' && <MessageSquare className="w-3 h-3" />}
                      <span>{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Edit Message Content & Internal Admin Notes */}
            <form onSubmit={handleSaveMessageDrawer} className="space-y-3.5">
              <div>
                <label htmlFor="drawer-msg-topic" className="block text-xs font-semibold mb-1">
                  Topic / Subject
                </label>
                <select
                  id="drawer-msg-topic"
                  value={msgEditDraft.topic}
                  onChange={(e) =>
                    setMsgEditDraft((prev) => ({ ...prev, topic: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                >
                  {CUSTOMER_MESSAGE_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="drawer-msg-body" className="block text-xs font-semibold mb-1">
                  Customer Message Text
                </label>
                <textarea
                  id="drawer-msg-body"
                  rows={4}
                  value={msgEditDraft.message}
                  onChange={(e) =>
                    setMsgEditDraft((prev) => ({ ...prev, message: e.target.value }))
                  }
                  className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="drawer-msg-admin-note" className="block text-xs font-semibold mb-1">
                  Internal Team BEE4 Follow-Up Note
                </label>
                <textarea
                  id="drawer-msg-admin-note"
                  rows={3}
                  value={msgEditDraft.adminNote}
                  onChange={(e) =>
                    setMsgEditDraft((prev) => ({ ...prev, adminNote: e.target.value }))
                  }
                  placeholder="Log promised quote, print filament quote, or dispatch tracking shared on WhatsApp..."
                  className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {confirmDeleteMsgId === activeMessage.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteMessage(activeMessage.id);
                        setConfirmDeleteMsgId(null);
                        setActiveMessage(null);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteMsgId(null)}
                      className="px-3 py-2 rounded-xl glass-btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteMsgId(activeMessage.id)}
                    className="px-3.5 py-2 rounded-xl glass-btn-secondary text-red-600 dark:text-red-400 text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Note</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ADD MANUAL / EDIT PRODUCT REVIEW MODAL                                */}
      {/* ===================================================================== */}
      {reviewModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingReviewId ? 'Edit product review' : 'Add manual product review'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/55 backdrop-blur-md overflow-y-auto"
          onClick={() => setReviewModalOpen(false)}
        >
          <form
            onSubmit={handleSaveReviewModal}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-drawer rounded-3xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-zinc-900/10 dark:border-white/10 pb-3">
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                {editingReviewId ? 'Edit Product Review & Reply' : 'Add Manual Product Review'}
              </h2>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                aria-label="Close review modal"
                className="p-2 rounded-xl glass-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {revDraftError && (
              <div className="p-3 rounded-xl bg-red-500/12 border border-red-500/30 text-xs text-red-700 dark:text-red-300 font-medium">
                {revDraftError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="admin-rev-name" className="block text-xs font-semibold mb-1">
                  Customer Name *
                </label>
                <input
                  id="admin-rev-name"
                  type="text"
                  value={revDraftCustomerName}
                  onChange={(e) => setRevDraftCustomerName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="admin-rev-contact" className="block text-xs font-semibold mb-1">
                  Phone / Email
                </label>
                <input
                  id="admin-rev-contact"
                  type="text"
                  value={revDraftContact}
                  onChange={(e) => setRevDraftContact(e.target.value)}
                  placeholder="98... or email"
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="admin-rev-city" className="block text-xs font-semibold mb-1">
                  City / Parent Note
                </label>
                <input
                  id="admin-rev-city"
                  type="text"
                  value={revDraftCity}
                  onChange={(e) => setRevDraftCity(e.target.value)}
                  placeholder="e.g. Verified Buyer · Patna"
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="admin-rev-product" className="block text-xs font-semibold mb-1">
                  Product *
                </label>
                <select
                  id="admin-rev-product"
                  value={revDraftProductId}
                  onChange={(e) => setRevDraftProductId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
              <div>
                <span className="block text-xs font-semibold mb-1">Star Rating *</span>
                <div className="flex items-center gap-1.5">
                  {STARS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRevDraftRating(s)}
                      className="w-9 h-9 rounded-xl glass-btn-secondary inline-flex items-center justify-center"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          s <= revDraftRating
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-zinc-300 dark:text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-1.5 text-xs font-bold tabular-nums">{revDraftRating}.0</span>
                </div>
              </div>

              <div>
                <label htmlFor="admin-rev-status" className="block text-xs font-semibold mb-1">
                  Moderation Status
                </label>
                <select
                  id="admin-rev-status"
                  value={revDraftStatus}
                  onChange={(e) => setRevDraftStatus(e.target.value as ProductReviewStatus)}
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                >
                  {PRODUCT_REVIEW_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="admin-rev-comment" className="block text-xs font-semibold mb-1">
                Review Text *
              </label>
              <textarea
                id="admin-rev-comment"
                rows={3}
                value={revDraftComment}
                onChange={(e) => setRevDraftComment(e.target.value)}
                className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-rev-photo" className="block text-xs font-semibold mb-1">
                Review Photo URL (or upload to reviews/)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="admin-rev-photo"
                  type="url"
                  value={revDraftPhotoUrl}
                  onChange={(e) => setRevDraftPhotoUrl(e.target.value)}
                  placeholder="https://... or upload image"
                  className="flex-1 h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />
                <label className="h-10 px-3 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{revUploadingPhoto ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={revUploadingPhoto}
                    onChange={handleModalPhotoUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="admin-rev-reply" className="block text-xs font-semibold mb-1">
                Official Reply from Team BEE4 (Shown publicly below review)
              </label>
              <textarea
                id="admin-rev-reply"
                rows={2}
                value={revDraftAdminReply}
                onChange={(e) => setRevDraftAdminReply(e.target.value)}
                placeholder="Thank you for choosing BEE4..."
                className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-6 text-xs font-semibold pt-1">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={revDraftVerified}
                  onChange={(e) => setRevDraftVerified(e.target.checked)}
                  className="w-4 h-4 accent-amber-600"
                />
                <span>Verified Buyer Badge</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={revDraftFeatured}
                  onChange={(e) => setRevDraftFeatured(e.target.checked)}
                  className="w-4 h-4 accent-amber-600"
                />
                <span>Featured on Homepage</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={revUploadingPhoto}
                className="px-5 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold"
              >
                {editingReviewId ? 'Save Review Updates' : 'Publish Manual Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review photo preview"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-md"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-xl w-full glass-drawer rounded-3xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                {lightboxPhoto.caption}
              </p>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                aria-label="Close photo preview"
                className="p-1.5 rounded-xl glass-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.caption}
              className="w-full max-h-[70vh] object-contain rounded-2xl bg-black/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
