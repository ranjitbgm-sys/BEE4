import test from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@supabase/supabase-js';
import {
  buildSupabaseSetupSql,
  getAllowedAdminEmails,
  getSupabaseEnvDiagnostics,
  isSupabaseAdminUser,
  SUPABASE_PRODUCT_BUCKET,
} from '../lib/supabase';

test('getAllowedAdminEmails always includes ranjitbgm@gmail.com', () => {
  const emails = getAllowedAdminEmails();
  assert.ok(emails.includes('ranjitbgm@gmail.com'));
});

test('getSupabaseEnvDiagnostics safely falls back to local-fallback when env vars are unset', () => {
  const diag = getSupabaseEnvDiagnostics();
  assert.equal(diag.isConfigured, false);
  assert.equal(diag.source, 'local-fallback');
  assert.deepEqual(diag.missingEnvKeys, ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']);
  assert.equal(diag.adminEmail, 'ranjitbgm@gmail.com');
});

test('isSupabaseAdminUser authorizes allowlisted email or is_admin metadata flag', () => {
  assert.equal(isSupabaseAdminUser(null), false);

  const allowlisted = {
    id: 'u-1',
    email: 'RANJITBGM@GMAIL.COM',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
  } as unknown as User;
  assert.equal(isSupabaseAdminUser(allowlisted), true);

  const metaAdmin = {
    id: 'u-2',
    email: 'other@bee4.in',
    app_metadata: {},
    user_metadata: { is_admin: true },
    aud: 'authenticated',
    created_at: '',
  } as unknown as User;
  assert.equal(isSupabaseAdminUser(metaAdmin), true);

  const normalCustomer = {
    id: 'u-3',
    email: 'customer@example.com',
    app_metadata: {},
    user_metadata: { is_admin: false },
    aud: 'authenticated',
    created_at: '',
  } as unknown as User;
  assert.equal(isSupabaseAdminUser(normalCustomer), false);
});

test('buildSupabaseSetupSql generates required tables, product-images bucket, RLS, and realtime sync', () => {
  const sql = buildSupabaseSetupSql('ranjitbgm@gmail.com');
  assert.equal(SUPABASE_PRODUCT_BUCKET, 'product-images');
  assert.match(sql, /create table if not exists public\.products/i);
  assert.match(sql, /create table if not exists public\.orders/i);
  assert.match(sql, /create table if not exists public\.coupons/i);
  assert.match(sql, /create table if not exists public\.store_settings/i);
  assert.match(sql, /'product-images'/);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /alter publication supabase_realtime add table public\.products/i);
  assert.match(sql, /ranjitbgm@gmail\.com/);
});
