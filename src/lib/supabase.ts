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

  if (parsed.length === 0) {
    parsed.push('ranjitbgm@gmail.com');
  } else if (!parsed.includes('ranjitbgm@gmail.com')) {
    parsed.push('ranjitbgm@gmail.com');
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

-- 1. Profiles & Admin Flag Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default 'BEE4 Customer',
  phone text not null default '',
  preferred_payment text not null default 'upi',
  celebration_month text,
  wishlist_ids jsonb not null default '[]'::jsonb,
  addresses jsonb not null default '[]'::jsonb,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  in_stock boolean not null default true,
  featured boolean not null default false,
  tag text,
  updated_at timestamptz not null default now()
);

-- 3. Orders Table (Checkout + Fulfillment Logistics + GST State Data)
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
  payment_method text not null default 'upi',
  order_channel text not null default 'UPI / Prepaid',
  coupon_code text not null default '',
  customer jsonb not null,
  gift_wrap boolean not null default false,
  gift_message text not null default '',
  status text not null default 'Confirmed',
  fulfillment_stage text not null default 'New / Unverified',
  courier_partner text not null default '',
  awb_number text not null default '',
  tracking_url text not null default '',
  internal_notes text not null default '',
  refund_status text not null default 'None',
  refunded_amount numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Coupons Table (SMARTKID15, BEE4WELCOME, PREPAID50)
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
  updated_at timestamptz not null default now()
);

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

-- 7. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
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

-- Orders Policies (Guests & Customers can place orders; Customers read own; Admins manage all)
drop policy if exists "Customers insert orders" on public.orders;
create policy "Customers insert orders" on public.orders
  for insert with check (true);

drop policy if exists "Customers read own orders or admins read all" on public.orders;
create policy "Customers read own orders or admins read all" on public.orders
  for select using (auth.uid() = user_id or public.is_bee4_admin());

drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders
  for update using (public.is_bee4_admin()) with check (public.is_bee4_admin());

-- Profiles & Admin-Only Tables
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id or public.is_bee4_admin())
  with check (auth.uid() = id or public.is_bee4_admin());

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

drop policy if exists "Admins manage inventory_adjustments" on public.inventory_adjustments;
create policy "Admins manage inventory_adjustments" on public.inventory_adjustments
  for all using (public.is_bee4_admin()) with check (public.is_bee4_admin());

-- Customer Messages ('Send Us a Note') & Product Reviews Policies
drop policy if exists "Anyone submit customer_message" on public.customer_messages;
create policy "Anyone submit customer_message" on public.customer_messages
  for insert with check (true);

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
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set public = true;

drop policy if exists "Public view product-images" on storage.objects;
create policy "Public view product-images" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "Admins upload product-images" on storage.objects;
create policy "Admins upload product-images" on storage.objects
  for insert with check (
    bucket_id = 'product-images'
    and (
      public.is_bee4_admin()
      or (storage.foldername(name))[1] in ('returns', 'reviews')
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
`;
}
