/**
 * Supabase project settings, read from public environment variables.
 * The publishable key is designed to be public: database rules decide what each user may do.
 */
export type SupabaseConfig = { url: string; publishableKey: string };

export function readSupabaseConfig(url: string | undefined, publishableKey: string | undefined): SupabaseConfig | null {
  const cleanUrl = url?.trim();
  const cleanKey = publishableKey?.trim();
  return cleanUrl && cleanKey ? { url: cleanUrl.replace(/\/+$/, ""), publishableKey: cleanKey } : null;
}
