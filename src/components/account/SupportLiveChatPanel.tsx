import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Headphones,
  MessageCircle,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Star,
  Ticket,
  User,
} from 'lucide-react';
import type {
  CouponRecord,
  CustomerProfile,
  OrderRecord,
  Product,
  StoreSettings,
  SupportMessageRecord,
  SupportTicketRecord,
  SupportTicketStatus,
} from '../../types';
import { buildWhatsAppUrl } from '../../utils/storeLogic';
import {
  SUPPORT_QUICK_CHIPS,
  formatSupportStatusLabel,
  generateAiSupportReply,
} from '../../utils/supportChatLogic';

interface DraftChatMessage {
  id: string;
  sender: 'customer' | 'bot' | 'executive';
  senderName: string;
  text: string;
  createdAt: string;
}

interface SupportLiveChatPanelProps {
  customer: CustomerProfile;
  customerOrders: OrderRecord[];
  products: Product[];
  settings: StoreSettings;
  coupons: CouponRecord[];
  tickets: SupportTicketRecord[];
  messages: SupportMessageRecord[];
  whatsappNumber: string;
  onCreateSupportTicket: (input: {
    subject: string;
    linkedOrderNumber?: string;
    status: SupportTicketStatus;
    needsExecutive: boolean;
    initialMessages: {
      sender: 'customer' | 'bot' | 'executive';
      senderName: string;
      text: string;
      createdAt: string;
    }[];
  }) => SupportTicketRecord;
  onSendSupportMessage: (
    ticket: SupportTicketRecord,
    message: {
      sender: 'customer' | 'bot' | 'executive';
      senderName: string;
      text: string;
    },
    ticketUpdates?: Partial<SupportTicketRecord>
  ) => void;
  onUpdateSupportTicket: (updated: SupportTicketRecord) => void;
}

const RATING_STARS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

function makeGreetingMessage(firstName: string): DraftChatMessage {
  return {
    id: 'bee4-welcome-greeting',
    sender: 'bot',
    senderName: 'BEE4 Support Assistant',
    text: `Hi ${firstName}! Welcome to BEE4 Live Support. Ask me about your latest order status, 7-day returns & replacements, 55°C Eco-PLA care, promo coupons, or custom photo uploads — or raise a Support Token anytime to chat directly with a BEE4 Executive.`,
    createdAt: new Date().toISOString(),
  };
}

