import { FormEvent, useState } from 'react';
import {
  Check,
  Copy,
  Database,
  History,
  Inbox,
  KeyRound,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type {
  AdminAuditLog,
  CustomerInquiry,
  PrimaryStoreCategory,
  StoreSettings,
} from '../../types';
import { DEFAULT_STORE_SETTINGS } from '../../data/catalog';
import { buildSupabaseSetupSql, supabaseDiagnostics } from '../../lib/supabase';
import { validateAdminPasswordChange } from '../../utils/adminAuth';
import { normalizeWhatsAppNumber } from '../../utils/storeLogic';

interface AdminSettingsTabProps {
  settings: StoreSettings;
  adminPasswordHash: string;
  inquiries: CustomerInquiry[];
  auditLogs: AdminAuditLog[];
  onUpdateSettings: (next: StoreSettings) => void;
  onChangeAdminPasswordHash: (nextHash: string) => void;
  onToggleInquiryStatus: (id: string) => void;
  onOpenMessagesReviews?: () => void;
  onSyncCatalogToCloud?: () => Promise<void>;
  onPurgeTestData?: () => Promise<{ clearedTables: string[]; errors: string[] }>;
}

const ALL_PRIMARY_CATS: PrimaryStoreCategory[] = [
  'Brain-Training Toys',
  '3D Home Decor',
  'Stainless Steel Flasks',
  'Lifestyle Gear',
];

const ENV_TEMPLATE_SNIPPET = `VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-public-key"
VITE_ADMIN_EMAIL="ranjitbgm@gmail.com"
VITE_ADMIN_ALLOWED_EMAILS="ranjitbgm@gmail.com,bee4official@gmail.com"`;

export function AdminSettingsTab({
  settings,
  adminPasswordHash,
  inquiries,
  auditLogs,
  onUpdateSettings,
  onChangeAdminPasswordHash,
  onToggleInquiryStatus,
  onOpenMessagesReviews,
  onSyncCatalogToCloud,
  onPurgeTestData,
}: AdminSettingsTabProps) {
  const [settingsTab, setSettingsTab] = useState<'cms' | 'supabase-sql'>('cms');
  const [waDraft, setWaDraft] = useState(() => settings.whatsappNumber.replace(/^91/, ''));
  const [emailDraft, setEmailDraft] = useState(settings.supportEmail);
  const [announcementEnabled, setAnnouncementEnabled] = useState(
    settings.announcementEnabled ?? DEFAULT_STORE_SETTINGS.announcementEnabled
  );
  const [bannerDraft, setBannerDraft] = useState(settings.announcementText);
  const [heroHeadline, setHeroHeadline] = useState(
    settings.heroHeadline ?? DEFAULT_STORE_SETTINGS.heroHeadline
  );
  const [heroSubheadline, setHeroSubheadline] = useState(
    settings.heroSubheadline ?? DEFAULT_STORE_SETTINGS.heroSubheadline
  );
  const [heroCtaText, setHeroCtaText] = useState(
    settings.heroCtaText ?? DEFAULT_STORE_SETTINGS.heroCtaText
  );
  const [featuredBannerEnabled, setFeaturedBannerEnabled] = useState(
    settings.featuredBannerEnabled ?? DEFAULT_STORE_SETTINGS.featuredBannerEnabled
  );
  const [visibleCategories, setVisibleCategories] = useState<PrimaryStoreCategory[]>(
    settings.visibleCategories ?? DEFAULT_STORE_SETTINGS.visibleCategories
  );
  const [shippingThreshold, setShippingThreshold] = useState(String(settings.freeShippingThreshold));
  const [stdShipFee, setStdShipFee] = useState(
    String(settings.standardShippingFee ?? DEFAULT_STORE_SETTINGS.standardShippingFee)
  );
  const [codFee, setCodFee] = useState(
    String(settings.codHandlingFee ?? DEFAULT_STORE_SETTINGS.codHandlingFee)
  );
  const [upiEnabled, setUpiEnabled] = useState(settings.upiEnabled ?? true);
  const [codEnabled, setCodEnabled] = useState(settings.codEnabled ?? true);
  const [whatsappOrderEnabled, setWhatsappOrderEnabled] = useState(
    settings.whatsappOrderEnabled ?? true
  );
  const [upiVpa, setUpiVpa] = useState(settings.upiVpa ?? DEFAULT_STORE_SETTINGS.upiVpa);
  const [promoCodeDraft, setPromoCodeDraft] = useState(settings.promoCode);
  const [promoPctDraft, setPromoPctDraft] = useState(String(settings.promoDiscountPercent));
  const [settingsError, setSettingsError] = useState('');

  // Passphrase draft
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncingSql, setSyncingSql] = useState(false);
  const [confirmPurgeStep, setConfirmPurgeStep] = useState(false);
  const [purgingData, setPurgingData] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState('');
  const supabaseSetupSql = buildSupabaseSetupSql(supabaseDiagnostics.adminEmail);

  const toggleCategoryVisibility = (cat: PrimaryStoreCategory) => {
    setVisibleCategories((prev) =>
      prev.includes(cat) ? (prev.length > 1 ? prev.filter((c) => c !== cat) : prev) : [...prev, cat]
    );
  };

  const handleSaveCmsAndPayments = (e: FormEvent) => {
    e.preventDefault();
    const digits = waDraft.replace(/\D/g, '');
    if (!/^([6-9]\d{9}|91[6-9]\d{9})$/.test(digits)) {
      setSettingsError('Enter a valid 10-digit Indian WhatsApp number.');
      return;
    }

    onUpdateSettings({
      ...settings,
      whatsappNumber: normalizeWhatsAppNumber(digits),
      supportEmail: emailDraft.trim() || 'hello@bee4.in',
      announcementEnabled,
      announcementText: bannerDraft.trim() || DEFAULT_STORE_SETTINGS.announcementText,
      heroHeadline: heroHeadline.trim() || DEFAULT_STORE_SETTINGS.heroHeadline,
      heroSubheadline: heroSubheadline.trim() || DEFAULT_STORE_SETTINGS.heroSubheadline,
      heroCtaText: heroCtaText.trim() || DEFAULT_STORE_SETTINGS.heroCtaText,
      featuredBannerEnabled,
      visibleCategories,
      freeShippingThreshold: Math.max(0, Math.round(Number(shippingThreshold) || 0)),
      standardShippingFee: Math.max(0, Math.round(Number(stdShipFee) || 0)),
      codHandlingFee: Math.max(0, Math.round(Number(codFee) || 0)),
      upiEnabled,
      codEnabled,
      whatsappOrderEnabled,
      upiVpa: upiVpa.trim() || 'bee4studio@okaxis',
      promoCode: promoCodeDraft.trim().toUpperCase(),
      promoDiscountPercent: Math.max(0, Math.min(80, Math.round(Number(promoPctDraft) || 0))),
    });
    setSettingsError('');
  };

  const handleUpdatePassphrase = (e: FormEvent) => {
    e.preventDefault();
    const res = validateAdminPasswordChange({
      currentPassword: currPass,
      newPassword: newPass,
      confirmPassword: confirmPass,
      expectedHash: adminPasswordHash,
    });
    if (res.error || !res.nextHash) {
      setPassError(res.error || 'Could not update passphrase.');
      return;
    }
    onChangeAdminPasswordHash(res.nextHash);
    setCurrPass('');
    setNewPass('');
    setConfirmPass('');
    setPassError('');
  };

  const handleCopyEnv = async () => {
    try {
      await navigator.clipboard.writeText(ENV_TEMPLATE_SNIPPET);
      setCopiedEnv(true);
      window.setTimeout(() => setCopiedEnv(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(supabaseSetupSql);
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleExecutePurge = async () => {
    if (!onPurgeTestData) return;
    setPurgingData(true);
    setPurgeStatus('');
    try {
      const result = await onPurgeTestData();
      setConfirmPurgeStep(false);
      if (result.errors.length > 0) {
        setPurgeStatus(
          `Local caches cleared. Supabase warnings: ${result.errors.slice(0, 2).join('; ')}`
        );
      } else {
        setPurgeStatus(
          result.clearedTables.length > 0
            ? `Purged local test caches & cleared ${result.clearedTables.length} Supabase tables cleanly. 16 products & SMARTKID15 preserved.`
            : 'Cleared all local test caches cleanly. 16 products & SMARTKID15 preserved.'
        );
      }
    } finally {
      setPurgingData(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Section Sub-Navigation Tabs */}
      <div
        role="tablist"
        aria-label="Settings sections"
        className="inline-flex flex-wrap gap-1.5 p-1 rounded-2xl glass-subtle"
      >
        <button
          type="button"
          role="tab"
          aria-selected={settingsTab === 'cms'}
          onClick={() => setSettingsTab('cms')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
            settingsTab === 'cms' ? 'glass-btn-ink' : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Storefront CMS &amp; Security</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={settingsTab === 'supabase-sql'}
          onClick={() => setSettingsTab('supabase-sql')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
            settingsTab === 'supabase-sql' ? 'glass-btn-ink' : 'text-zinc-700 dark:text-zinc-300'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Supabase SQL &amp; Setup Guide</span>
        </button>
      </div>

      {settingsTab === 'supabase-sql' && (
        <div className="space-y-5">
          <div className="glass-surface rounded-3xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900/10 dark:border-white/10 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl glass-orb flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                    Supabase Free Plan — SQL Schema, RLS &amp; Storage Setup
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    100% compatible with Supabase Free Tier (Postgres + Realtime + public{' '}
                    <code>product-images</code> bucket).
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 self-start ${
                  supabaseDiagnostics.isConfigured
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    supabaseDiagnostics.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>
                  {supabaseDiagnostics.isConfigured
                    ? 'Connected to Supabase'
                    : 'LocalStorage Fallback Active'}
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {[
                {
                  step: 'Step 1',
                  title: 'Create Free Project',
                  body: 'Create a project at supabase.com (0 cost, 500MB DB + 1GB Storage).',
                },
                {
                  step: 'Step 2',
                  title: 'Run SQL Script',
                  body: 'Copy the SQL below and run it once in Supabase -> SQL Editor -> New Query.',
                },
                {
                  step: 'Step 3',
                  title: 'Set Env Variables',
                  body: 'Add VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_ADMIN_EMAIL.',
                },
                {
                  step: 'Step 4',
                  title: 'Seed & Go Live',
                  body: 'Sign in with admin email and click Sync Catalog to push all 16 SKUs & SMARTKID15.',
                },
              ].map((card) => (
                <div key={card.step} className="glass-subtle rounded-2xl p-3.5 space-y-1">
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    {card.step}
                  </p>
                  <p className="font-semibold text-zinc-900 dark:text-white">{card.title}</p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-300">{card.body}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  1-Click Copy: Complete Supabase Schema + Storage Bucket (<code>product-images</code>) + RLS Policies
                </span>
                <div className="flex items-center gap-2">
                  {supabaseDiagnostics.isConfigured && onSyncCatalogToCloud && (
                    <button
                      type="button"
                      disabled={syncingSql}
                      onClick={() => {
                        setSyncingSql(true);
                        void onSyncCatalogToCloud().finally(() => setSyncingSql(false));
                      }}
                      className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingSql ? 'animate-spin' : ''}`} />
                      <span>{syncingSql ? 'Syncing Seed Data...' : 'Push Seed Data to Supabase'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleCopySql()}
                    className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'SQL Script Copied!' : 'Copy Full Supabase SQL'}</span>
                  </button>
                </div>
              </div>
              <pre className="p-4 rounded-2xl glass-subtle text-[11px] font-mono overflow-x-auto max-h-[420px] text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {supabaseSetupSql}
              </pre>
            </div>
          </div>
        </div>
      )}

      {settingsTab === 'cms' && (
        <>
      {/* Live Storefront CMS & Payment Settings */}
      <form onSubmit={handleSaveCmsAndPayments} className="glass-surface rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-zinc-900/10 dark:border-white/10 pb-3">
          <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <div>
            <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">
              Storefront CMS, Payments &amp; Logistics Fees
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Updates sync in real time to bee4.in public Storefront &amp; Checkout
            </p>
          </div>
        </div>

        {settingsError && (
          <div className="p-3 rounded-xl bg-red-500/12 border border-red-500/30 text-xs font-medium text-red-700 dark:text-red-300">
            {settingsError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={announcementEnabled}
                onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
              <span>Show Top Announcement Banner</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={featuredBannerEnabled}
                onChange={(e) => setFeaturedBannerEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
              <span>Show Home Bestsellers Section</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="cms-announcement" className="block text-xs font-semibold mb-1">
              Top Announcement Bar Copy
            </label>
            <input
              id="cms-announcement"
              type="text"
              value={bannerDraft}
              onChange={(e) => setBannerDraft(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cms-hero-head" className="block text-xs font-semibold mb-1">
              Home Hero Headline
            </label>
            <input
              id="cms-hero-head"
              type="text"
              value={heroHeadline}
              onChange={(e) => setHeroHeadline(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cms-hero-cta" className="block text-xs font-semibold mb-1">
              Hero CTA Button Label
            </label>
            <input
              id="cms-hero-cta"
              type="text"
              value={heroCtaText}
              onChange={(e) => setHeroCtaText(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="cms-hero-sub" className="block text-xs font-semibold mb-1">
              Home Hero Subheadline
            </label>
            <input
              id="cms-hero-sub"
              type="text"
              value={heroSubheadline}
              onChange={(e) => setHeroSubheadline(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 glass-subtle rounded-2xl p-3.5 space-y-2">
            <p className="text-xs font-semibold">Visible Storefront Product Lines</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PRIMARY_CATS.map((cat) => {
                const active = visibleCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoryVisibility(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      active ? 'glass-btn-ink' : 'glass-btn-secondary'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="pay-wa" className="block text-xs font-semibold mb-1">
              Official WhatsApp (10 digits)
            </label>
            <input
              id="pay-wa"
              type="tel"
              value={waDraft}
              onChange={(e) => setWaDraft(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="pay-upi" className="block text-xs font-semibold mb-1">
              Studio UPI VPA
            </label>
            <input
              id="pay-upi"
              type="text"
              value={upiVpa}
              onChange={(e) => setUpiVpa(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="pay-email" className="block text-xs font-semibold mb-1">
              Support Email
            </label>
            <input
              id="pay-email"
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="fee-free" className="block text-[11px] font-semibold mb-1">
                Free Ship ₹
              </label>
              <input
                id="fee-free"
                type="number"
                value={shippingThreshold}
                onChange={(e) => setShippingThreshold(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="fee-std" className="block text-[11px] font-semibold mb-1">
                Shipping ₹
              </label>
              <input
                id="fee-std"
                type="number"
                value={stdShipFee}
                onChange={(e) => setStdShipFee(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="fee-cod" className="block text-[11px] font-semibold mb-1">
                COD Fee ₹
              </label>
              <input
                id="fee-cod"
                type="number"
                value={codFee}
                onChange={(e) => setCodFee(e.target.value)}
                className="w-full px-2.5 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cms-promo-code" className="block text-xs font-semibold mb-1">
              Default Featured Promo Code
            </label>
            <input
              id="cms-promo-code"
              type="text"
              value={promoCodeDraft}
              onChange={(e) => setPromoCodeDraft(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono uppercase focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cms-promo-pct" className="block text-xs font-semibold mb-1">
              Default Promo Discount (%)
            </label>
            <input
              id="cms-promo-pct"
              type="number"
              min={0}
              max={80}
              value={promoPctDraft}
              onChange={(e) => setPromoPctDraft(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-6 pt-1 text-xs font-semibold">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={upiEnabled}
                onChange={(e) => setUpiEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
              <span>Direct UPI / QR Enabled</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={codEnabled}
                onChange={(e) => setCodEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
              <span>Cash on Delivery (COD) Enabled</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={whatsappOrderEnabled}
                onChange={(e) => setWhatsappOrderEnabled(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
              <span>WhatsApp Quick Order Enabled</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold"
          >
            Publish Storefront CMS &amp; Fee Settings
          </button>
        </div>
      </form>

      {/* Customer Inquiries + Admin Passphrase + Audit Logs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Audit Trail */}
        <div className="lg:col-span-7 glass-surface rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
              Immutable Admin Audit Log ({auditLogs.length})
            </h3>
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-900/6 dark:divide-white/8 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                    {log.action}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {new Date(log.timestamp).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-zinc-800 dark:text-zinc-200">{log.summary}</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  By {log.adminEmail} · Entity {log.entityType}:{log.entityId}
                </p>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <p className="py-6 text-xs text-zinc-500 dark:text-zinc-400">
                0 audit actions logged yet. Admin changes are recorded here in real time.
              </p>
            )}
          </div>
        </div>

        {/* Security Passphrase & Environment Diagnostics */}
        <div className="lg:col-span-5 space-y-5">
          <form onSubmit={handleUpdatePassphrase} className="glass-surface rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                Studio Owner Passphrase
              </h3>
            </div>
            {passError && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">{passError}</p>
            )}
            <input
              type="password"
              value={currPass}
              onChange={(e) => setCurrPass(e.target.value)}
              placeholder="Current passphrase"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
            />
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="New passphrase (min 6 chars)"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
            />
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Confirm new passphrase"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
            />
            <button type="submit" className="w-full py-2 rounded-xl glass-btn-ink text-xs font-semibold">
              Update Studio Passphrase
            </button>
          </form>

          <div className="glass-surface rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Supabase &amp; Env Security Status</span>
              </span>
              <button
                type="button"
                onClick={() => void handleCopyEnv()}
                className="px-2.5 py-1 rounded-xl glass-btn-secondary text-[11px] font-semibold inline-flex items-center gap-1"
              >
                {copiedEnv ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEnv ? 'Copied .env' : 'Copy .env.example'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
              Active backend mode:{' '}
              <strong>
                {supabaseDiagnostics.isConfigured
                  ? 'Live Supabase Production (Clean Zero-Dummy Mode)'
                  : 'Local Clean Fallback (16 Real SKUs + SMARTKID15)'}
              </strong>
            </p>
            <pre className="p-3 rounded-2xl glass-subtle text-[10px] font-mono overflow-x-auto text-zinc-700 dark:text-zinc-300">
              {ENV_TEMPLATE_SNIPPET}
            </pre>
          </div>
        </div>
      </div>

      {/* Secure Reset & Purge Test Data Tool */}
      {onPurgeTestData && (
        <div className="glass-surface rounded-3xl p-5 space-y-3 border border-red-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white inline-flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span>Reset &amp; Purge Test Data</span>
              </h3>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Wipes any leftover orders, RMAs, customer notes, reviews, logs, and test customer rows locally &amp; in Supabase while preserving all 16 BEE4 products and <code className="font-mono font-semibold">SMARTKID15</code>.
              </p>
            </div>

            {!confirmPurgeStep ? (
              <button
                type="button"
                onClick={() => {
                  setConfirmPurgeStep(true);
                  setPurgeStatus('');
                }}
                className="px-4 py-2 rounded-xl glass-btn-secondary text-red-600 dark:text-red-400 text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Local Test Cache &amp; Purge Dummy Database Records</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={purgingData}
                  onClick={() => void handleExecutePurge()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60"
                >
                  {purgingData ? 'Purging Records...' : 'Confirm Permanent Purge'}
                </button>
                <button
                  type="button"
                  disabled={purgingData}
                  onClick={() => setConfirmPurgeStep(false)}
                  className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {purgeStatus && (
            <div
              role="status"
              className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-500/25 text-xs font-medium text-emerald-800 dark:text-emerald-200"
            >
              {purgeStatus}
            </div>
          )}
        </div>
      )}

      {/* Customer Inquiries Quick Inbox */}
      <div className="glass-surface rounded-3xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
              Customer &amp; School STEM Inquiries ({inquiries.length})
            </h3>
          </div>
          {onOpenMessagesReviews && (
            <button
              type="button"
              onClick={onOpenMessagesReviews}
              className="px-3 py-1.5 rounded-xl glass-btn-amber text-white text-xs font-semibold"
            >
              Open Messages &amp; Reviews Hub →
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {inquiries.map((inq) => (
            <div key={inq.id} className="glass-subtle rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">{inq.name}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {inq.topic} · {inq.contact}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleInquiryStatus(inq.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    inq.status === 'New'
                      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {inq.status}
                </button>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300">{inq.message}</p>
            </div>
          ))}
          {inquiries.length === 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
              0 STEM or bulk school inquiries yet.
            </p>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
