import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { LEGAL, PRICING_PATH, TERMS_PATH } from "@/lib/legal";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: `Refund policy · ${LEGAL.appName}` };

export default function RefundPage() {
  return (
    <main className="shell legal">
      <AppHeader />
      <h1>Refund policy</h1>
      <p className="muted">Last updated: {LEGAL.lastUpdated}</p>

      <p>
        We want you to be happy with {LEGAL.appName}. If a paid plan is not
        right for you, you can ask for your money back within{" "}
        <strong>{LEGAL.refundDays} days</strong> of your first payment.
      </p>

      <h2>When you can get a refund</h2>
      <ul>
        <li>
          You ask within {LEGAL.refundDays} days of the{" "}
          <strong>first payment</strong> of a Premium or Pro subscription,
          monthly or yearly.
        </li>
        <li>It is your first refund: we refund each customer once.</li>
        <li>
          The plan was not heavily used. We may refuse a refund if more classes
          were created than the Free plan allows ({PLANS.free.classesPerMonth}{" "}
          classes) since the payment, or in case of abuse or fraud.
        </li>
      </ul>

      <h2>What is not refunded</h2>
      <ul>
        <li>
          <strong>Renewals.</strong> A subscription renews automatically each
          month or year until you cancel. You can cancel at any time from the{" "}
          <Link href={PRICING_PATH}>Plans</Link> page (“Manage my
          subscription”); you keep your plan until the end of the period you
          paid for, and you are not charged again.
        </li>
        <li>
          Payments older than {LEGAL.refundDays} days, and the unused part of a
          period after you cancel.
        </li>
      </ul>

      <h2>How to ask</h2>
      <p>
        Write to <strong>{LEGAL.contactEmail}</strong> from the email address of
        your {LEGAL.appName} account, and tell us you want a refund. You can
        also reply to the receipt you received from Paddle, our reseller, who
        processes our payments. We answer within 3 working days.
      </p>

      <h2>How you are refunded</h2>
      <p>
        Refunds are made by Paddle to the payment method you used. The money
        usually appears within 5 to 10 working days, depending on your bank.
        Your subscription is canceled and your account goes back to the Free
        plan; your classes and notes are kept.
      </p>

      <h2>Your legal rights</h2>
      <p>
        This policy does not limit the rights the consumer law of your country
        gives you. Where that law gives you more, it applies. See also our{" "}
        <Link href={TERMS_PATH}>terms of service</Link>.
      </p>

      <h2>Contact</h2>
      <p>{LEGAL.contactEmail}</p>
    </main>
  );
}
