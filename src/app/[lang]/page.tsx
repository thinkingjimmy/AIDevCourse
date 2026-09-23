/**
 * [INPUT]: Active locale and its published course manifests.
 * [OUTPUT]: Localized home: hero with the three-move workflow, real course availability, and site principles.
 * [POS]: Public entry surface; counts and destinations derive from the catalog.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, BookOpen, Clock3, CornerDownRight, Laptop } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/lib/i18n/config';
import { getCourses } from '@/lib/content/source';
import { GridFrame } from '@/components/layout/grid-frame';
import { CourseCard } from '@/components/course/course-card';
import { EmptyCourses } from '@/components/course/empty-courses';
import { pageMetadata } from '@/lib/seo/metadata';
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  return pageMetadata(lang, `/${lang}`, t('title').replace('\n', ' '), t('intro'));
}
export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params; if (!isLocale(lang)) notFound(); setRequestLocale(lang);
  const t = await getTranslations({ locale: lang, namespace: 'Home' });
  const course = await getTranslations({ locale: lang, namespace: 'Course' });
  const courses = getCourses(lang);
  const first = courses[0]?.lessons[0]?.url ?? courses[0]?.url;
  const principles = ['record', 'language', 'privacy'] as const;
  return <main id="main-content" className="site-main" tabIndex={-1}>
    <GridFrame className="home-hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="square-dot" aria-hidden />{t('eyebrow')}</p>
        <h1 className="serif">{t('title')}</h1>
        <p className="hero-description">{t('intro')}</p>
        <div className="hero-actions">{first
          ? <><Link className="button primary" href={first}>{t('start')}<ArrowRight size={17} aria-hidden /></Link><Link className="text-link" href={`/${lang}/courses`}>{t('browse')}</Link></>
          : <Link className="button" href={`/${lang}/about`}>{course('aboutSite')}</Link>}</div>
        <ul className="hero-trust">
          <li><BookOpen size={15} aria-hidden />{t('trustFree')}</li>
          <li><Laptop size={15} aria-hidden />{t('trustLocal')}</li>
          <li><Clock3 size={15} aria-hidden />{t('trustTime')}</li>
        </ul>
      </div>
      <div className="hero-notes"><div className="field-notes">
        <div className="window-bar"><span className="window-square" aria-hidden /><span>{t('pathTitle')}</span><span className="window-lines" aria-hidden /></div>
        <ol className="notes-content">
          <li className="note-step"><span className="note-number">01</span><div><h2>{t('stepOneTitle')}</h2><p>{t('stepOneBody')}</p><p className="note-example">{t('stepOneExample')}</p></div></li>
          <li className="note-step"><span className="note-number">02</span><div><h2>{t('stepTwoTitle')}</h2><p>{t('stepTwoBody')}</p></div></li>
          <li className="note-step"><span className="note-number">03</span><div><h2>{t('stepThreeTitle')}</h2><p>{t('stepThreeBody')}</p>
            <p className="note-diff" translate="no"><span className="removed">- Browse courses</span><span className="added">+ Start learning</span></p></div></li>
        </ol>
        <div className="notes-bottom" aria-hidden><CornerDownRight size={15} /><span>idea → context → code → check</span></div>
      </div></div>
    </GridFrame>
    <GridFrame>
      <div className="section-heading"><div><p className="eyebrow">{t('courseEyebrow')}</p><h2 className="serif">{t('courseTitle')}</h2></div><p>{t('courseIntro')}</p></div>
      {courses.length ? courses.map((item, index) => <CourseCard key={item.id} course={item} index={index} />) : <EmptyCourses locale={lang} />}
    </GridFrame>
    <GridFrame className="home-principles">{principles.map((part) => <section key={part}>
      <p className="eyebrow">{t(`${part}Eyebrow`)}</p><h3>{t(`${part}Title`)}</h3><p>{t(`${part}Body`)}</p>
    </section>)}</GridFrame>
  </main>;
}