export function SupportLiveChatPanel({
  customer,
  customerOrders,
  products,
  settings,
  coupons,
  tickets,
  messages,
  whatsappNumber,
  onCreateSupportTicket,
  onSendSupportMessage,
  onUpdateSupportTicket,
}: SupportLiveChatPanelProps) {
  const firstName =
    customer.firstName?.trim() || customer.fullName.trim().split(/\s+/)[0] || 'there';

  const myTickets = useMemo(
    () =>
      [...tickets]
        .filter((t) => {
          const emailMatch =
            customer.email &&
            t.customerEmail &&
            t.customerEmail.trim().toLowerCase() === customer.email.trim().toLowerCase();
          return t.userId === customer.id || Boolean(emailMatch);
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [tickets, customer.id, customer.email]
  );

  const [activeTicketId, setActiveTicketId] = useState<string | null>(() => {
    const openFirst = myTickets.find((t) => t.status !== 'Closed');
    return openFirst?.id ?? null;
  });

  const [draftMessages, setDraftMessages] = useState<DraftChatMessage[]>(() => [
    makeGreetingMessage(firstName),
  ]);
  const [suggestedTopic, setSuggestedTopic] = useState<string>('Customer Support Inquiry');
  const [suggestedOrderNo, setSuggestedOrderNo] = useState<string | undefined>(
    customerOrders[0]?.orderNumber
  );
  const [highlightEscalation, setHighlightEscalation] = useState(false);
  const [inputText, setInputText] = useState('');

  // Rating state for closed ticket
  const [ratingSelection, setRatingSelection] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [ratingSavedNotice, setRatingSavedNotice] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const activeTicket = useMemo(
    () => myTickets.find((t) => t.id === activeTicketId) ?? null,
    [myTickets, activeTicketId]
  );

  const activeThreadMessages = useMemo(() => {
    if (!activeTicket) return draftMessages;
    return messages
      .filter((m) => m.ticketId === activeTicket.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [activeTicket, messages, draftMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeThreadMessages.length, activeTicketId]);

  useEffect(() => {
    if (activeTicket?.satisfactionRating) {
      setRatingSelection(activeTicket.satisfactionRating);
      setRatingFeedback(activeTicket.satisfactionFeedback ?? '');
    } else {
      setRatingSelection(5);
      setRatingFeedback('');
    }
    setRatingSavedNotice(false);
  }, [activeTicket?.id, activeTicket?.satisfactionRating, activeTicket?.satisfactionFeedback]);

  const handleStartNewAssistantChat = () => {
    setActiveTicketId(null);
    setDraftMessages([makeGreetingMessage(firstName)]);
    setHighlightEscalation(false);
    setSuggestedTopic('Customer Support Inquiry');
    setInputText('');
  };

  const handleRaiseExecutiveToken = (customReason?: string) => {
    if (activeTicket && activeTicket.status !== 'Closed') {
      if (!activeTicket.needsExecutive || activeTicket.status === 'AI Handled') {
        const escalated: SupportTicketRecord = {
          ...activeTicket,
          status: 'Waiting for Executive',
          needsExecutive: true,
          updatedAt: new Date().toISOString(),
        };
        onUpdateSupportTicket(escalated);
        onSendSupportMessage(escalated, {
          sender: 'bot',
          senderName: 'BEE4 Support Assistant',
          text: `Support Token #${escalated.tokenNumber} is now escalated to a BEE4 Executive. A human specialist from our Banka studio will reply right here shortly.`,
        });
      }
      setHighlightEscalation(false);
      return;
    }

    const now = new Date().toISOString();
    const initialHistory = [...draftMessages];
    if (customReason && customReason.trim()) {
      initialHistory.push({
        id: `draft-esc-${Date.now()}`,
        sender: 'customer',
        senderName: customer.fullName,
        text: customReason.trim(),
        createdAt: now,
      });
    }

    const created = onCreateSupportTicket({
      subject: suggestedTopic || 'Executive Support Chat',
      linkedOrderNumber: suggestedOrderNo,
      status: 'Waiting for Executive',
      needsExecutive: true,
      initialMessages: initialHistory.map((m) => ({
        sender: m.sender,
        senderName: m.senderName,
        text: m.text,
        createdAt: m.createdAt,
      })),
    });

    onSendSupportMessage(created, {
      sender: 'bot',
      senderName: 'BEE4 Support Assistant',
      text: `Your Support Token #${created.tokenNumber} has been raised (Status: Open · Waiting for Executive). You can continue typing details here — our BEE4 Executive sees your full chat history and will reply directly in this window.`,
    });

    setActiveTicketId(created.id);
    setHighlightEscalation(false);
  };

  const handleSendText = (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;
    setInputText('');

    // If an active ticket exists and is closed, ignore sends
    if (activeTicket && activeTicket.status === 'Closed') return;

    const now = new Date().toISOString();

    // Case 1: Active Ticket already assigned to Executive -> send directly to live thread
    if (activeTicket) {
      onSendSupportMessage(
        activeTicket,
        {
          sender: 'customer',
          senderName: customer.fullName,
          text: clean,
        },
        {
          lastMessagePreview: clean.slice(0, 140),
          updatedAt: now,
        }
      );

      // If ticket is still AI Handled, also run the AI assistant
      if (!activeTicket.needsExecutive && activeTicket.status === 'AI Handled') {
        const aiRes = generateAiSupportReply({
          query: clean,
          customer,
          customerOrders,
          products,
          settings,
          coupons,
        });
        setHighlightEscalation(aiRes.suggestExecutiveHandoff);
        onSendSupportMessage(activeTicket, {
          sender: 'bot',
          senderName: 'BEE4 Support Assistant',
          text: aiRes.replyText,
        });
      }
      return;
    }

    // Case 2: Instant AI Assistant mode (pre-token or lightweight query)
    const userMsg: DraftChatMessage = {
      id: `draft-u-${Date.now()}`,
      sender: 'customer',
      senderName: customer.fullName,
      text: clean,
      createdAt: now,
    };

    const aiRes = generateAiSupportReply({
      query: clean,
      customer,
      customerOrders,
      products,
      settings,
      coupons,
    });

    const botMsg: DraftChatMessage = {
      id: `draft-b-${Date.now() + 1}`,
      sender: 'bot',
      senderName: 'BEE4 Support Assistant',
      text: aiRes.replyText,
      createdAt: new Date(Date.now() + 150).toISOString(),
    };

    setDraftMessages((prev) => [...prev, userMsg, botMsg]);
    setSuggestedTopic(aiRes.detectedTopic);
    if (aiRes.linkedOrderNumber) {
      setSuggestedOrderNo(aiRes.linkedOrderNumber);
    }
    setHighlightEscalation(aiRes.suggestExecutiveHandoff);
  };

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    handleSendText(inputText);
  };

  const handleCloseActiveTicket = () => {
    if (!activeTicket || activeTicket.status === 'Closed') return;
    const now = new Date().toISOString();
    const closed: SupportTicketRecord = {
      ...activeTicket,
      status: 'Closed',
      needsExecutive: false,
      closedBy: 'Customer',
      closedAt: now,
      updatedAt: now,
    };
    onUpdateSupportTicket(closed);
    onSendSupportMessage(closed, {
      sender: 'bot',
      senderName: 'BEE4 Support Assistant',
      text: `Token #${closed.tokenNumber} has been marked resolved and closed. Thank you for chatting with BEE4 Support! Please share a quick star rating below.`,
    });
  };

  const handleReopenActiveTicket = () => {
    if (!activeTicket || activeTicket.status !== 'Closed') return;
    const now = new Date().toISOString();
    const reopened: SupportTicketRecord = {
      ...activeTicket,
      status: 'Waiting for Executive',
      needsExecutive: true,
      closedAt: undefined,
      closedBy: undefined,
      updatedAt: now,
    };
    onUpdateSupportTicket(reopened);
    onSendSupportMessage(reopened, {
      sender: 'bot',
      senderName: 'BEE4 Support Assistant',
      text: `Token #${reopened.tokenNumber} has been reopened and routed back to a BEE4 Executive.`,
    });
  };

  const handleSubmitRating = (e: FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;
    onUpdateSupportTicket({
      ...activeTicket,
      satisfactionRating: ratingSelection,
      satisfactionFeedback: ratingFeedback.trim() || undefined,
      updatedAt: new Date().toISOString(),
    });
    setRatingSavedNotice(true);
  };

  const isClosed = activeTicket?.status === 'Closed';
  const hasOpenExecutiveToken = Boolean(
    activeTicket && activeTicket.status !== 'Closed' && activeTicket.needsExecutive
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      {/* Live Chat Header */}
      <div className="px-4 sm:px-5 py-3.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center shrink-0">
            {hasOpenExecutiveToken ? (
              <Headphones className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            ) : (
              <Bot className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                BEE4 Live Support Chat
              </h2>
              {activeTicket ? (
                <span
                  data-testid="active-support-token-badge"
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border tabular-nums ${
                    activeTicket.status === 'Closed'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700/50'
                  }`}
                >
                  <Ticket className="w-3 h-3" />
                  <span>
                    Token #{activeTicket.tokenNumber} · {formatSupportStatusLabel(activeTicket.status)}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">
                  <Sparkles className="w-3 h-3" />
                  AI Assistant Online
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {hasOpenExecutiveToken
                ? 'Two-way live sync active with BEE4 Support Executive'
                : 'Instant answers from live store data · 1-tap human executive handoff'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTicket && !isClosed && (
            <button
              type="button"
              onClick={handleCloseActiveTicket}
              className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Resolved &amp; Close Token</span>
            </button>
          )}
          {activeTicket && (
            <button
              type="button"
              onClick={handleStartNewAssistantChat}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Existing Tokens Bar (if customer has raised 1+ tokens) */}
      {myTickets.length > 0 && (
        <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
            My Tokens ({myTickets.length}):
          </span>
          {myTickets.map((t) => {
            const selected = activeTicket?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTicketId(t.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap transition-colors tabular-nums ${
                  selected
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-900 dark:border-white'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                }`}
              >
                #{t.tokenNumber} · {t.status === 'Closed' ? 'Closed' : 'Open'}
              </button>
            );
          })}
        </div>
      )}

      {/* Chat Messages Viewport */}
      <div
        aria-label="Live support conversation"
        className="h-[340px] sm:h-[380px] overflow-y-auto px-4 sm:px-5 py-4 space-y-3.5 bg-[#F4F6F8] dark:bg-slate-950/60"
      >
        {activeThreadMessages.map((msg) => {
          const isCustomer = msg.sender === 'customer';
          const isExec = msg.sender === 'executive';
          return (
            <div
              key={msg.id}
              className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed border ${
                  isCustomer
                    ? 'bg-slate-900 dark:bg-amber-600 text-white border-slate-900 dark:border-amber-600 rounded-br-sm'
                    : isExec
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-slate-900 dark:text-emerald-50 border-emerald-200 dark:border-emerald-700/60 rounded-bl-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800 rounded-bl-sm'
                }`}
              >
                <div
                  className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mb-1 ${
                    isCustomer
                      ? 'text-slate-300 dark:text-amber-100'
                      : isExec
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {isCustomer ? (
                    <User className="w-3 h-3" />
                  ) : isExec ? (
                    <Headphones className="w-3 h-3" />
                  ) : (
                    <Bot className="w-3 h-3" />
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
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Quick-Tap Prompt Chips & Executive Escalation Bar */}
      {!isClosed && (
        <div className="px-4 sm:px-5 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {SUPPORT_QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendText(chip)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {!hasOpenExecutiveToken && (
            <div
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                highlightEscalation
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60'
                  : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-700 dark:text-slate-200">
                <span className="font-bold text-slate-900 dark:text-white">
                  Need a human specialist?
                </span>{' '}
                Raise a Support Token to chat live with a BEE4 Executive.
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRaiseExecutiveToken()}
                  className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Raise Support Token / Chat with Executive</span>
                </button>
              </div>
            </div>
          )}

          {/* Message Input Composer */}
          <form onSubmit={handleSubmitForm} className="flex items-center gap-2">
            <label htmlFor="bee4-live-support-input" className="sr-only">
              Type your support message
            </label>
            <input
              id="bee4-live-support-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                hasOpenExecutiveToken
                  ? `Reply to BEE4 Executive on Token #${activeTicket?.tokenNumber}...`
                  : 'Ask BEE4 Assistant about orders, returns, Eco-PLA care, coupons...'
              }
              className="flex-1 h-10 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              aria-label="Send support message"
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Closed Token State + Rate Your Support Experience */}
      {isClosed && activeTicket && (
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-700 dark:text-slate-200">
              <strong className="text-slate-900 dark:text-white">
                Token #{activeTicket.tokenNumber} is Closed.
              </strong>{' '}
              Need more help on this issue? Reopen anytime.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReopenActiveTicket}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:border-amber-500"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Token</span>
              </button>
              <a
                href={buildWhatsAppUrl(
                  `Hi BEE4! Following up on Support Token #${activeTicket.tokenNumber}.`,
                  whatsappNumber
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          <form
            onSubmit={handleSubmitRating}
            className="p-4 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50/60 dark:bg-amber-950/20 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Rate Your Support Experience
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  How helpful was BEE4 Support for Token #{activeTicket.tokenNumber}?
                </p>
              </div>
              {(ratingSavedNotice || activeTicket.satisfactionRating) && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold">
                  Rated {activeTicket.satisfactionRating ?? ratingSelection} / 5 ★
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {RATING_STARS.map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingSelection(star)}
                  aria-label={`Rate support ${star} out of 5 stars`}
                  className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 inline-flex items-center justify-center hover:border-amber-500"
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= ratingSelection
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold tabular-nums text-slate-800 dark:text-slate-100">
                {ratingSelection}.0 / 5
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="Optional feedback for Team BEE4..."
                className="flex-1 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 h-9 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0"
              >
                {activeTicket.satisfactionRating ? 'Update Rating' : 'Submit Rating'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
