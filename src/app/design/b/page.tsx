/**
 * [INPUT]: The published zh AI coding course.
 * [OUTPUT]: Editorial course page used as the homepage.
 * [POS]: Design B. It does not replace /[lang].
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';
import { levelLabel, loadDesignCourse, typeLabel } from '../catalog';
import { DesignFooter, DesignHeader } from '../ui';

export const metadata: Metadata = { title: '方案 B · 课页' };

export default function DesignB() {
  const course = loadDesignCourse();
  return <>
    <DesignHeader current="b" sections={[{ href: '#fit', label: '适合谁' }, { href: '#goals', label: '会学会' }, { href: '#path', label: '路径' }]} />
    <main id="main"><div className="mx-auto w-[min(720px,calc(100%-32px))] pt-[72px] max-[721px]:pt-10">
      <p className="m-0 text-[var(--mfg)] [font-family:var(--mono)] text-[12px] font-medium">方案 B · 课页 · AIDevCourse</p>
      <div className="mt-[22px] flex flex-wrap gap-2">
        <Badge variant="secondary">{levelLabel[course.level]}</Badge>
        <Badge variant="secondary">{course.lessons.length} 课</Badge>
        <Badge variant="secondary">{course.durationMinutes} 分钟</Badge>
        <Badge variant="secondary">免费</Badge>
      </div>
      <h1 className="m-0 text-[clamp(36px,5vw,52px)] font-medium tracking-[-.03em] leading-[1.12] mt-[18px]">{course.title}</h1>
      <p className="m-0 mt-5 max-w-[680px] text-[17px] leading-[1.7] text-[var(--mfg)]">{course.description}</p>
      <p className="m-0 mt-4 max-w-[680px]">{course.intro}</p>

      <section id="fit" className="mt-9 grid grid-cols-[96px_minmax(0,1fr)] gap-x-[18px] gap-y-2 max-[721px]:grid-cols-1 max-[721px]:gap-1 [&_dt]:m-0 [&_dt]:border-t [&_dt]:border-[var(--line)] [&_dt]:pt-3.5 [&_dt]:text-[var(--mfg)] [&_dt]:text-[13px] [&_dd]:m-0 [&_dd]:border-t [&_dd]:border-[var(--line)] [&_dd]:pt-3.5 [&_dd_p]:m-0 [&_dd_p+p]:mt-1.5">
        <dt>适合谁</dt>
        <dd><p>{course.audience}</p></dd>
        <dt>开始之前</dt>
        <dd>{course.prerequisites.map((item) => <p key={item}>{item}</p>)}</dd>
      </section>

      <section id="goals" className="pt-20 max-[721px]:pt-14">
        <h2 className="m-0 text-[26px] font-medium tracking-[-.025em] leading-[1.25]">你将学会</h2>
        <div className="mt-7">{course.goals.map((goal, index) => <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-2 border-t border-[var(--line)] py-4 [&>span]:pt-[3px] [&>span]:text-[var(--faint)] [&>span]:text-[12px] [&_p]:m-0 [&_p]:text-[16px]" key={goal}>
          <span className="[font-family:var(--mono)] tabular-nums">{String(index + 1).padStart(2, '0')}</span>
          <p>{goal}</p>
        </div>)}</div>
      </section>

      <section id="path" className="pt-20 max-[721px]:pt-14">
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4 [&_p]:m-0 [&_p]:mt-2 [&_p]:max-w-[640px] [&_p]:text-[var(--mfg)]">
          <h2 className="m-0 text-[26px] font-medium tracking-[-.025em] leading-[1.25]">学习路径</h2>
          <span className="m-0 text-[var(--mfg)] [font-family:var(--mono)] text-[12px] font-medium">按顺序读</span>
        </div>
        {course.modules.map((module) => <div className="mt-7 [&_h3]:m-0 [&_h3]:mb-1 [&_h3]:text-[var(--mfg)] [&_h3]:text-[13px] [&_h3]:font-medium" key={module.title}>
          <h3>{module.title}</h3>
          {module.lessons.map((lesson) => <article className="border-t border-[var(--line)] py-[22px] [&_header]:flex [&_header]:items-baseline [&_header]:gap-3 max-[721px]:[&_header]:flex-wrap [&_h4]:m-0 [&_h4]:flex-1 [&_h4]:text-[18px] [&_h4]:font-medium [&_h4]:tracking-[-.02em] [&_h4]:leading-[1.4]" id={lesson.id} key={lesson.id}>
            <header>
              <span className="[font-family:var(--mono)] tabular-nums">{lesson.number}</span>
              <h4>{lesson.title}</h4>
              <Badge>{typeLabel[lesson.type]}</Badge>
              <span className="text-[var(--mfg)] text-[12px] whitespace-nowrap [font-family:var(--mono)] tabular-nums">{lesson.durationMinutes} 分钟</span>
            </header>
            <p className="m-0 mt-2.5 text-[var(--fg)]">{lesson.description}</p>
            <p className="m-0 mt-2 text-[var(--mfg)]">{lesson.opening}</p>
          </article>)}
        </div>)}
        {course.closing ? <p className="mt-7 text-[var(--mfg)] text-[14px]">{course.closing}</p> : null}
      </section>
    </div></main>
    <DesignFooter />
  </>;
}
