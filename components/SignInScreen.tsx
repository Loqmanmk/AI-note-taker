import Link from "next/link";
import { PRICING_PATH, PRIVACY_PATH } from "@/lib/legal";
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
        <p className="lead">
          FocusNotes is an app for students. It records your class with your
          phone, then uses AI to write your notes, a summary, the topics to
          focus on for the exam, and a quiz. Tap “I’m lost” during class and
          that part is re-explained in simpler words. Notes can be written in
          your language, Moroccan Darija included.
        </p>
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
          We use your Google name and email only to keep your classes in your
          account. See our <Link href={PRIVACY_PATH}>privacy policy</Link>.
        </p>
        <p className="muted small">
          Free to start: 3 classes a month.{" "}
          <Link href={PRICING_PATH}>See the plans</Link> for more and longer
          classes.
        </p>
      </section>
    </main>
  );
}
