function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

export const env = {
  supabaseUrl: clean(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, ''),
  supabaseAnonKey: clean(import.meta.env.VITE_SUPABASE_ANON_KEY),
  sharedEmail: clean(import.meta.env.VITE_SHARED_EMAIL).toLowerCase(),
  basePath: clean(import.meta.env.VITE_BASE_PATH) || '/',
} as const;

export const isSupabaseConfigured =
  env.supabaseUrl.length > 0 &&
  env.supabaseAnonKey.length > 0 &&
  env.sharedEmail.length > 0;
