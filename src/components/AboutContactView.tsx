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
          <p className="text-xs font-semibold tracking-wide text-amber-700">
            About BEE4
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-zinc-900 text-balance">
            Built for thoughtful gifting and joyful everyday living in India.
          </h1>
          <p className="text-base text-zinc-600 leading-relaxed">
            BEE4 brings together two worlds we love: smart, minimalist daily essentials like
            insulated bottles, structured canvas bags, and tidy desk gear — alongside playful
            3D-printed toys and handmade clay showpieces crafted by small Indian workshops.
          </p>
          <p className="text-base text-zinc-600 leading-relaxed">
            Every product on our shelf is priced honestly between ₹199 and ₹999 so picking up a
            birthday surprise, Diwali hamper, or desk upgrade never feels out of reach.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="px-6 py-3 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
            >
              Browse the Catalog
            </button>
            <button
              type="button"
              onClick={() => onNavigate('gifts')}
              className="px-5 py-3 rounded-xl glass-btn-secondary text-zinc-900 text-sm font-semibold transition-all"
            >
              Explore Gift Ideas
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="p-2.5 rounded-3xl glass-surface">
            <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-white/40 border border-white/60">
              <ProductImage
                src={HERO_IMAGE}
                alt="BEE4 studio curation flat-lay"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl glass-surface">
          <h2 className="font-display text-lg font-bold text-zinc-900">Honest Everyday Pricing</h2>
          <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
            Transparent ₹199–₹999 pricing with free pan-India shipping above ₹499 and zero hidden
            handling fees.
          </p>
        </div>
        <div className="p-6 rounded-3xl glass-surface">
          <h2 className="font-display text-lg font-bold text-zinc-900">Curated Quality Checks</h2>
          <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
            Every bottle seal, handbag stitch, 3D print finish, and terracotta piece is inspected
            in Bengaluru before dispatch.
          </p>
        </div>
        <div className="p-6 rounded-3xl glass-surface">
          <h2 className="font-display text-lg font-bold text-zinc-900">Gift-Ready Packaging</h2>
          <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
            Plastic-minimal cushioning with optional kraft gift wrap and handwritten note cards for
            birthdays and festivals.
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
            <p className="text-xs font-semibold tracking-wide text-amber-700">
              Contact BEE4
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-zinc-900">
              Questions, bulk gifting, or order help?
            </h1>
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
              We reply within a few hours Monday to Saturday, 10 AM – 7 PM IST. Message us on
              WhatsApp for instant gift suggestions or festival hamper customization.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
              <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">WhatsApp Concierge</p>
                <p className="text-xs text-zinc-600 tabular-nums mt-0.5">
                  {formatWhatsAppDisplay(whatsappNumber)}
                </p>
                <a
                  href={buildWhatsAppUrl(
                    'Hi BEE4! I have a question about a product or bulk gift order.',
                    whatsappNumber
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-4"
                >
                  Chat on WhatsApp →
                </a>
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
              <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Email Support</p>
                <p className="text-xs text-zinc-600 mt-0.5">{supportEmail}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
              <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">Dispatch Studio</p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Indiranagar 100 Feet Road, Bengaluru 560038
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 glass-surface rounded-3xl p-6 sm:p-8">
          {sent ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto" />
              <h2 className="font-display text-2xl font-bold text-zinc-900">Message Received</h2>
              <p className="text-sm text-zinc-600 max-w-md mx-auto">
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
                className="mt-4 px-5 py-2.5 rounded-xl glass-btn-secondary text-zinc-900 text-sm font-semibold"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-display text-xl font-bold text-zinc-900">Send Us a Note</h2>

              {error && (
                <p className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700">
                  {error}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="block text-xs font-semibold text-zinc-700 mb-1.5">
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
                  <label htmlFor="contact-info" className="block text-xs font-semibold text-zinc-700 mb-1.5">
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
                <label htmlFor="contact-topic" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Topic
                </label>
                <select
                  id="contact-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                >
                  <option value="Order Support">Order Support &amp; Tracking</option>
                  <option value="Bulk / Festival Gifting">Bulk / Birthday / Festival Gifting</option>
                  <option value="Product Question">Product Question</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Message *
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you're looking for..."
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
