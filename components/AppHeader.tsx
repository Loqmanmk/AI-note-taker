import Link from "next/link";

type AppHeaderProps = {
  /** Shown when a student is signed in. */
  account?: { email: string; onSignOut: () => void };
};

export function AppHeader({ account }: AppHeaderProps) {
  return (
    <header className="top">
      <Link href="/" className="logo">
        Focus<b>Notes</b>
      </Link>
      <span className="account">
        <Link href="/pricing" className="link">
          Plans
        </Link>
        {account && (
          <>
            <span className="email" title={account.email}>
              {account.email}
            </span>
            <button type="button" className="link" onClick={account.onSignOut}>
              Sign out
            </button>
          </>
        )}
      </span>
    </header>
  );
}
