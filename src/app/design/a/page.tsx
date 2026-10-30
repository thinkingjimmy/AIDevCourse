import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';
import { levelLabel, loadDesignCourse, principles, tracks } from '../catalog';
import { DesignFooter, DesignHeader } from '../ui';

export const metadata: Metadata = { title: '方案 A · 目录' };

export default function DesignA() {
  const course = loadDesignCourse();
  return <>
    <DesignHeader current="a" sections={[{ href: '#goals', label: '目标' }, { href: '#course', label: '课程' }, { href: '#tracks', label: '版图' }, { href: '#principles', label: '约定' }]} />
    <main id="main"><div className="mx-auto w-[min(1200px,calc(100%-32px))]">
      <section className="pt-[88px] pb-2 max-[721px]:pt-12">
        <p className="m-0 text-[var(--mfg)] font-mono text-xs font-medium">方案 A · 目录</p>
        <h1 className="m-0 text-title md:text-5xl font-medium tracking-heading leading-tight">和 AI 一起写代码，<br />每一步都看得懂。</h1>
        <p className="m-0 mt-5 max-w-[680px] text-base leading-body text-[var(--mfg)]">从一个十分钟就能完成的小改动开始：说清要改什么，给出恰好够用的上下文，再亲手确认结果。判断权始终在你手里。</p>
        <div className="mt-7 flex flex-wrap items-center gap-x-[22px] gap-y-4">
          <Button asChild variant="preview" size="preview"><a href="#course">看这门课</a></Button>
          <a className="no-underline decoration-[color-mix(in_oklab,currentColor_30%,transparent)] underline-offset-[3px] hover:decoration-current" href="#tracks">三块主题</a>
        </div>
        <p className="m-0 mt-[22px] text-[var(--faint)] text-xs font-mono tabular-nums">idea → context → code → check</p>
      </section>

      <section id="goals" className="pt-20 max-[721px]:pt-14">
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4 [&_p]:m-0 [&_p]:mt-2 [&_p]:max-w-[640px] [&_p]:text-[var(--mfg)]"><h2 className="m-0 text-2xl font-medium tracking-tight leading-tight">学完可以做到</h2></div>
        <div>{course.goals.map((goal, index) => <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-2 border-t border-[var(--line)] py-4 [&>span]:pt-[3px] [&>span]:text-[var(--faint)] [&>span]:text-xs [&_p]:m-0 [&_p]:text-base" key={goal}>
          <span className="font-mono tabular-nums">{String(index + 1).padStart(2, '0')}</span>
          <p>{goal}</p>
        </div>)}</div>
      </section>

      <section id="course" className="pt-20 max-[721px]:pt-14">
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4 [&_p]:m-0 [&_p]:mt-2 [&_p]:max-w-[640px] [&_p]:text-[var(--mfg)]">
          <div>
            <h2 className="m-0 text-2xl font-medium tracking-tight leading-tight">{course.title}</h2>
            <p>{course.description}</p>
          </div>
          <span className="m-0 text-[var(--mfg)] font-mono text-xs font-medium">{levelLabel[course.level]} · {course.lessons.length} 课</span>
        </div>
        <div className="grid grid-cols-3 gap-4 max-[961px]:grid-cols-2 max-[721px]:grid-cols-1">{course.lessons.map((lesson) => <article className="flex min-w-0 flex-col rounded-[10px] border border-[var(--bd)] bg-[var(--bg)] px-4 pt-4 pb-3.5 hover:border-[color-mix(in_oklab,var(--fg)_22%,var(--bd))] [&_h3]:m-0 [&_h3]:mt-[18px] [&_h3]:text-base [&_h3]:font-medium [&_h3]:tracking-tight [&_h3]:leading-snug" key={lesson.id}>
          <div className="flex items-center justify-between gap-3 [&>span:first-child]:text-[var(--faint)] [&>span:first-child]:text-xs"><span className="font-mono tabular-nums">{lesson.number}</span></div>
          <h3>{lesson.title}</h3>
          <p className="m-0 mt-2 text-[var(--mfg)] text-sm leading-copy">{lesson.description}</p>
          <div className="mt-auto flex items-center justify-between gap-3 pt-[22px] text-[var(--mfg)] text-xs [&>span:last-child]:text-[var(--fg)]"><span>{lesson.moduleTitle}</span></div>
        </article>)}</div>
      </section>

      <section id="tracks" className="pt-20 max-[721px]:pt-14">
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4 [&_p]:m-0 [&_p]:mt-2 [&_p]:max-w-[640px] [&_p]:text-[var(--mfg)]">
          <div>
            <h2 className="m-0 text-2xl font-medium tracking-tight leading-tight">三块主题</h2>
            <p>站上要教 AI coding、LLM 和 AI agents。下面只列出仓库里已经写好的课。</p>
          </div>
        </div>
        <div>{tracks.map((track) => <div className="grid grid-cols-[148px_96px_minmax(0,1fr)] items-baseline gap-3 border-t border-[var(--line)] py-3.5 text-sm hover:bg-[color-mix(in_oklab,var(--muted)_55%,transparent)] max-[721px]:grid-cols-1 max-[721px]:gap-1" key={track.id}>
          <span className="font-medium">{track.title}</span>
          <span className={cn('text-xs text-[var(--mfg)] font-mono tabular-nums', track.pending && 'text-[var(--faint)]')}>{track.pending ? '尚未发布' : '已写好'}</span>
          <span className={track.pending ? 'text-[var(--faint)]' : undefined}>{track.pending ? track.note : `${course.title} · ${course.lessons.length} 课`}</span>
        </div>)}</div>
      </section>

      <section id="principles" className="pt-20 max-[721px]:pt-14">
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4 [&_p]:m-0 [&_p]:mt-2 [&_p]:max-w-[640px] [&_p]:text-[var(--mfg)]"><h2 className="m-0 text-2xl font-medium tracking-tight leading-tight">阅读约定</h2></div>
        <div className="grid grid-cols-4 gap-x-8 gap-y-7 max-[961px]:grid-cols-2 max-[721px]:grid-cols-1">{principles.map((item, index) => <article className="[&>span]:text-[var(--faint)] [&_h3]:m-0 [&_h3]:mt-2.5 [&_h3]:text-ui [&_h3]:font-medium [&_p]:m-0 [&_p]:mt-2 [&_p]:text-[var(--mfg)] [&_p]:text-sm" key={item.id}>
          <span className="m-0 text-[var(--mfg)] font-mono text-xs font-medium">{String(index + 1).padStart(2, '0')}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>)}</div>
      </section>
    </div></main>
    <DesignFooter />
  </>;
}
