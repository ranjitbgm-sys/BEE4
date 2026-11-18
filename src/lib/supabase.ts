import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

export interface SupabaseEnvDiagnostics {
  isConfigured: boolean;
  source: 'env' | 'local-fallback';
  missingEnvKeys: string[];
  url: string;
  adminEmail: string;
}

function readEnvStr(key: string): string {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    return (env?.[key] ?? '').trim();
  } catch {
    return '';
  }
}

export function getAllowedAdminEmails(): string[] {
  const primary = readEnvStr('VITE_ADMIN_EMAIL');
  const rawList = readEnvStr('VITE_ADMIN_ALLOWED_EMAILS');
  const parsed = [primary, ...rawList.split(',')]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  for (const requiredEmail of ['ranjitbgm@gmail.com', 'bee4official@gmail.com']) {
    if (!parsed.includes(requiredEmail)) {
      parsed.push(requiredEmail);
    }
  }

  return Array.from(new Set(parsed));
}

export function getSupabaseEnvDiagnostics(): SupabaseEnvDiagnostics {
  const url = readEnvStr('VITE_SUPABASE_URL');
  const anonKey = readEnvStr('VITE_SUPABASE_ANON_KEY');
  const adminEmail = readEnvStr('VITE_ADMIN_EMAIL') || 'ranjitbgm@gmail.com';

  const missingEnvKeys: string[] = [];
  if (!url) missingEnvKeys.push('VITE_SUPABASE_URL');
  if (!anonKey) missingEnvKeys.push('VITE_SUPABASE_ANON_KEY');

  const isValidUrl = /^https?:\/\/.+/.test(url);
  const isConfigured = Boolean(isValidUrl && anonKey);

  return {
    isConfigured,
    source: isConfigured ? 'env' : 'local-fallback',
    missingEnvKeys,
    url,
    adminEmail,
  };
}

export const supabaseDiagnostics = getSupabaseEnvDiagnostics();

const supabaseUrl = readEnvStr('VITE_SUPABASE_URL');
const supabaseAnonKey = readEnvStr('VITE_SUPABASE_ANON_KEY');

export const supabase: SupabaseClient | null = supabaseDiagnostics.isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const SUPABASE_PRODUCT_BUCKET = 'product-images';

export function isSupabaseAdminUser(user: User | null): boolean {
  if (!user) return false;
  const userMetaAdmin =
    user.user_metadata?.is_admin === true ||
    user.app_metadata?.is_admin === true;
  if (userMetaAdmin) return true;

  const email = user.email?.trim().toLowerCase() ?? '';
  if (!email) return false;
  return getAllowedAdminEmails().includes(email);
}

