"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { deleteMyAccount } from "@/lib/client/account";
import { LEGAL, PRIVACY_PATH } from "@/lib/legal";

/** Lets students delete their account without the app, as Google Play requires. */
export default function DeleteAccountPage() {
  const auth = useAuth();
  const [state, setState] = useState<"idle" | "deleting" | "deleted">("idle");
  const [error, setError] = useState("");

  async function remove() {
    const confirmed = window.confirm(
      "Delete your account permanently? All your classes and notes will be deleted. This cannot be undone.",
    );
    if (!confirmed) return;
    setState("deleting");
    setError("");
    try {
      await deleteMyAccount();
      setState("deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account. Try again.");
      setState("idle");
    }
  }

  return (
    <main className="shell legal">
      <AppHeader />
      <h1>Delete your {LEGAL.appName} account</h1>

      {state === "deleted" ? (
        <p role="status">Your account and all your classes have been deleted. Thank you for using {LEGAL.appName}.</p>
      ) : (
        <>
          <p>Deleting your account removes, immediately and permanently:</p>
          <ul>
            <li>your account and your Google name and email address as stored by {LEGAL.appName},</li>
            <li>all your classes and notes,</li>
            <li>any recording still waiting in your storage.</li>
          </ul>
          <p className="muted">
            Recordings waiting on your phone are deleted when you delete your account from the app, or when you
            uninstall it.
          </p>

          {!auth.enabled ? (
            <p className="warn">Accounts are not set up on this server.</p>
          ) : auth.loading ? null : !auth.session ? (
            <>
              <p>Sign in with the Google account you use in the app, to confirm it is yours.</p>
              <button type="button" className="btn primary google" onClick={auth.signIn}>
                <span aria-hidden="true" className="g">
                  G
                </span>
                Continue with Google
              </button>
            </>
          ) : (
            <>
              <p>
                Signed in as <strong>{auth.session.user.email}</strong>.
              </p>
              <button
                type="button"
                className="btn danger"
                onClick={remove}
                disabled={state === "deleting"}
                aria-busy={state === "deleting"}
              >
                {state === "deleting" ? "Deleting…" : "Delete my account permanently"}
              </button>
            </>
          )}
          {(error || auth.error) && (
            <p className="error" role="alert">
              {error || auth.error}
            </p>
          )}
        </>
      )}

      <p className="muted small">
        Questions? Write to {LEGAL.contactEmail}. See our <Link href={PRIVACY_PATH}>privacy policy</Link>.
      </p>
    </main>
  );
}
