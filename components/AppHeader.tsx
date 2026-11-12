type AppHeaderProps = {
  /** Shown when a student is signed in. */
  account?: { email: string; onSignOut: () => void };
};

export function AppHeader({ account }: AppHeaderProps) {
  return (
    <header className="top">
      <span className="logo">
        Focus<b>Notes</b>
      </span>
      {account && (
        <span className="account">
          <span className="email" title={account.email}>
            {account.email}
          </span>
          <button type="button" className="link" onClick={account.onSignOut}>
            Sign out
          </button>
        </span>
      )}
    </header>
  );
}
