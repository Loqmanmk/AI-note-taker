import Link from "next/link";
import {
  DELETE_ACCOUNT_PATH,
  LEGAL,
  PRICING_PATH,
  PRIVACY_PATH,
  REFUND_PATH,
  TERMS_PATH,
} from "@/lib/legal";

const LINKS = [
  [PRICING_PATH, "Plans"],
  [TERMS_PATH, "Terms of service"],
  [REFUND_PATH, "Refund policy"],
  [PRIVACY_PATH, "Privacy policy"],
  [DELETE_ACCOUNT_PATH, "Delete my account"],
] as const;

/** Links to the plans and legal pages, at the bottom of every page. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav aria-label="Legal and plans">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <p>
        © {new Date().getFullYear()} {LEGAL.appName}
      </p>
    </footer>
  );
}
