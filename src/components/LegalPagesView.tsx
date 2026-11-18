import { ArrowLeft, FileText, Lock, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { StorePage } from '../types';

export type LegalPageKind =
  | 'legal-terms'
  | 'legal-privacy'
  | 'legal-returns'
  | 'legal-shipping'
  | 'legal-copyright';

interface LegalPagesViewProps {
  page: LegalPageKind;
  supportEmail: string;
  onNavigate: (page: StorePage) => void;
}

const LEGAL_TABS: { page: LegalPageKind; label: string }[] = [
  { page: 'legal-terms', label: 'Terms & Conditions' },
  { page: 'legal-privacy', label: 'Privacy Policy' },
  { page: 'legal-returns', label: 'Returns & Refunds' },
  { page: 'legal-shipping', label: 'Shipping Policy' },
  { page: 'legal-copyright', label: 'Copyrights & IP' },
];

export function LegalPagesView({ page, supportEmail, onNavigate }: LegalPagesViewProps) {
  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-6 pt-6 pb-28">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to BEE4 Store</span>
        </button>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
          BEE4 Official Policies
        </span>
      </div>

      {/* Horizontal quick switcher across legal documents */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-5">
        {LEGAL_TABS.map((tab) => {
          const active = tab.page === page;
          return (
            <button
              key={tab.page}
              type="button"
              onClick={() => onNavigate(tab.page)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors shrink-0 ${
                active
                  ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 border-slate-900 dark:border-amber-500'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <article className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm">
        {page === 'legal-terms' && (
          <div className="space-y-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-amber-600 shrink-0" />
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                BEE4 Terms &amp; Conditions
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Applicable to orders placed on bee4.in · Operated by BEE4 Studio, Banka, Bihar 813103
            </p>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                1. Product Craftsmanship &amp; Material Care
              </h2>
              <p>
                Every BEE4 puzzle, wall clock, custom lithophane, and desk accessory is additive-manufactured in small batches using plant-based Bio-PLA+ or PETG. Subtle 3D layer lines are natural hallmarks of precision studio printing. Keep PLA+ products indoors and away from sustained heat above 55°C (such as parked car dashboards or direct noon sunlight).
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                2. Orders, Pricing &amp; Taxes
              </h2>
              <p>
                All prices on BEE4 are listed in Indian Rupees (INR). Applicable GST is included or itemized on your downloadable tax invoice. BEE4 reserves the right to restrict accounts engaged in automated abuse, fraudulent chargebacks, or repeated non-accepted Cash-on-Delivery shipments.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                3. Verified Buyer Reviews
              </h2>
              <p>
                To keep ratings authentic and helpful, product ratings and reviews on BEE4 can only be submitted by verified customers whose order for that specific product has reached Delivered status.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                4. Governing Law
              </h2>
              <p>
                These terms are governed by the laws of India. Any dispute shall be subject to the jurisdiction of competent courts in Bihar, India. For assistance, write to {supportEmail}.
              </p>
            </section>
          </div>
        )}

        {page === 'legal-privacy' && (
          <div className="space-y-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2.5">
              <Lock className="w-5 h-5 text-amber-600 shrink-0" />
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                BEE4 Privacy Policy
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              How your personal details and custom photo uploads are protected on BEE4
            </p>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                1. Information We Collect
              </h2>
              <p>
                When you create a BEE4 Account or place an order, we collect your name, phone number, optional email ID, shipping address, and custom design instructions strictly needed to manufacture and deliver your products.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                2. Custom Lithophane &amp; Engraving Uploads
              </h2>
              <p>
                Photos and text uploaded for custom 3D lithophanes or embossers are used exclusively to slice and print your order. BEE4 never sells, publishes, or shares customer photos without explicit permission.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                3. Account Security &amp; Data Requests
              </h2>
              <p>
                You can review saved addresses, manage active sign-in devices, or request account deactivation directly from your BEE4 Account Privacy Center or by contacting {supportEmail}.
              </p>
            </section>
          </div>
        )}

        {page === 'legal-returns' && (
          <div className="space-y-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-5 h-5 text-amber-600 shrink-0" />
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Return, Replacement &amp; Refund Policy
              </h1>
            </div>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                1. 7-Day Transit Protection Guarantee
              </h2>
              <p>
                If your order arrives damaged in transit, has a missing puzzle part, or differs from your selected variant, request a free instant replacement or refund within 7 days of delivery from My Orders.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                2. Custom &amp; Personalized Products
              </h2>
              <p>
                Personalized lithophanes and custom business-card embossers are printed specifically from your artwork and are eligible for free replacement if damaged in shipping or printed with an incorrect design.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                3. Refund Timelines &amp; BEE4 Wallet Credits
              </h2>
              <p>
                Prepaid UPI refunds and approved return credits are processed within 3–5 business days to your original UPI ID or credited immediately to your BEE4 Wallet Balance.
              </p>
            </section>
          </div>
        )}

        {page === 'legal-shipping' && (
          <div className="space-y-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2.5">
              <Truck className="w-5 h-5 text-amber-600 shrink-0" />
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Shipping &amp; Dispatch Policy
              </h1>
            </div>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                1. Small-Batch Dispatch Times
              </h2>
              <p>
                In-stock items dispatch from our Banka, Bihar studio within 24–48 business hours. Personalized 3D lithophanes and embossers take 2–3 business days for custom slicing, printing, and quality inspection before dispatch.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                2. Delivery Windows &amp; Tracking
              </h2>
              <p>
                Metro deliveries across India arrive in 3–5 business days; non-metro and remote PIN codes take 5–7 business days via trusted national couriers. Live tracking details and GST invoices are accessible anytime in My Orders.
              </p>
            </section>
          </div>
        )}

        {page === 'legal-copyright' && (
          <div className="space-y-5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Copyrights, Brand Rights &amp; Intellectual Property
              </h1>
            </div>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                1. BEE4 Trademark &amp; Original Content
              </h2>
              <p>
                All BEE4 trademarks, brand wordmarks, product photography, assembly guides, curated packaging artwork, and custom studio product configurations published on bee4.in are the intellectual property of BEE4 Studio.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="font-semibold text-base text-slate-900 dark:text-white">
                2. Prohibited Reproduction
              </h2>
              <p>
                Unauthorized resale using BEE4 brand identity, automated scraping, or commercial redistribution of BEE4 product imagery without written studio consent is strictly prohibited. To report IP questions, contact {supportEmail}.
              </p>
            </section>
          </div>
        )}
      </article>
    </div>
  );
}