export function buildSupabaseSetupSql(adminEmail?: string): string {
  const safeAdmin = (adminEmail || 'ranjitbgm@gmail.com').replace(/'/g, "''").toLowerCase();
  return `-- ============================================================================
-- BEE4 (bee4.in) Storefront & Admin Suite — Supabase Free Plan SQL Setup
-- Run this script once in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- 1. Profiles, Customers CRM & Admin Flag Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  email_verified boolean not null default false,
  email_confirmed_at timestamptz,
  full_name text not null default 'BEE4 Customer',
  phone text not null default '',
  preferred_payment text not null default 'upi',
  celebration_month text,
  wishlist_ids jsonb not null default '[]'::jsonb,
  addresses jsonb not null default '[]'::jsonb,
  wallet_balance numeric not null default 0,
  wallet_transactions jsonb not null default '[]'::jsonb,
  custom_designs jsonb not null default '[]'::jsonb,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email_verified boolean not null default false;
alter table public.profiles add column if not exists email_confirmed_at timestamptz;
alter table public.profiles add column if not exists wallet_balance numeric not null default 0;
alter table public.profiles add column if not exists wallet_transactions jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists custom_designs jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists first_name text not null default '';
alter table public.profiles add column if not exists last_name text not null default '';
alter table public.profiles add column if not exists gender text not null default 'Prefer not to say';
alter table public.profiles add column if not exists avatar_url text not null default '';
alter table public.profiles add column if not exists preferred_language text not null default 'en';
alter table public.profiles add column if not exists notification_preferences jsonb not null default '{"orderUpdates":true,"returnAlerts":true,"offersAndLaunches":false}'::jsonb;
alter table public.profiles add column if not exists saved_upi_ids jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists devices jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists account_status text not null default 'Active';
alter table public.profiles add column if not exists deactivation_requested boolean not null default false;
alter table public.profiles add column if not exists deactivation_requested_at timestamptz;
alter table public.profiles add column if not exists force_logged_out_at timestamptz;
alter table public.profiles add column if not exists ban_type text;
alter table public.profiles add column if not exists banned_until timestamptz;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists banned_at timestamptz;

create table if not exists public.customers (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null default 'BEE4 Customer',
  phone text not null default '',
  email text not null default '',
  email_verified boolean not null default false,
  email_confirmed_at timestamptz,
  preferred_payment text not null default 'UPI / Prepaid',
  celebration_month text,
  crm_flag text not null default 'Standard',
  addresses jsonb not null default '[]'::jsonb,
  wishlist_ids jsonb not null default '[]'::jsonb,
  wallet_balance numeric not null default 0,
  wallet_transactions jsonb not null default '[]'::jsonb,
  custom_designs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers add column if not exists email_verified boolean not null default false;
alter table public.customers add column if not exists email_confirmed_at timestamptz;
alter table public.customers add column if not exists wallet_balance numeric not null default 0;
alter table public.customers add column if not exists wallet_transactions jsonb not null default '[]'::jsonb;
alter table public.customers add column if not exists custom_designs jsonb not null default '[]'::jsonb;
alter table public.customers add column if not exists first_name text not null default '';
alter table public.customers add column if not exists last_name text not null default '';
alter table public.customers add column if not exists gender text not null default 'Prefer not to say';
alter table public.customers add column if not exists avatar_url text not null default '';
alter table public.customers add column if not exists preferred_language text not null default 'en';
alter table public.customers add column if not exists notification_preferences jsonb not null default '{"orderUpdates":true,"returnAlerts":true,"offersAndLaunches":false}'::jsonb;
alter table public.customers add column if not exists saved_upi_ids jsonb not null default '[]'::jsonb;
alter table public.customers add column if not exists devices jsonb not null default '[]'::jsonb;
alter table public.customers add column if not exists account_status text not null default 'Active';
alter table public.customers add column if not exists deactivation_requested boolean not null default false;
alter table public.customers add column if not exists deactivation_requested_at timestamptz;
alter table public.customers add column if not exists force_logged_out_at timestamptz;
alter table public.customers add column if not exists ban_type text;
alter table public.customers add column if not exists banned_until timestamptz;
alter table public.customers add column if not exists ban_reason text;
alter table public.customers add column if not exists banned_at timestamptz;

create or replace function public.is_bee4_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    lower(coalesce(auth.jwt() ->> 'email', '')) in ('${safeAdmin}', 'bee4official@gmail.com')
    or coalesce((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false) = true
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false) = true
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
$$;

-- 2. Products Table (16+ BEE4 Catalog SKUs + 3-Angle Gallery)
create table if not exists public.products (
  id text primary key,
  sku text not null,
  slug text not null,
  title text not null,
  primary_category text not null default 'Brain-Training Toys',
  category text not null,
  skills jsonb not null default '[]'::jsonb,
  age_group text not null,
  age_groups jsonb not null default '[]'::jsonb,
  origin_concept text not null default 'Japanese Brain-Training Toy',
  occasion text not null default 'Birthday',
  price numeric not null check (price >= 1),
  compare_at_price numeric,
  manufacturing_cost numeric not null default 0,
  image text not null,
  gallery_urls jsonb not null default '[]'::jsonb,
  variants jsonb not null default '["Standard Edition"]'::jsonb,
  short_spec text not null default '',
  description text not null default '',
  use_case_hi text not null default '',
  brain_benefits_hi text not null default '',
  why_parents_buy_hi text not null default '',
  materials text not null default '100% Non-Toxic Eco-PLA',
  care_instruction text not null default 'Keep away from >55C heat',
  dimensions text not null default 'Standard',
  weight_grams integer not null default 180,
  hsn_code text not null default '3926',
  stock_quantity integer not null default 12,
  low_stock_threshold integer not null default 5,
  giftable boolean not null default true,
  made_to_order boolean not null default false,
  status text not null default 'Active',
  damaged_scrap_count integer not null default 0,
  cogs_cost numeric,
  filament_cost_inr numeric,
  reserve_for_website integer not null default 0,
  marketplace_listings jsonb not null default '[]'::jsonb,
  curated_tags jsonb not null default '[]'::jsonb,
  in_stock boolean not null default true,
  featured boolean not null default false,
  tag text,
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists filament_cost_inr numeric;
alter table public.products add column if not exists curated_tags jsonb not null default '[]'::jsonb;

-- 3. Orders Table (Checkout + Omnichannel Fulfillment + Settlement + GST State Data)
create table if not exists public.orders (
  order_number text primary key,
  user_id uuid references auth.users(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  shipping_fee numeric not null default 0,
  gift_wrap_fee numeric not null default 0,
  cod_fee numeric not null default 0,
  total numeric not null default 0,
  wallet_amount_used numeric not null default 0,
  payment_method text not null default 'UPI / Prepaid',
  payment_status text not null default 'Paid',
  order_channel text not null default 'UPI / Prepaid',
  source_channel text not null default 'bee4.in',
  external_order_id text not null default '',
  coupon_code text not null default '',
  customer jsonb not null,
  gift_wrap boolean not null default false,
  gift_message text not null default '',
  status text not null default 'Pending',
  cancellation_reason text not null default '',
  cancelled_by text,
  cancelled_at timestamptz,
  fulfillment_stage text not null default 'New / Unverified',
  operational_bucket text not null default 'New / Upcoming',
  sla_dispatch_by timestamptz,
  label_generated_at timestamptz,
  picklist_generated_at timestamptz,
  courier_partner text not null default '',
  awb_number text not null default '',
  tracking_url text not null default '',
  internal_notes text not null default '',
  refund_status text not null default 'None',
  refunded_amount numeric not null default 0,
  packing_proof jsonb,
  settlement jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders alter column status set default 'Pending';
alter table public.orders add column if not exists wallet_amount_used numeric not null default 0;
alter table public.orders add column if not exists payment_status text not null default 'Paid';
alter table public.orders add column if not exists cancellation_reason text not null default '';
alter table public.orders add column if not exists cancelled_by text;
alter table public.orders add column if not exists cancelled_at timestamptz;

-- 4. Coupons Table (SMARTKID15)
create table if not exists public.coupons (
  id text primary key,
  code text not null unique,
  description text not null default '',
  discount_type text not null default 'percentage',
  value numeric not null default 10,
  min_order_value numeric not null default 0,
  prepaid_only boolean not null default false,
  usage_limit integer not null default 0,
  used_count integer not null default 0,
  expires_at text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- 5. Store Settings & Live CMS Table
create table if not exists public.store_settings (
  id text primary key default 'main',
  whatsapp_number text not null default '919800004004',
  support_email text not null default 'hello@bee4.in',
  announcement_text text not null default 'Free delivery across India on orders 499+',
  announcement_enabled boolean not null default true,
  hero_headline text not null default 'Screen-Free Brain-Training Toys Built for Sharp Young Minds.',
  hero_subheadline text not null default 'Small-batch 3D-printed puzzles crafted in Banka, Bihar.',
  hero_cta_text text not null default 'Explore Brain Toys',
  featured_banner_enabled boolean not null default true,
  visible_categories jsonb not null default '["Brain-Training Toys","3D Home Decor","Stainless Steel Flasks","Lifestyle Gear"]'::jsonb,
  free_shipping_threshold numeric not null default 499,
  standard_shipping_fee numeric not null default 49,
  cod_handling_fee numeric not null default 0,
  gift_wrap_fee numeric not null default 49,
  gift_wrap_enabled boolean not null default true,
  upi_enabled boolean not null default true,
  cod_enabled boolean not null default true,
  whatsapp_order_enabled boolean not null default true,
  upi_vpa text not null default 'bee4studio@okaxis',
  promo_code text not null default 'SMARTKID15',
  promo_discount_percent numeric not null default 15,
  gift_finder_weights jsonb not null default '{}'::jsonb,
  customer_panel_controls jsonb not null default '{"enableGiftCards":true,"enableLanguageSwitcher":true,"enableSelfServiceCancel":true,"enableProductQa":true}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.store_settings add column if not exists customer_panel_controls jsonb not null default '{"enableGiftCards":true,"enableLanguageSwitcher":true,"enableSelfServiceCancel":true,"enableProductQa":true}'::jsonb;

-- 6. Supporting Admin & Storefront Tables
create table if not exists public.print_jobs (
  id text primary key,
  product_id text not null,
  product_title text not null,
  order_number text,
  batch_qty integer not null default 1,
  material text not null default 'Matte Bio-PLA+',
  estimated_grams integer not null default 100,
  stage text not null default 'Queued',
  printer_name text not null default 'Bambu A1 Mini #1 (Banka Lab)',
  updated_at timestamptz not null default now()
);

create table if not exists public.filament_spools (
  id text primary key,
  name text not null,
  material text not null default 'Eco-PLA',
  color_hex text not null default '#d97706',
  color_name text not null default 'Amber',
  remaining_grams integer not null default 1000,
  capacity_grams integer not null default 1000,
  cost_per_kg numeric not null default 1200,
  grams_per_toy_avg integer not null default 110,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id text primary key,
  admin_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  summary text not null,
  timestamp timestamptz not null default now()
);

create table if not exists public.inquiries (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  contact text not null,
  topic text not null,
  message text not null,
  status text not null default 'New',
  created_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  city_or_role text not null,
  product_name text not null,
  rating integer not null default 5,
  feedback text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.returns (
  id text primary key,
  rma_number text not null unique,
  order_number text not null,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null default '',
  order_payment_method text not null default 'upi',
  order_total numeric not null default 0,
  items jsonb not null default '[]'::jsonb,
  reason text not null,
  resolution_type text not null,
  customer_comments text not null default '',
  proof_images jsonb not null default '[]'::jsonb,
  refund_upi_id text not null default '',
  refund_bank_account text not null default '',
  refund_bank_ifsc text not null default '',
  status text not null default 'Return Requested',
  rejection_reason text not null default '',
  admin_note text not null default '',
  reverse_courier text not null default '',
  reverse_awb text not null default '',
  replacement_awb text not null default '',
  auto_restock_enabled boolean not null default false,
  is_restocked boolean not null default false,
  scrap_recorded boolean not null default false,
  replacement_print_queued boolean not null default false,
  refund_amount numeric,
  refund_mode text,
  refund_utr text not null default '',
  issued_coupon_code text not null default '',
  source_channel text not null default 'bee4.in',
  received_at_hub boolean not null default false,
  received_at_hub_date timestamptz,
  claim_filed boolean not null default false,
  claim_filed_at timestamptz,
  claim_reference_id text not null default '',
  qc_outcome text not null default 'Pending',
  cancelled_after_label boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_adjustments (
  id text primary key,
  product_id text not null,
  product_title text not null,
  sku text,
  delta integer not null default 0,
  adjustment_type text not null default 'manual_adjust',
  reference_id text not null default '',
  note text not null default '',
  timestamp timestamptz not null default now()
);

create table if not exists public.customer_messages (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text not null default '',
  topic text not null default 'General Note',
  message text not null,
  status text not null default 'Unread',
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_reviews (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  product_id text not null,
  product_name text not null,
  customer_name text not null,
  customer_contact text not null default '',
  city_or_role text not null default '',
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  photo_url text not null default '',
  verified_buyer boolean not null default false,
  featured_on_homepage boolean not null default false,
  status text not null default 'Pending',
  admin_reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_integrations (
  id text primary key,
  key text not null unique,
  name text not null,
  category text not null default 'marketplace',
  active boolean not null default false,
  seller_id text not null default '',
  api_key text not null default '',
  webhook_url text not null default '',
  notes text not null default '',
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_rules (
  id text primary key,
  name text not null,
  enabled boolean not null default false,
  trigger text not null,
  condition_field text not null default 'always',
  condition_value text not null default '',
  action_type text not null,
  action_value text not null default '',
  execution_count integer not null default 0,
  last_executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_spend_logs (
  id text primary key,
  month text not null,
  channel text not null default 'All Channels',
  amount numeric not null default 0,
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_cards (
  id text primary key,
  code text not null unique,
  pin text not null,
  initial_amount numeric not null check (initial_amount >= 1),
  balance numeric not null default 0 check (balance >= 0),
  purchaser_user_id uuid references auth.users(id) on delete set null,
  purchaser_name text not null default 'BEE4 Customer',
  purchaser_email text not null default '',
  purchaser_phone text not null default '',
  recipient_name text not null default '',
  recipient_email text not null default '',
  message text not null default '',
  active boolean not null default true,
  issued_reason text not null default 'Purchased',
  redeemed_by_user_id uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- 7. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.coupons enable row level security;
alter table public.store_settings enable row level security;
alter table public.print_jobs enable row level security;
alter table public.filament_spools enable row level security;
alter table public.admin_logs enable row level security;
alter table public.inquiries enable row level security;
alter table public.testimonials enable row level security;
alter table public.returns enable row level security;
alter table public.inventory_adjustments enable row level security;
alter table public.customer_messages enable row level security;
alter table public.product_reviews enable row level security;
alter table public.marketplace_integrations enable row level security;
alter table public.automation_rules enable row level security;
alter table public.ad_spend_logs enable row level security;
alter table public.gift_cards enable row level security;

-- Public Read Policies (Storefront Catalog, Coupons, Settings, Testimonials)
drop policy if exists "Public read active products" on public.products;
create policy "Public read active products" on public.products
  for select using (status = 'Active' or public.is_bee4_admin());

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Public read store_settings" on public.store_settings;
create policy "Public read store_settings" on public.store_settings
  for select using (true);

drop policy if exists "Admins manage store_settings" on public.store_settings;
create policy "Admins manage store_settings" on public.store_settings
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Public read coupons" on public.coupons;
create policy "Public read coupons" on public.coupons
  for select using (active = true or public.is_bee4_admin());

drop policy if exists "Admins manage coupons" on public.coupons;
create policy "Admins manage coupons" on public.coupons
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Public read testimonials" on public.testimonials;
create policy "Public read testimonials" on public.testimonials
  for select using (true);

drop policy if exists "Anyone insert testimonial" on public.testimonials;
create policy "Anyone insert testimonial" on public.testimonials
  for insert with check (true);

drop policy if exists "Admins delete testimonials" on public.testimonials;
create policy "Admins delete testimonials" on public.testimonials
  for delete using (public.is_bee4_admin());

-- Orders Policies (Guests & Customers can place orders; Customers read own; Admins manage all)
drop policy if exists "Customers insert orders" on public.orders;
create policy "Customers insert orders" on public.orders
  for insert with check (user_id is null or auth.uid() = user_id or public.is_bee4_admin());

drop policy if exists "Customers read own orders or admins read all" on public.orders;
create policy "Customers read own orders or admins read all" on public.orders
  for select using (auth.uid() = user_id or public.is_bee4_admin());

drop policy if exists "Customers cancel own pending orders" on public.orders;
create policy "Customers cancel own pending orders" on public.orders
  for update using (
    auth.uid() = user_id
    and status in ('Pending', 'Confirmed', 'Preparing Shipment')
  )
  with check (
    auth.uid() = user_id
    and status = 'Cancelled'
  );

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders
  for update using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Admins delete orders" on public.orders;
create policy "Admins delete orders" on public.orders
  for delete using (public.is_bee4_admin());

-- Profiles, Customers CRM & Admin-Only Tables
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id or public.is_bee4_admin())
  with check (auth.uid() = id or public.is_bee4_admin());

drop policy if exists "Users sync own customer CRM record" on public.customers;
create policy "Users sync own customer CRM record" on public.customers
  for insert with check (auth.uid() = user_id or auth.uid()::text = id or public.is_bee4_admin());

drop policy if exists "Users update own customer CRM record" on public.customers;
create policy "Users update own customer CRM record" on public.customers
  for update using (auth.uid() = user_id or auth.uid()::text = id or public.is_bee4_admin())
  with check (auth.uid() = user_id or auth.uid()::text = id or public.is_bee4_admin());

drop policy if exists "Admins and owners read customers" on public.customers;
create policy "Admins and owners read customers" on public.customers
  for select using (auth.uid() = user_id or auth.uid()::text = id or public.is_bee4_admin());

drop policy if exists "Admins delete customers" on public.customers;
create policy "Admins delete customers" on public.customers
  for delete using (public.is_bee4_admin());

drop policy if exists "Admins manage print_jobs" on public.print_jobs;
create policy "Admins manage print_jobs" on public.print_jobs
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Admins manage filament_spools" on public.filament_spools;
create policy "Admins manage filament_spools" on public.filament_spools
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Admins manage admin_logs" on public.admin_logs;
create policy "Admins manage admin_logs" on public.admin_logs
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Anyone submit inquiry" on public.inquiries;
create policy "Anyone submit inquiry" on public.inquiries
  for insert with check (true);

drop policy if exists "Admins manage inquiries" on public.inquiries;
create policy "Admins manage inquiries" on public.inquiries
  for select using (public.is_bee4_admin());

drop policy if exists "Admins update inquiries" on public.inquiries;
create policy "Admins update inquiries" on public.inquiries
  for update using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Admins delete inquiries" on public.inquiries;
create policy "Admins delete inquiries" on public.inquiries
  for delete using (public.is_bee4_admin());

-- Returns (RMA) & Inventory Adjustment Policies
drop policy if exists "Customers insert returns" on public.returns;
create policy "Customers insert returns" on public.returns
  for insert with check (true);

drop policy if exists "Customers read own returns or admins read all" on public.returns;
create policy "Customers read own returns or admins read all" on public.returns
  for select using (auth.uid() = user_id or public.is_bee4_admin());

drop policy if exists "Admins manage returns" on public.returns;
create policy "Admins manage returns" on public.returns
  for update using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Admins delete returns" on public.returns;
create policy "Admins delete returns" on public.returns
  for delete using (public.is_bee4_admin());

drop policy if exists "Admins manage inventory_adjustments" on public.inventory_adjustments;
create policy "Admins manage inventory_adjustments" on public.inventory_adjustments
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

-- Customer Messages ('Send Us a Note') & Product Reviews Policies
drop policy if exists "Anyone submit customer_message" on public.customer_messages;
create policy "Anyone submit customer_message" on public.customer_messages
  for insert with check (true);

drop policy if exists "Customers read own submitted messages" on public.customer_messages;
create policy "Customers read own submitted messages" on public.customer_messages
  for select using (
    auth.uid() = user_id
    or (email <> '' and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    or public.is_bee4_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'bee4official@gmail.com'
  );

drop policy if exists "Admins manage customer_messages" on public.customer_messages;
create policy "Admins manage customer_messages" on public.customer_messages
  for all using (
    public.is_bee4_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'bee4official@gmail.com'
  )
  with check (
    public.is_bee4_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'bee4official@gmail.com'
  );

drop policy if exists "Public read published product_reviews" on public.product_reviews;
create policy "Public read published product_reviews" on public.product_reviews
  for select using (
    status = 'Published'
    or public.is_bee4_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'bee4official@gmail.com'
  );

drop policy if exists "Anyone submit product_review" on public.product_reviews;
create policy "Anyone submit product_review" on public.product_reviews
  for insert with check (true);

drop policy if exists "Admins manage product_reviews" on public.product_reviews;
create policy "Admins manage product_reviews" on public.product_reviews
  for all using (
    public.is_bee4_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'bee4official@gmail.com'
  )
  with check (
    public.is_bee4_admin()
    or lower(coalesce(auth.jwt() ->> 'email', '')) = 'bee4official@gmail.com'
  );

-- 8. Public Supabase Storage Bucket for 3-Angle Product Images, Return Proofs & Review Photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];

drop policy if exists "Public view product-images" on storage.objects;
create policy "Public view product-images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "Admins upload product-images" on storage.objects;
create policy "Admins upload product-images" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and (
      public.is_bee4_admin()
      or (storage.foldername(name))[1] in ('returns', 'reviews', 'custom-uploads')
    )
  );

drop policy if exists "Admins update product-images" on storage.objects;
create policy "Admins update product-images" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_bee4_admin());

drop policy if exists "Admins delete product-images" on storage.objects;
create policy "Admins delete product-images" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_bee4_admin());

-- 9. Enable Real-time Sync Publication
do $$
begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.returns;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.coupons;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.store_settings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.customer_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.product_reviews;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.customers;
exception when duplicate_object then null;
end $$;

drop policy if exists "Admins manage marketplace_integrations" on public.marketplace_integrations;
create policy "Admins manage marketplace_integrations" on public.marketplace_integrations
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Admins manage automation_rules" on public.automation_rules;
create policy "Admins manage automation_rules" on public.automation_rules
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

drop policy if exists "Admins manage ad_spend_logs" on public.ad_spend_logs;
create policy "Admins manage ad_spend_logs" on public.ad_spend_logs
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

do $$
begin
  alter publication supabase_realtime add table public.marketplace_integrations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.automation_rules;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.ad_spend_logs;
exception when duplicate_object then null;
end $$;

-- 10. Gift Cards Policies & Atomic Cancellation / Redemption RPCs
drop policy if exists "Anyone create gift_card" on public.gift_cards;
create policy "Anyone create gift_card" on public.gift_cards
  for insert with check (true);

drop policy if exists "Users read related gift_cards or admins read all" on public.gift_cards;
create policy "Users read related gift_cards or admins read all" on public.gift_cards
  for select using (
    public.is_bee4_admin()
    or auth.uid() = purchaser_user_id
    or auth.uid() = redeemed_by_user_id
    or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or lower(purchaser_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "Admins manage gift_cards" on public.gift_cards;
create policy "Admins manage gift_cards" on public.gift_cards
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

do $$
begin
  alter publication supabase_realtime add table public.gift_cards;
exception when duplicate_object then null;
end $$;

create or replace function public.cancel_bee4_order_and_restock(
  p_order_number text,
  p_reason text,
  p_cancelled_by text default 'Customer',
  p_auto_restock boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
  v_qty integer;
  v_prod_id text;
  v_now timestamptz := now();
begin
  select * into v_order from public.orders where order_number = p_order_number for update;
  if not found then
    raise exception 'Order % not found', p_order_number;
  end if;

  if not (public.is_bee4_admin() or v_order.user_id = auth.uid()) then
    raise exception 'Permission denied cancelling order %', p_order_number;
  end if;

  if not public.is_bee4_admin() and v_order.status not in ('Pending', 'Confirmed', 'Preparing Shipment') then
    raise exception 'Order % cannot be cancelled after dispatch', p_order_number;
  end if;

  update public.orders
  set
    status = 'Cancelled',
    fulfillment_stage = 'Cancelled',
    operational_bucket = 'Cancelled / RTO',
    cancellation_reason = coalesce(nullif(trim(p_reason), ''), 'Cancelled upon request'),
    cancelled_by = coalesce(nullif(trim(p_cancelled_by), ''), 'Customer'),
    cancelled_at = v_now,
    updated_at = v_now
  where order_number = p_order_number;

  if p_auto_restock and v_order.status <> 'Cancelled' then
    for v_item in select * from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb))
    loop
      v_prod_id := coalesce(v_item ->> 'productId', '');
      v_qty := greatest(1, coalesce((v_item ->> 'quantity')::integer, 1));
      if v_prod_id <> '' then
        update public.products
        set
          stock_quantity = greatest(0, stock_quantity) + v_qty,
          in_stock = true,
          updated_at = v_now
        where id = v_prod_id;
      end if;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'order_number', p_order_number, 'cancelled_at', v_now);
end;
$$;

create or replace function public.redeem_bee4_gift_card(
  p_code text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.gift_cards%rowtype;
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Sign in to your BEE4 account to redeem a gift card.';
  end if;

  select * into v_card
  from public.gift_cards
  where upper(code) = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'Gift card code not found.';
  end if;
  if not v_card.active then
    raise exception 'This gift card is currently disabled.';
  end if;
  if v_card.pin <> trim(p_pin) then
    raise exception 'Incorrect 4-digit Gift Card PIN.';
  end if;
  if v_card.balance <= 0 or v_card.redeemed_at is not null then
    raise exception 'This gift card has already been redeemed.';
  end if;
  if v_card.expires_at is not null and v_card.expires_at < v_now then
    raise exception 'This gift card has expired.';
  end if;

  update public.gift_cards
  set
    balance = 0,
    redeemed_by_user_id = auth.uid(),
    redeemed_at = v_now
  where id = v_card.id;

  return jsonb_build_object(
    'ok', true,
    'id', v_card.id,
    'code', v_card.code,
    'credited_amount', v_card.balance,
    'redeemed_at', v_now
  );
end;
$$;

-- 11. Product Questions & Answers Table & Policies
create table if not exists public.product_questions (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  product_id text not null,
  product_name text not null,
  customer_name text not null,
  customer_contact text not null default '',
  question text not null,
  answer text not null default '',
  answered_by text not null default '',
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_questions enable row level security;

drop policy if exists "Public read answered or own product_questions" on public.product_questions;
create policy "Public read answered or own product_questions" on public.product_questions
  for select using (
    status = 'Answered'
    or auth.uid() = user_id
    or public.is_bee4_admin()
  );

drop policy if exists "Anyone submit product_question" on public.product_questions;
create policy "Anyone submit product_question" on public.product_questions
  for insert with check (true);

drop policy if exists "Admins manage product_questions" on public.product_questions;
create policy "Admins manage product_questions" on public.product_questions
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

do $$
begin
  alter publication supabase_realtime add table public.product_questions;
exception when duplicate_object then null;
end $$;

-- 12. Product Viral Reels Table & Policies
create table if not exists public.viral_reels (
  id text primary key,
  title text not null,
  video_url text not null,
  poster_url text not null default '',
  product_id text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.viral_reels enable row level security;

drop policy if exists "Public read active viral_reels" on public.viral_reels;
create policy "Public read active viral_reels" on public.viral_reels
  for select using (active = true or public.is_bee4_admin());

drop policy if exists "Admins manage viral_reels" on public.viral_reels;
create policy "Admins manage viral_reels" on public.viral_reels
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

do $$
begin
  alter publication supabase_realtime add table public.viral_reels;
exception when duplicate_object then null;
end $$;
`;
}
