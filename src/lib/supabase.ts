import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Cliente público do Supabase.
 * Usa somente a URL e a chave anon (protegida por RLS).
 * A chave service_role nunca é usada no frontend.
 */
export const supabase = createClient(
  env.supabaseUrl || 'https://placeholder.supabase.co',
  env.supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
