/**
 * [INPUT]: Localized 404 copy, available course/home recovery links, and other-language entries.
 * [OUTPUT]: Two-column unavailable page: copy on the left, a large mono 404 on the right.
 * [POS]: Shared by the locale not-found document and the root English document.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusPage, PageTitle, PageEyebrow, PageActions } from './page-primitives';
export function MissingPage({ title, body, primaryHref, primaryLabel, homeHref, homeLabel, languagesLabel, languages }: {
  title: string; body: string; primaryHref: string; primaryLabel: string; homeHref: string; homeLabel: string;
  languagesLabel: string; languages: { href: string; lang: string; label: string }[];
}) {
  return <StatusPage id="main-content" className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] content-center items-center gap-8 max-[721px]:grid-cols-1" tabIndex={-1}>
    <div>
      <PageEyebrow>404</PageEyebrow>
      <PageTitle>{title}</PageTitle>
      <p className="m-0 mb-7 max-w-[40rem] text-[16px] leading-[1.75] text-muted-foreground">{body}</p>
      <PageActions>
        <Button asChild variant="action" size="action"><Link href={primaryHref}>{primaryLabel}</Link></Button>
        {primaryHref !== homeHref && <Button asChild variant="action-outline" size="action"><Link href={homeHref}>{homeLabel}</Link></Button>}
      </PageActions>
      <nav className="mt-7 flex flex-wrap gap-x-[18px] gap-y-2 font-mono text-[12px] text-muted-foreground" aria-label={languagesLabel}>{languages.map((language) => <Link className="text-inherit no-underline hover:text-foreground" key={language.href} href={language.href} lang={language.lang}>{language.label}</Link>)}</nav>
    </div>
    <p className="m-0 justify-self-end font-mono text-[clamp(120px,16vw,220px)] leading-[.8] font-medium tracking-[-.06em] text-muted select-none max-[721px]:justify-self-start max-[721px]:text-[96px]" aria-hidden="true">404</p>
  </StatusPage>;
}
