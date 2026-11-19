import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  ExternalLink,
  Headphones,
  MessageCircle,
  Package,
  RotateCcw,
  Search,
  Send,
  Star,
  Ticket,
  User,
} from 'lucide-react';
import type {
  CustomerProfile,
  OrderRecord,
  SupportMessageRecord,
  SupportTicketRecord,
} from '../../types';
import { formatINR } from '../../utils/storeLogic';
import {
  AdminSupportFilter,
  buildSupportTicketWhatsAppUrl,
  computeSupportDeskKpis,
  filterSupportTickets,
  formatSupportStatusLabel,
  isTicketOpenForExecutive,
} from '../../utils/supportChatLogic';

interface AdminSupportTabProps {
  tickets: SupportTicketRecord[];
  messages: SupportMessageRecord[];
  orders: OrderRecord[];
  customers: CustomerProfile[];
  whatsappNumber: string;
  onSendExecutiveReply: (ticket: SupportTicketRecord, replyText: string) => void;
  onUpdateTicketStatus: (
    ticket: SupportTicketRecord,
    nextStatus: SupportTicketRecord['status'],
    closedBy?: 'Executive'
  ) => void;
}

const FILTER_OPTIONS: AdminSupportFilter[] = [
  'All',
  'Open / Needs Executive',
  'AI Handled',
  'Closed / Resolved',
];

