import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import {
  DELETE_ACCOUNT_PATH,
  LEGAL,
  PRICING_PATH,
  PRIVACY_PATH,
  REFUND_PATH,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms of service · ${LEGAL.appName}`,
};

export default function TermsPage() {
  return (
    <main className="shell legal">
      <AppHeader />
      <h1>Terms of service</h1>
      <p className="muted">Last updated: {LEGAL.lastUpdated}</p>

      <p>
        These terms are the agreement between you and{" "}
        <strong>{LEGAL.owner}</strong> (“we”), who runs {LEGAL.appName}, for
        your use of the {LEGAL.appName} app and website. By using{" "}
        {LEGAL.appName} you accept them. If you do not agree, do not use{" "}
        {LEGAL.appName}.
      </p>

      <h2>1. What {LEGAL.appName} does</h2>
      <p>
        {LEGAL.appName} records a class with your phone and uses artificial
        intelligence to turn the recording into study material: notes, a
        summary, the topics to focus on for the exam, a quiz, and simpler
        explanations of the moments you marked with “I’m lost”.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>
          You sign in with a Google account. You must be old enough to have one
          under Google’s rules in your country.
        </li>
        <li>
          Your account is for you only. Keep your Google account secure; you are
          responsible for what is done with it.
        </li>
        <li>
          You can delete your account and everything in it at any time, in the
          app or on <Link href={DELETE_ACCOUNT_PATH}>this page</Link>.
        </li>
      </ul>

      <h2>3. Recording classes and your content</h2>
      <ul>
        <li>
          <strong>Record only when you are allowed to.</strong> Before
          recording, make sure your teacher, your school and the law of your
          country allow it. You are responsible for the recordings you make.
        </li>
        <li>
          Your recordings and the notes made from them stay yours. We use them
          only to provide the service to you.
        </li>
        <li>
          Do not use {LEGAL.appName} for anything illegal, to record people in
          private settings, to harm others, or to disturb or overload the
          service.
        </li>
      </ul>
      <p>
        How we handle your data is explained in our{" "}
        <Link href={PRIVACY_PATH}>privacy policy</Link>.
      </p>

      <h2>4. Notes written by AI</h2>
      <p>
        The notes, summaries, quizzes and explanations are written by an AI from
        your recording. They can contain mistakes or miss parts of the class,
        especially when the sound is poor. They are a study aid: check them
        against your course, and do not rely on them alone for an exam. We do
        not promise any grade or result.
      </p>

      <h2>5. Plans and limits</h2>
      <p>
        {LEGAL.appName} has a Free plan and paid plans (Premium and Pro). Each
        plan has a number of classes per month and a maximum recording length,
        shown on the <Link href={PRICING_PATH}>Plans</Link> page. Classes reset
        on the 1st of each month and unused classes do not carry over. Pro is
        for one student’s normal use (“fair use”): we may limit accounts that
        share access or automate requests.
      </p>

      <h2>6. Payments, renewal and cancellation</h2>
      <ul>
        <li>
          Our order process is conducted by our online reseller Paddle.com.
          Paddle.com is the Merchant of Record for all our orders. Paddle
          provides all customer service inquiries and handles returns; Paddle’s
          own terms apply to your purchase.
        </li>
        <li>
          Prices are shown before you pay, in your currency and with the taxes
          that apply in your country.
        </li>
        <li>
          Paid plans are subscriptions: they renew automatically each month or
          year, at the price then in force, until you cancel.
        </li>
        <li>
          You can cancel at any time from the{" "}
          <Link href={PRICING_PATH}>Plans</Link> page. You keep your plan until
          the end of the period you paid for, then your account goes back to the
          Free plan.
        </li>
        <li>
          If we change a price, we tell you before your next renewal, and you
          can cancel before it applies.
        </li>
      </ul>

      <h2>7. Refunds</h2>
      <p>
        You can ask for a refund within {LEGAL.refundDays} days of your first
        payment, as described in our{" "}
        <Link href={REFUND_PATH}>refund policy</Link>.
      </p>

      <h2>8. Availability and changes to the service</h2>
      <p>
        We work to keep {LEGAL.appName} available, but we do not promise it will
        always work without interruption or errors. The service depends on other
        companies (for hosting and for the AI), and writing notes can sometimes
        fail or take longer. We may add, change or remove features. If we stop a
        paid feature you paid for, we refund the unused part of your period.
      </p>

      <h2>9. Suspension</h2>
      <p>
        We may suspend or close an account that breaks these terms, harms other
        users or the service, or is used for fraud. You can stop using{" "}
        {LEGAL.appName} at any time by deleting your account.
      </p>

      <h2>10. Our responsibility</h2>
      <p>
        {LEGAL.appName} is provided “as is”. To the extent the law allows, we
        are not responsible for indirect losses, such as a lost recording,
        missed notes or an exam result, and our total responsibility to you is
        limited to the amount you paid us in the 12 months before the problem.
        Nothing in these terms removes rights that the consumer law of your
        country gives you and that cannot be removed by contract.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>
        If these terms change, we update this page and its date. For an
        important change, we tell you in the app or by email. If you keep using{" "}
        {LEGAL.appName} after a change, you accept the new terms.
      </p>

      <h2>12. Law</h2>
      <p>
        These terms follow the law of {LEGAL.country}. If you are a consumer,
        you also keep the protection of the mandatory laws of the country where
        you live.
      </p>

      <h2>13. Contact</h2>
      <p>
        {LEGAL.owner} · {LEGAL.contactEmail}
      </p>
    </main>
  );
}
