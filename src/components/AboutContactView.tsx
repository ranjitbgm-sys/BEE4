import { FormEvent, useState } from 'react';
import { CheckCircle2, Mail, MapPin, MessageCircle } from 'lucide-react';
import { HERO_IMAGE } from '../data/catalog';
import { StorePage } from '../types';
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
            Each gear, dovetail track, and polycube is tuned and inspected in Bengaluru for crisp
            mechanical tolerances between ₹349 and ₹899.
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
  onSubmitInquiry: (inquiry: {
    name: string;
    contact: string;
    topic: string;
    message: string;
  }) => void;
}

export function ContactView({
  whatsappNumber,
  supportEmail,
  onSubmitInquiry,
}: ContactViewProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [topic, setTopic] = useState('Order Support');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2 || contact.trim().length < 5 || message.trim().length < 5) {
      setError('Please fill in your name, phone or email, and a short message.');
      return;
    }
    setError('');
    onSubmitInquiry({
      name: name.trim(),
      contact: contact.trim(),
      topic,
      message: message.trim(),
    });
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
                  Indiranagar 100 Feet Road, Bengaluru 560038
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 glass-surface rounded-3xl p-6 sm:p-8">
          {sent ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 dark:text-emerald-400 mx-auto" />
              <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
                Message Received
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">
                Thanks {name}! Our team will get back to you at <strong>{contact}</strong> within 1
                business day.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setName('');
                  setContact('');
                  setMessage('');
                }}
                className="mt-4 px-5 py-2.5 rounded-xl glass-btn-secondary text-zinc-900 dark:text-white text-sm font-semibold"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-white">
                Send Us a Note
              </h2>

              {error && (
                <p className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                  >
                    Your Name *
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kabir Mehta"
                    className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contact-info"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                  >
                    Phone or Email *
                  </label>
                  <input
                    id="contact-info"
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+91 98... or email"
                    className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-topic"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                >
                  Topic
                </label>
                <select
                  id="contact-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                >
                  <option value="Order Support">Order Support &amp; Tracking</option>
                  <option value="Bulk / School STEM Kit">Bulk / School STEM &amp; Return Gifts</option>
                  <option value="Age Recommendation">Child Age Recommendation</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                >
                  Message *
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your child's age or school quantity inquiry..."
                  className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