export function AdminSupportTab({
  tickets,
  messages,
  orders,
  customers,
  whatsappNumber,
  onSendExecutiveReply,
  onUpdateTicketStatus,
}: AdminSupportTabProps) {
  const [statusFilter, setStatusFilter] = useState<AdminSupportFilter>('All');
  const [search, setSearch] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    () => tickets[0]?.id ?? null
  );
  const [replyDraft, setReplyDraft] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const kpis = useMemo(() => computeSupportDeskKpis(tickets), [tickets]);
  const filteredTickets = useMemo(
    () => filterSupportTickets(tickets, statusFilter, search),
    [tickets, statusFilter, search]
  );

  const selectedTicket = useMemo(() => {
    if (selectedTicketId) {
      const exact = tickets.find((t) => t.id === selectedTicketId);
      if (exact) return exact;
    }
    return filteredTickets[0] ?? null;
  }, [tickets, filteredTickets, selectedTicketId]);

  const selectedMessages = useMemo(() => {
    if (!selectedTicket) return [];
    return messages
      .filter((m) => m.ticketId === selectedTicket.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedTicket]);

  const linkedCustomer = useMemo(() => {
    if (!selectedTicket) return null;
    return (
      customers.find(
        (c) =>
          (selectedTicket.userId && c.id === selectedTicket.userId) ||
          (selectedTicket.customerEmail &&
            c.email.toLowerCase() === selectedTicket.customerEmail.toLowerCase()) ||
          (selectedTicket.customerPhone &&
            c.phone.replace(/\D/g, '').slice(-10) ===
              selectedTicket.customerPhone.replace(/\D/g, '').slice(-10))
      ) ?? null
    );
  }, [customers, selectedTicket]);

  const linkedCustomerOrders = useMemo(() => {
    if (!selectedTicket) return [];
    const targetEmail = (selectedTicket.customerEmail || '').trim().toLowerCase();
    const targetPhone = (selectedTicket.customerPhone || '').replace(/\D/g, '').slice(-10);
    return orders
      .filter((o) => {
        if (selectedTicket.linkedOrderNumber && o.orderNumber === selectedTicket.linkedOrderNumber) {
          return true;
        }
        if (selectedTicket.userId && o.userId === selectedTicket.userId) return true;
        if (targetEmail && o.customer.email.trim().toLowerCase() === targetEmail) return true;
        if (targetPhone && o.customer.phone.replace(/\D/g, '').slice(-10) === targetPhone) {
          return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [orders, selectedTicket]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedMessages.length, selectedTicket?.id]);

  const handleSendReply = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || selectedTicket.status === 'Closed') return;
    const clean = replyDraft.trim();
    if (!clean) return;
    onSendExecutiveReply(selectedTicket, clean);
    setReplyDraft('');
  };

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-surface rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Total Support Tokens
          </p>
          <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {kpis.total}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Live help center chats</p>
        </div>

        <div className="glass-surface rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Open / Needs Executive
          </p>
          <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {kpis.openNeedsExecutive}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Waiting for team reply</p>
        </div>

        <div className="glass-surface rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            AI Handled
          </p>
          <p className="font-display text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
            {kpis.aiHandled}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Assisted automatically</p>
        </div>

        <div className="glass-surface rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Closed / Resolved
          </p>
          <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {kpis.closed}
            {kpis.ratedCount > 0 && (
              <span className="ml-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                ★ {kpis.averageRating.toFixed(1)}
              </span>
            )}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {kpis.ratedCount > 0 ? `${kpis.ratedCount} customer rating(s)` : 'Completed tickets'}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-surface rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setStatusFilter(opt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                statusFilter === opt ? 'glass-btn-ink' : 'glass-btn-secondary'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Token #, customer, phone, or Order #..."
            className="w-full h-9 pl-9 pr-3 rounded-xl glass-input text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Master-Detail Live Support Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Support Token Queue */}
        <div className="lg:col-span-4 glass-surface rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-900/10 dark:border-white/10 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Support Tokens ({filteredTickets.length})
            </h2>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
              <Headphones className="w-7 h-7 mx-auto text-amber-600/70" />
              <p className="font-semibold text-zinc-700 dark:text-zinc-200">
                {tickets.length === 0
                  ? 'No support tokens raised yet.'
                  : 'No tokens match this filter.'}
              </p>
              <p>
                When customers raise a Support Token from the Help Center on bee4.in, live chats
                appear here instantly.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-900/8 dark:divide-white/10 max-h-[620px] overflow-y-auto">
              {filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const openExec = isTicketOpenForExecutive(ticket);
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full p-4 text-left transition-colors space-y-1.5 ${
                      isSelected
                        ? 'bg-amber-50/90 dark:bg-amber-500/12 border-l-2 border-amber-600'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-zinc-900 dark:text-white">
                        <Ticket className="w-3.5 h-3.5 text-amber-600" />
                        {ticket.tokenNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          ticket.status === 'Closed'
                            ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : openExec
                              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/35'
                              : 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30'
                        }`}
                      >
                        {ticket.status === 'Waiting for Executive' ? 'Needs Executive' : ticket.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {ticket.customerName}
                      {ticket.linkedOrderNumber ? ` · ${ticket.linkedOrderNumber}` : ''}
                    </p>
                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300 truncate">
                      {ticket.subject}
                    </p>
                    {ticket.lastMessagePreview && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                        {ticket.lastMessagePreview}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-400 tabular-nums">
                      <span>
                        {new Date(ticket.updatedAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {ticket.satisfactionRating && (
                        <span className="inline-flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {ticket.satisfactionRating}.0
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Ticket Thread & Executive Controls */}
        <div className="lg:col-span-8 glass-surface rounded-2xl overflow-hidden flex flex-col min-h-[540px]">
          {!selectedTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Headphones className="w-9 h-9 text-amber-600/60" />
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                Select a Support Token to inspect conversation &amp; reply live
              </p>
              <p className="text-xs max-w-md">
                Executive replies sync in real time straight into the customer&apos;s Help Center
                chat window on bee4.in.
              </p>
            </div>
          ) : (
            <>
              {/* Selected Ticket Top Header */}
              <div className="p-4 border-b border-zinc-900/10 dark:border-white/10 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
                      #{selectedTicket.tokenNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                        selectedTicket.status === 'Closed'
                          ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/35'
                      }`}
                    >
                      {formatSupportStatusLabel(selectedTicket.status)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 mt-1">
                    {selectedTicket.customerName}
                    {selectedTicket.customerPhone ? ` · +91 ${selectedTicket.customerPhone}` : ''}
                    {selectedTicket.customerEmail ? ` · ${selectedTicket.customerEmail}` : ''}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Topic: {selectedTicket.subject}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={buildSupportTicketWhatsAppUrl(selectedTicket, whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>

                  {selectedTicket.status !== 'Closed' ? (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTicketStatus(selectedTicket, 'Closed', 'Executive')
                      }
                      className="px-3 py-1.5 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolve &amp; Close Token</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateTicketStatus(selectedTicket, 'Open')}
                      className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reopen Token</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Linked Customer Profile & Recent Orders Strip */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/70 border-b border-zinc-900/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-3 text-zinc-600 dark:text-zinc-300">
                  <span className="inline-flex items-center gap-1 font-semibold text-zinc-900 dark:text-white">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    {linkedCustomer
                      ? `Wallet: ${formatINR(linkedCustomer.walletBalance ?? 0)}`
                      : 'Customer Context'}
                  </span>
                  {linkedCustomerOrders.length > 0 ? (
                    linkedCustomerOrders.map((ord) => (
                      <span
                        key={ord.orderNumber}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 tabular-nums"
                      >
                        <Package className="w-3 h-3 text-amber-600" />
                        <strong>{ord.orderNumber}</strong> · {ord.status} ({formatINR(ord.total)})
                      </span>
                    ))
                  ) : (
                    <span>No linked orders found yet</span>
                  )}
                </div>

                {selectedTicket.satisfactionRating && (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    Customer Rating: {selectedTicket.satisfactionRating}/5
                    {selectedTicket.satisfactionFeedback
                      ? ` — "${selectedTicket.satisfactionFeedback}"`
                      : ''}
                  </span>
                )}
              </div>

              {/* Full Chat History (AI Bot + Customer + Executive) */}
              <div className="flex-1 max-h-[380px] overflow-y-auto p-4 space-y-3 bg-[#F4F6F8] dark:bg-slate-950/60">
                {selectedMessages.length === 0 ? (
                  <p className="text-center text-xs text-zinc-500 py-8">
                    No messages logged in this thread yet.
                  </p>
                ) : (
                  selectedMessages.map((msg) => {
                    const isExec = msg.sender === 'executive';
                    const isBot = msg.sender === 'bot';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isExec ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed border ${
                            isExec
                              ? 'bg-slate-900 dark:bg-amber-600 text-white border-slate-900 dark:border-amber-600 rounded-br-sm'
                              : isBot
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-slate-800 dark:text-amber-100 border-amber-200 dark:border-amber-700/50 rounded-bl-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 rounded-bl-sm'
                          }`}
                        >
                          <div
                            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1 ${
                              isExec
                                ? 'text-amber-300 dark:text-amber-100'
                                : isBot
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isExec ? (
                              <Headphones className="w-3 h-3" />
                            ) : isBot ? (
                              <Bot className="w-3 h-3" />
                            ) : (
                              <User className="w-3 h-3" />
                            )}
                            <span>{msg.senderName}</span>
                            <span className="opacity-70 font-normal normal-case tabular-nums">
                              ·{' '}
                              {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="whitespace-pre-line">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              {/* Executive Live Reply Composer */}
              <form
                onSubmit={handleSendReply}
                className="p-3.5 bg-white dark:bg-slate-900 border-t border-zinc-900/10 dark:border-white/10 flex items-center gap-2"
              >
                <label htmlFor="admin-executive-reply-input" className="sr-only">
                  Write executive reply
                </label>
                <input
                  id="admin-executive-reply-input"
                  type="text"
                  disabled={selectedTicket.status === 'Closed'}
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  placeholder={
                    selectedTicket.status === 'Closed'
                      ? 'Token is closed. Click "Reopen Token" above to send another reply.'
                      : `Send live Executive Reply to ${selectedTicket.customerName}...`
                  }
                  className="flex-1 h-10 px-3.5 rounded-xl glass-input text-xs focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={selectedTicket.status === 'Closed' || !replyDraft.trim()}
                  className="h-10 px-4 rounded-xl glass-btn-amber text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-40 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Reply</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
