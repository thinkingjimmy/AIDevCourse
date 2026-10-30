import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';
import { levelLabel, loadDesignCourse } from '../catalog';
import { DesignFooter, DesignHeader } from '../ui';

export const metadata: Metadata = { title: '方案 B · 课页' };

export default function DesignB() {
  const course = loadDesignCourse();
  return <>
    <DesignHeader current="b" sections={[{ href: '#fit', label: '适合谁' }, { href: '#goals', label: '会学会' }, { href: '#path', label: '路径' }]} />
    <main id="main"><div className="mx-auto w-[min(720px,calc(100%-32px))] pt-[72px] max-[721px]:pt-10">
      <p className="m-0 text-[var(--mfg)] font-mono text-xs font-medium">方案 B · 课页 · AIDevCourse</p>
      <div className="mt-[22px] flex flex-wrap gap-2">
        <Badge variant="secondary">{levelLabel[course.level]}</Badge>
        <Badge variant="secondary">{course.lessons.length} 课</Badge>

        <Badge variant="secondary">免费</Badge>
      </div>
      <h1 className="m-0 text-title md:text-5xl font-medium tracking-heading leading-tight mt-[18px]">{course.title}</h1>
      <p className="m-0 mt-5 max-w-[680px] text-base leading-body text-[var(--mfg)]">{course.description}</p>
      <p className="m-0 mt-4 max-w-[680px]">{course.intro}</p>

      <section id="fit" className="mt-9 grid grid-cols-[96px_minmax(0,1fr)] gap-x-[18px] gap-y-2 max-[721px]:grid-cols-1 max-[721px]:gap-1 [&_dt]:m-0 [&_dt]:border-t [&_dt]:border-[var(--line)] [&_dt]:pt-3.5 [&_dt]:text-[var(--mfg)] [&_dt]:text-caption [&_dd]:m-0 [&_dd]:border-t [&_dd]:border-[var(--line)] [&_dd]:pt-3.5 [&_dd_p]:m-0 [&_dd_p+p]:mt-1.5">
        <dt>适合谁</dt>
        <dd><p>{course.audience}</p></dd>
        <dt>开始之前</dt>
        <dd>{course.prerequisites.map((item) => <p key={item}>{item}</p>)}</dd>
      </section>

      <section id="goals" className="pt-20 max-[721px]:pt-14">
        <h2 className="m-0 text-2xl font-medium tracking-tight leading-tight">你将学会</h2>
        <div className="mt-7">{course.goals.map((goal, index) => <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-2 border-t border-[var(--line)] py-4 [&>span]:pt-[3px] [&>span]:text-[var(--faint)] [&>span]:text-xs [&_p]:m-0 [&_p]:text-base" key={goal}>
          <span className="font-mono tabular-nums">{String(index + 1).padStart(2, '0')}</span>
          <p>{goal}</p>
        </div>)}</div>
      </section>

      <section id="path" className="pt-20 max-[721px]:pt-14">
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4 [&_p]:m-0 [&_p]:mt-2 [&_p]:max-w-[640px] [&_p]:text-[var(--mfg)]">
          <h2 className="m-0 text-2xl font-medium tracking-tight leading-tight">学习路径</h2>
          <span className="m-0 text-[var(--mfg)] font-mono text-xs font-medium">按顺序读</span>
        </div>
        {course.modules.map((module) => <div className="mt-7 [&_h3]:m-0 [&_h3]:mb-1 [&_h3]:text-[var(--mfg)] [&_h3]:text-caption [&_h3]:font-medium" key={module.title}>
          <h3>{module.title}</h3>
          {module.lessons.map((lesson) => <article className="border-t border-[var(--line)] py-[22px] [&_header]:flex [&_header]:items-baseline [&_header]:gap-3 max-[721px]:[&_header]:flex-wrap [&_h4]:m-0 [&_h4]:flex-1 [&_h4]:text-lg [&_h4]:font-medium [&_h4]:tracking-tight [&_h4]:leading-snug" id={lesson.id} key={lesson.id}>
            <header>
              <span className="font-mono tabular-nums">{lesson.number}</span>
              <h4>{lesson.title}</h4>


            </header>
            <p className="m-0 mt-2.5 text-[var(--fg)]">{lesson.description}</p>
            <p className="m-0 mt-2 text-[var(--mfg)]">{lesson.opening}</p>
          </article>)}
        </div>)}
        {course.closing ? <p className="mt-7 text-[var(--mfg)] text-sm">{course.closing}</p> : null}
      </section>
    </div></main>
    <DesignFooter />
  </>;
}
