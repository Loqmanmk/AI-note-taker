import Link from "next/link";
import { PRIVACY_PATH } from "@/lib/legal";
import { AppHeader } from "./AppHeader";

type SignInScreenProps = { onSignIn: () => void; error: string };

const FEATURES = [
  ["Record", "Your phone listens to the class while you focus on it."],
  ["Focus", "See what the teacher stressed most, ranked for the exam."],
  ["Practise", "A quiz and simple re-explanations of what you missed."],
] as const;

export function SignInScreen({ onSignIn, error }: SignInScreenProps) {
  return (
    <main className="shell">
      <AppHeader />
      <section className="signin">
        <h1>Your classes, turned into exam-ready notes.</h1>
        <ul className="features">
          {FEATURES.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn primary google" onClick={onSignIn}>
          <span aria-hidden="true" className="g">
            G
          </span>
          Continue with Google
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="muted small">
          We use your Google name and email only to keep your classes in your account. See our{" "}
          <Link href={PRIVACY_PATH}>privacy policy</Link>.
        </p>
      </section>
    </main>
  );
}
