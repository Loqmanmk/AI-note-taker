import Link from "next/link";

type AppHeaderProps = {
  /** Shown when a student is signed in. */
  account?: { email: string; onSignOut: () => void };
};

/** The FocusNotes mark: sound bars turning into lines of notes. Same drawing as the app icon. */
function LogoMark() {
  return (
    <svg
      className="logo-mark"
      viewBox="0 0 512 512"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <rect width="512" height="512" rx="116" fill="#6D5DF6" />
      <rect x="96" y="216" width="34" height="80" rx="17" fill="#fff" />
      <rect x="150" y="156" width="34" height="200" rx="17" fill="#fff" />
      <rect x="204" y="196" width="34" height="120" rx="17" fill="#fff" />
      <rect x="282" y="170" width="134" height="36" rx="18" fill="#FF9D5C" />
      <rect x="282" y="238" width="134" height="36" rx="18" fill="#fff" />
      <rect
        x="282"
        y="306"
        width="86"
        height="36"
        rx="18"
        fill="#fff"
        opacity="0.75"
      />
    </svg>
  );
}

export function AppHeader({ account }: AppHeaderProps) {
  return (
    <header className="top">
      <Link href="/" className="logo">
        <LogoMark />
        <span>
          Focus<b>Notes</b>
        </span>
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
