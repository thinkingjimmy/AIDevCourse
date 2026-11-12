import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { groupModules, type CourseManifest } from '@/lib/content/model';
import { HeroPrimaryAction } from '@/components/layout/page-primitives';
import { OpticalDiscCover } from '@/components/home/disk';
import { blogCourseId } from '@/lib/site-config';
import { CourseDisk } from '../course-card';

export async function CourseOverview({ course, reference = false }: { course: CourseManifest; reference?: boolean }) {
  const t = await getTranslations({ locale: course.locale, namespace: 'Course' });
  const ui = await getTranslations({ locale: course.locale, namespace: 'Ui' });
  const home = await getTranslations({ locale: course.locale, namespace: 'Home' });
  const groups = groupModules(course.lessons);
  const first = course.lessons[0];
  const level = course.section === 'introduction' ? home('gettingStarted') : ui(course.level);
  const count = ui('lessonCount', { count: course.lessons.length });
  const stamp = course.updating && course.id !== blogCourseId ? t('updatingStamp') : undefined;
  const Root = reference ? 'section' : 'main';
  const Title = reference ? 'h2' : 'h1';
  const catalogId = reference ? `reading-${course.locale}-${course.slug}-catalog` : 'course-catalog';
  return <Root id={reference ? undefined : 'main-content'} className="course-overview" tabIndex={-1}>
    <section data-slot="course-hero" className="course-overview-hero">
      <div>
        <p className="course-overview-meta"><span>{level}</span><span aria-hidden>·</span><span>{t('free')}</span><span aria-hidden>·</span><span>{count}</span>
          {stamp && <span className="sr-only">{stamp}</span>}
        </p>
        <Title className={reference ? 'm-0 mb-4 font-pixel text-title leading-heading font-normal text-brand' : undefined}>{course.title}</Title>
        <p className="course-overview-description">{course.description}</p>
        {first && <HeroPrimaryAction href={first.url}>{t('startFirst')}</HeroPrimaryAction>}
      </div>
      <div className="course-disk-cover" aria-hidden="true">
        {course.id === blogCourseId ? <OpticalDiscCover id={course.id} title={course.title} />
          : <CourseDisk course={{ ...course, lessonCount: course.lessons.length }}
            labels={{ level, status: first ? count : stamp ? undefined : t('updating'), stamp }} />}
      </div>
    </section>
    <section className="course-directory" aria-labelledby={catalogId}>
      <h2 id={catalogId}>{t('catalog')}</h2>
      {groups.length ? <div className="course-directory-groups">
        {groups.map((group, index) => <section key={group.module} className="course-directory-group">
          <h3><span>{String(index + 1).padStart(2, '0')}</span>{group.title}</h3>
          <ol>{group.lessons.map(({ lesson, part }) => <li key={lesson.id}>
            <Link href={lesson.url}><span>{part}</span><span>{lesson.title}</span><ArrowRightIcon size={14} aria-hidden /></Link>
          </li>)}</ol>
        </section>)}
      </div> : <div data-slot="course-empty" className="border border-border bg-surface p-6">
        <h3 className="m-0 text-lg font-semibold">{t('updating')}</h3>
        <p className="m-0 mt-2 text-ui text-muted-foreground">{t('updatingBody')}</p>
      </div>}
    </section>
  </Root>;
}
