import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { DELETE_ACCOUNT_PATH, LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: `Privacy policy · ${LEGAL.appName}` };

export default function PrivacyPage() {
  return (
    <main className="shell legal">
      <AppHeader />
      <h1>Privacy policy</h1>
      <p className="muted">Last updated: {LEGAL.lastUpdated}</p>

      <p>
        {LEGAL.appName} turns a recording of your class into notes, a summary, a list of what to focus on and a quiz.
        This page explains what data we use to do that, who handles it, and how you can delete it. {LEGAL.appName} is
        run by {LEGAL.owner}.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your Google account name and email address</strong>, when you sign in with Google. We use them only
          to keep your classes in your account.
        </li>
        <li>
          <strong>Your class recordings</strong>, and the moments you mark with “I’m lost”, when you choose to create
          notes.
        </li>
        <li>
          <strong>The notes created from them</strong>: title, subject, summary, notes, focus topics, quiz and
          re-explanations.
        </li>
        <li>
          <strong>Your settings</strong>, such as the language of your notes, stored on your phone.
        </li>
      </ul>
      <p>We do not collect your location or your contacts, and we do not show advertising.</p>

      <h2>How recordings are handled</h2>
      <ul>
        <li>A recording is kept on your phone until its notes are saved, then deleted from your phone.</li>
        <li>
          To write the notes, the recording is uploaded to your private storage folder, which only your account can
          read, and sent to our AI provider. It is deleted from our storage as soon as the notes are written, whether
          that succeeds or fails, and deleted from the AI provider right after use.
        </li>
        <li>Your notes are kept in your account until you delete them or delete your account.</li>
      </ul>

      <h2>Who handles your data</h2>
      <p>We use these services to run {LEGAL.appName}. They process data only to provide their service to us:</p>
      <ul>
        <li>
          <strong>Supabase</strong>: accounts, sign-in, your saved notes, and the temporary storage of recordings.
        </li>
        <li>
          <strong>Google (Gemini API)</strong>: listening to recordings and writing the notes. Depending on the plan we
          use, Google’s terms may allow it to use the content sent to improve its products; we use a plan where it
          does not before {LEGAL.appName} is offered to the public.
        </li>
        <li>
          <strong>Vercel</strong>: hosting of our website and server.
        </li>
        <li>
          <strong>Google Sign-In</strong>: confirming your identity when you sign in.
        </li>
      </ul>
      <p>We do not sell your data.</p>

      <h2>Recording other people</h2>
      <p>
        A class recording can contain the voice of your teacher and classmates. Only record when you are allowed to,
        and follow the rules of your school and the law where you are.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <strong>Delete a class</strong>: press and hold it in the app.
        </li>
        <li>
          <strong>Delete your account</strong> and everything in it: in the app, open your account and choose “Delete
          my account”, or use <Link href={DELETE_ACCOUNT_PATH}>this page</Link>. It is permanent and immediate.
        </li>
        <li>
          <strong>Ask about your data</strong>, or ask for a copy: write to {LEGAL.contactEmail}.
        </li>
      </ul>
      <p>
        These rights follow the data protection law of {LEGAL.country}, and the GDPR for users in the European Union.
      </p>

      <h2>Children</h2>
      <p>
        {LEGAL.appName} is meant for students old enough to have their own Google account under Google’s rules in their
        country.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, we update this page and its date.</p>

      <h2>Contact</h2>
      <p>{LEGAL.contactEmail}</p>
    </main>
  );
}
