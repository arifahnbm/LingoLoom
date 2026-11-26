import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim() || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    !supabaseUrl.includes('your-project-ref') &&
    (supabaseServiceRoleKey || supabaseAnonKey)
);

const fallbackUrl = supabaseUrl || 'https://placeholder.supabase.co';
const fallbackAnon = supabaseAnonKey || 'placeholder-anon-key';
const fallbackService = supabaseServiceRoleKey || fallbackAnon;

/**
 * Client dengan Service Role untuk operasi backend terverifikasi
 * (menulis vocab_cache, membaca/memperbarui kuota, dan query atas nama user yang JWT-nya sudah divalidasi).
 */
export const supabaseAdmin: SupabaseClient = createClient(fallbackUrl, fallbackService, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Client dengan Anon Key khusus untuk memverifikasi JWT dari Supabase Auth.
 */
export const supabaseAuth: SupabaseClient = createClient(fallbackUrl, fallbackAnon, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
