/**
 * Details shown in the privacy policy and on the account deletion page.
 * They are set in the hosting settings (Vercel → Settings → Environment Variables), not in the code,
 * so the owner's name and contact address never need to be committed. Google Play requires them.
 */
function setting(value: string | undefined, placeholder: string): string {
  return value?.trim() || placeholder;
}

export const LEGAL = {
  appName: "FocusNotes",
  // Next.js replaces these with their values at build time, so they must be written out in full.
  /** Who runs the app: a name or a brand. */
  owner: setting(process.env.NEXT_PUBLIC_LEGAL_OWNER, "[Your name or company]"),
  /** Where students can write about their data. */
  contactEmail: setting(process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL, "[your contact email]"),
  /** The country whose data protection law applies (for Morocco: law 09-08). */
  country: setting(process.env.NEXT_PUBLIC_LEGAL_COUNTRY, "[Your country]"),
  lastUpdated: "14 November 2026",
} as const;

/** Paths of the pages, relative to the website address. */
export const PRIVACY_PATH = "/privacy";
export const DELETE_ACCOUNT_PATH = "/delete-account";
