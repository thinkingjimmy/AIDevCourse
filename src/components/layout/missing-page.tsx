/**
 * [INPUT]: Localized 404 copy, a course link, a home link, and other-language entries.
 * [OUTPUT]: Two-column unavailable page: copy on the left, a large mono 404 on the right.
 * [POS]: Shared by the locale not-found document and the root English document.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
export function MissingPage({ title, body, primaryHref, primaryLabel, homeHref, homeLabel, languagesLabel, languages }: {
  title: string; body: string; primaryHref: string; primaryLabel: string; homeHref: string; homeLabel: string;
  languagesLabel: string; languages: { href: string; lang: string; label: string }[];
}) {
  return <main id="main-content" className="status-split" tabIndex={-1}>
    <div>
      <p className="status-kicker">404</p>
      <h1>{title}</h1>
      <p className="status-lead">{body}</p>
      <div className="home-ctas">
        <Link className="home-cta" href={primaryHref}>{primaryLabel}</Link>
        <Link className="home-cta home-cta-secondary" href={homeHref}>{homeLabel}</Link>
      </div>
      <nav className="status-langs" aria-label={languagesLabel}>{languages.map((language) => <Link key={language.href} href={language.href} lang={language.lang}>{language.label}</Link>)}</nav>
    </div>
    <p className="status-giant" aria-hidden="true">404</p>
  </main>;
}
