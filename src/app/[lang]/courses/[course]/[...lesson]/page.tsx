/**
 * [INPUT]: Public lesson, current-language manifest, MDX registry, and progress controls.
 * [OUTPUT]: Wiki article at /{lang}/courses/{course}/{lesson}: mono eyebrow, title, intro, body, prev/next row, and an h2 table of contents.
 * [POS]: Lesson route inside the wiki shell; both static generation and runtime access enforce publication policy.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { PageTitle } from '@/components/layout/page-primitives';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale, htmlLanguages } from '@/lib/i18n/config';
import { groupModules } from '@/lib/content/model';
import { getCatalog, getCourse, getLesson, getArticle } from '@/lib/content/source';
import { identity } from '@/lib/content/model';
import { getMDXComponents } from '@/components/mdx/components';
import { LessonCompletion } from '@/components/progress/lesson-completion';
import { LessonNavigation } from '@/components/course/lesson-navigation';
import { pageMetadata } from '@/lib/metadata';
import { TranslationNotice } from '@/components/course/translation-notice';
type Props = { params: Promise<{ lang: string; course: string; lesson: string[] }> };
export function generateStaticParams() { return getCatalog().documents.filter((doc) => doc.data.kind === 'lesson').map((doc) => ({ lang: doc.locale, course: doc.courseSlug, lesson: [doc.slug.at(-1)!] })); }
export async function generateMetadata({ params }: Props) {
  const { lang, course, lesson } = await params; if (!isLocale(lang)) return {};
  const doc = getLesson(lang, course, lesson); return doc ? pageMetadata(lang, doc.url, doc.data.title, doc.data.description, identity(doc)) : {};
}
export default async function LessonPage({ params }: Props) {
  const { lang, course: slug, lesson } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const course = getCourse(lang, slug); const doc = getLesson(lang, slug, lesson); const article = getArticle(lang, slug, lesson);
  if (!course || !doc || !article || doc.data.kind !== 'lesson') notFound();
  const t = await getTranslations({ locale: lang, namespace: 'Course' });
  const ui = await getTranslations({ locale: lang, namespace: 'Ui' });
  const Body = article.data.body;
  const number = course.lessons.findIndex((item) => item.url === doc.url) + 1;
  const groups = groupModules(course.lessons);
  const groupIndex = groups.findIndex((group) => group.lessons.some((item) => item.lesson.url === doc.url));
  const group = groups[groupIndex];
  const toc = (article.data.toc ?? []).filter((item) => item.depth === 2);
  const verified = doc.data.lastVerified && ui('verified', { date: new Intl.DateTimeFormat(htmlLanguages[lang], { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${doc.data.lastVerified}T00:00:00Z`)) });
  return <>
    <article id="main-content" className="col-start-1 block min-w-0 px-12 pt-9 pb-20 max-[961px]:px-5 max-[961px]:pt-7 max-[961px]:pb-[72px]" tabIndex={-1}>
      {group && <p className="m-0 mb-2.5 font-mono text-[12px] text-muted-foreground">{String(groupIndex + 1).padStart(2, '0')} {group.title} · {ui('lessonNumber', { number })} · {ui('minutes', { count: doc.data.durationMinutes })}</p>}
      <PageTitle variant="lesson">{doc.data.title}</PageTitle>
      {doc.data.description ? <p className="m-0 mb-5 max-w-none text-[16px] leading-[1.7] text-muted-foreground">{doc.data.description}</p> : null}
      {(verified || doc.data.testedWith) && <p className="-mt-2 mb-4 text-[13px] text-muted-foreground">{[verified, doc.data.testedWith && ui('testedWith', { environment: doc.data.testedWith })].filter(Boolean).join(' · ')}</p>}
      <TranslationNotice document={doc} sourceLocale={course.sourceLocale} />
      <div className="prose"><Body components={getMDXComponents()} /></div>
      <LessonCompletion lessonId={doc.data.lessonId} />
      <LessonNavigation course={course} lessonId={doc.data.lessonId} />
    </article>
    {toc.length > 0 && <aside className="sticky top-7 col-start-2 px-[18px] pt-9 pb-12 pl-4 text-[13px] leading-[1.55] text-muted-foreground max-[1101px]:hidden"><b className="m-0 mb-2 block text-[12px] font-semibold text-foreground">{t('onThisPage')}</b><nav aria-label={t('onThisPage')}>{toc.map((item) => <a className="block py-1 text-muted-foreground no-underline hover:text-foreground" key={item.url} href={item.url}>{item.title}</a>)}</nav></aside>}
  </>;
}
