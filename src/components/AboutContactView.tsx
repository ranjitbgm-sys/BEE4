import { FormEvent, useState } from 'react';
import { CheckCircle2, Mail, MapPin, MessageCircle, Send, Sparkles } from 'lucide-react';
import { HERO_IMAGE } from '../data/catalog';
import {
  CustomerMessageRecord,
  CustomerMessageTopic,
  StorePage,
} from '../types';
import {
  CUSTOMER_MESSAGE_TOPICS,
  CustomerNoteFormErrors,
  validateCustomerNoteForm,
} from '../utils/messagesReviewsLogic';
import { buildWhatsAppUrl, formatWhatsAppDisplay } from '../utils/storeLogic';
import { ProductImage } from './ProductImage';

interface AboutViewProps {
  onNavigate: (page: StorePage) => void;
}

export function AboutView({ onNavigate }: AboutViewProps) {
  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-xs font-semibold tracking-wide text-amber-700 dark:text-amber-400">
            About BEE4 · bee4.in
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white text-balance">
            East-Asian screen-free brain-training toys crafted for curious minds worldwide.
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
            BEE4 brings Japan&apos;s Karakuri and Kumiki precision, Korea&apos;s spatial Gabe &amp;
            Chilgyo math blocks, and China&apos;s binary-STEM logic boards to families across India,
            the US, and the UK — small-batch 3D-printed using plant-derived Bio-PLA.
          </p>
          <p className="text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Every mechanical toy is thoughtfully priced between ₹349 and ₹899 so parents worldwide
            have an authentic, durable, zero-screen alternative to passive tablet time.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="px-6 py-3 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
            >
              Explore All 16 Toys
            </button>
            <button
              type="button"
              onClick={() => onNavigate('gifts')}
              className="px-5 py-3 rounded-xl glass-btn-secondary text-zinc-900 dark:text-white text-sm font-semibold transition-all"
            >
              Browse Gift Picks
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="p-2.5 rounded-3xl glass-surface">
            <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-white/40 dark:bg-slate-900/60 border border-white/60 dark:border-white/15">
              <ProductImage
                src={HERO_IMAGE}
                alt="BEE4 custom 3D-printed East-Asian brain toys collection"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl glass-surface">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
            Custom 3D-Printed in India
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Each gear, dovetail track, and polycube is tuned and inspected in Banka, Bihar for
            crisp mechanical tolerances between ₹349 and ₹899.
          </p>
        </div>
        <div className="p-6 rounded-3xl glass-surface">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
            Science-Backed Age Progression
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Structured across 4 developmental tiers (3–5, 6–8, 9–11, and 12–15 years) covering
            Motor Skills, Engineering, Maths &amp; Science, and Imagination.
          </p>
        </div>
        <div className="p-6 rounded-3xl glass-surface">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
            100% Screen-Free Engagement
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Zero batteries, zero notifications — real tactile gears, steel marbles, and hidden
            mechanisms that keep kids absorbed for hours.
          </p>
        </div>
      </div>
    </section>
  );
}

interface ContactViewProps {
  whatsappNumber: string;
  supportEmail: string;
  onSubmitInquiry?: (inquiry: {
    name: string;
    contact: string;
    topic: string;
    message: string;
  }) => void;
  onSubmitCustomerMessage?: (msg: CustomerMessageRecord) => void;
}

export function ContactView({
  whatsappNumber,
  supportEmail,
  onSubmitInquiry,
  onSubmitCustomerMessage,
}: ContactViewProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<CustomerMessageTopic>('Order Status Inquiry');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<CustomerNoteFormErrors>({});
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validateCustomerNoteForm({
      customerName,
      phone,
      email,
      topic,
      message,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      setSent(false);
      return;
    }

    const now = new Date().toISOString();
    const cleanName = customerName.trim();
    const cleanEmail = email.trim();
    const cleanMessage = message.trim();

    const record: CustomerMessageRecord = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerName: cleanName,
      phone: validation.normalizedPhone,
      email: cleanEmail || undefined,
      topic,
      message: cleanMessage,
      status: 'Unread',
      adminNote: '',
      createdAt: now,
      updatedAt: now,
    };

    onSubmitCustomerMessage?.(record);
    onSubmitInquiry?.({
      name: cleanName,
      contact: cleanEmail ? `${validation.normalizedPhone} · ${cleanEmail}` : validation.normalizedPhone,
      topic,
      message: cleanMessage,
    });

    setCustomerName('');
    setPhone('');
    setEmail('');
    setTopic('Order Status Inquiry');
    setMessage('');
    setErrors({});
    setSent(true);
  };

  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-xs font-semibold tracking-wide text-amber-700 dark:text-amber-400">
              Contact BEE4
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-zinc-900 dark:text-white">
              Age recommendations, school STEM kits, or order help?
            </h1>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              We reply within a few hours Monday to Saturday, 10 AM – 7 PM IST. Message us on
              WhatsApp for personalised toy suggestions by age or bulk return-gift inquiries.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
              <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  WhatsApp Concierge
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 tabular-nums mt-0.5">
                  {formatWhatsAppDisplay(whatsappNumber)}
                </p>
                <a
                  href={buildWhatsAppUrl(
                    'Hi BEE4! Please suggest an age-appropriate brain-training toy.',
                    whatsappNumber
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline underline-offset-4"
                >
                  Chat on WhatsApp →
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
              <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Email Support</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">{supportEmail}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
              <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  3D Print &amp; Dispatch Studio
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  Banka, Bihar, India 813103
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 glass-surface rounded-3xl p-6 sm:p-8">
          {sent ? (
            <div
              role="status"
              className="py-10 px-4 text-center space-y-4 animate-[fadeIn_0.35s_ease-out]"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-subtle text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Saved directly to BEE4 Studio Inbox</span>
              </div>
              <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white text-balance">
                Note Delivered to Team BEE4
              </h2>
              <p className="text-sm sm:text-base font-medium text-zinc-700 dark:text-zinc-200 max-w-md mx-auto leading-relaxed">
                Dhanyavaad! Your note has reached Team BEE4. We&apos;ll reply on WhatsApp/Email
                shortly.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-2 px-5 py-2.5 rounded-xl glass-btn-secondary text-zinc-900 dark:text-white text-sm font-semibold transition-all"
              >
                Send Another Note
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
                  Send Us a Note
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Reaches our Banka 3D-print studio team immediately for WhatsApp or Email follow-up.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                  >
                    Customer Name *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (errors.customerName) setErrors({ ...errors, customerName: undefined });
                    }}
                    placeholder="e.g. Kabir Mehta"
                    className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {errors.customerName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contact-phone"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                  >
                    Phone / WhatsApp Number (10 digits) *
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    inputMode="numeric"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors({ ...errors, phone: undefined });
                    }}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl tabular-nums focus:outline-none"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                  >
                    Email Address (Optional)
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="contact-topic"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                  >
                    Topic / Subject *
                  </label>
                  <select
                    id="contact-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value as CustomerMessageTopic)}
                    className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                  >
                    {CUSTOMER_MESSAGE_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                >
                  Message / Note *
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    if (errors.message) setErrors({ ...errors, message: undefined });
                  }}
                  placeholder="Share your child's age, custom 3D print gift idea, order ID, or school kit inquiry..."
                  className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl glass-btn-amber text-white text-sm font-semibold inline-flex items-center gap-2 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Send Note to Team BEE4</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
