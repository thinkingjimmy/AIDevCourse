/**
 * [INPUT]: Current locale and real published content in other languages, canonical locale paths.
 * [OUTPUT]: Empty course library, an about link, and links to courses published in other languages.
 * [POS]: Homepage state when the active language has no published course.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { localePath } from '@/lib/i18n/routing';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import { getCatalog } from '@/lib/content/source';
import { languageNames, htmlLanguages, type Locale } from '@/lib/i18n/config';
export async function EmptyCourses({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'Course' });
  const others = getCatalog().courses.filter((course) => course.locale !== locale);
  return <div className="flex max-w-none flex-col items-start gap-4 pt-2"><h3 className="m-0 font-sans text-base leading-snug font-semibold">{t('emptyTitle')}</h3><p className="text-ui leading-reading text-muted-foreground">{t('emptyBody')}</p>
    <Button asChild variant="paper" size="paper"><Link href={localePath(locale, '/about')}>{t('aboutSite')}</Link></Button>
    {others.length > 0 && <><p className="text-sm text-muted-foreground">{t('otherLanguages')}</p><div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">{others.map((course) => <Link className="inline-flex min-h-11 items-center text-foreground underline underline-offset-4" key={course.url} href={course.url} lang={htmlLanguages[course.locale]}>{languageNames[course.locale]}</Link>)}</div></>}
  </div>;
}
