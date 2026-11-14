/**
 * Details shown in the privacy policy and on the account deletion page.
 * Fill these in before publishing the app: Google Play requires a way to contact you.
 */
export const LEGAL = {
  appName: "FocusNotes",
  /** Who runs the app: your name, or your company's. */
  owner: "[Your name or company]",
  /** Where students can write to you about their data. */
  contactEmail: "[your contact email]",
  /** Your country, whose data protection law applies (for Morocco: law 09-08). */
  country: "[Your country]",
  lastUpdated: "14 November 2026",
} as const;

/** Paths of the pages, relative to the website address. */
export const PRIVACY_PATH = "/privacy";
export const DELETE_ACCOUNT_PATH = "/delete-account";
