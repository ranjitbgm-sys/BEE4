import { FormEvent, useMemo, useState } from 'react';
import {
  Archive,
  Check,
  CheckCheck,
  ExternalLink,
  HelpCircle,
  Inbox,
  Mail,
  MessageCircle,
  MessageSquare,
  Reply,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CustomerMessageRecord,
  CustomerMessageStatus,
  CustomerMessageTopic,
  ProductQuestionRecord,
} from '../../types';
import {
  CUSTOMER_MESSAGE_STATUSES,
  CUSTOMER_MESSAGE_TOPICS,
  buildMessageMailtoUrl,
  buildMessageWhatsAppReplyUrl,
  computeMessageInboxKpis,
} from '../../utils/messagesReviewsLogic';

interface AdminMessagesQaTabProps {
  messages: CustomerMessageRecord[];
  productQuestions: ProductQuestionRecord[];
  onUpdateMessage: (updated: CustomerMessageRecord) => void;
  onDeleteMessage: (id: string) => void;
  onBulkDeleteMessages: (ids: string[]) => void;
  onSaveQuestion?: (question: ProductQuestionRecord) => void;
  onDeleteQuestion?: (id: string) => void;
}

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

export function AdminMessagesQaTab({
  messages,
  productQuestions,
  onUpdateMessage,
  onDeleteMessage,
  onBulkDeleteMessages,
  onSaveQuestion,
  onDeleteQuestion,
}: AdminMessagesQaTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'inquiries' | 'qa'>('inquiries');

  // --- General Inquiries ('Send Us a Note') state ---
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

  // --- Product Q&A state ---
  const [qaSearch, setQaSearch] = useState('');
  const [qaStatusFilter, setQaStatusFilter] = useState<'All' | 'Pending' | 'Answered'>('All');
  const [qaAnswerDrafts, setQaAnswerDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteQaId, setConfirmDeleteQaId] = useState<string | null>(null);

  const msgKpis = useMemo(() => computeMessageInboxKpis(messages), [messages]);
  const pendingQaCount = useMemo(
    () => productQuestions.filter((q) => q.status === 'Pending').length,
    [productQuestions]
  );

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

  return (
    <div className="space-y-6">
      {/* 2-Sub-Tab Switcher */}
      <div
        role="tablist"
        aria-label="Messages and Product Q&A sub-tabs"
        className="inline-flex flex-wrap gap-1.5 p-1 rounded-2xl glass-subtle"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'inquiries'}
          onClick={() => setActiveSubTab('inquiries')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'inquiries' ? 'glass-btn-ink' : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>General Inquiries (&lsquo;Send Us a Note&rsquo;)</span>
          {msgKpis.unreadCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                activeSubTab === 'inquiries'
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
          aria-selected={activeSubTab === 'qa'}
          onClick={() => setActiveSubTab('qa')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'qa' ? 'glass-btn-ink' : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Product Q&amp;A (Questions &amp; Answers)</span>
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

      {/* SUB-TAB A: GENERAL INQUIRIES ('SEND US A NOTE') */}
      {activeSubTab === 'inquiries' && (
        <div className="space-y-5">
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

          <div className="glass-surface rounded-2xl p-4 space-y-3">
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
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl glass-subtle">
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

          {filteredMessages.length === 0 ? (
            <div className="glass-surface rounded-2xl p-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
              {messages.length === 0
                ? '0 customer notes received yet. Live submissions from "Send Us a Note" on bee4.in appear here.'
                : 'No customer messages match your current filters.'}
            </div>
          ) : (
            <>
              <div className="hidden md:block glass-surface rounded-2xl overflow-hidden">
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
                            className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
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
                                <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300 truncate">
                                  Reply: {msg.adminNote}
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

      {/* SUB-TAB B: PRODUCT Q&A ('QUESTIONS & ANSWERS') */}
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

          <div className="glass-surface rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    qaStatusFilter === status ? 'glass-btn-ink' : 'glass-btn-secondary'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="glass-surface rounded-2xl p-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
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
                    className="glass-surface rounded-2xl p-5 space-y-3 border border-zinc-900/8 dark:border-white/10"
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
                        Official Team BEE4 Answer (Updates customer&apos;s Q&amp;A &amp; renders
                        publicly on Product Detail page)
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
                      {onDeleteQuestion &&
                        (confirmDeleteQaId === qa.id ? (
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
                        ))}

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

      {/* MESSAGE DETAIL, EDIT & 1-CLICK WHATSAPP / EMAIL REPLY DRAWER */}
      {activeMessage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Manage note from ${activeMessage.customerName}`}
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/55"
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
                  Team BEE4 Reply (Synced back to Customer Account Support History)
                </label>
                <textarea
                  id="drawer-msg-admin-note"
                  rows={3}
                  value={msgEditDraft.adminNote}
                  onChange={(e) =>
                    setMsgEditDraft((prev) => ({ ...prev, adminNote: e.target.value }))
                  }
                  placeholder="Write your official reply or follow-up note..."
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
                  Save &amp; Sync Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
