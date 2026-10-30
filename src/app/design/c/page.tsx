import { Badge } from '@/components/ui/badge';
import type { Metadata } from 'next';
import Link from 'next/link';
import { levelLabel, loadDesignCourse, tracks } from '../catalog';
import { Brand, DesignFooter, VariantSwitch } from '../ui';

export const metadata: Metadata = { title: '方案 C · 工作台' };

const sampleLabel = ['修改前', '期望结果'];

export default function DesignC() {
  const course = loadDesignCourse();
  const first = course.lessons[0];
  const samples = first?.samples.filter((sample) => sample.lang === 'tsx').slice(0, 2) ?? [];
  return <div className="grid min-h-screen grid-cols-[260px_minmax(0,1fr)] items-stretch max-[961px]:grid-cols-1">
    <aside className="border-r border-[var(--line)] px-[18px] pt-[22px] pb-7 max-[961px]:border-r-0 max-[961px]:border-b max-[721px]:px-4 [&_a]:flex [&_a]:items-baseline [&_a]:justify-between [&_a]:gap-2 [&_a]:px-0 [&_a]:py-[7px] [&_a]:text-sm [&_a:hover]:text-[var(--fg)] [&_a[aria-current=page]]:font-medium [&_h2]:m-0 [&_h2]:mt-[22px] [&_h2]:mb-2 [&_h2]:text-[var(--faint)] [&_h2]:font-mono [&_h2]:text-xs [&_h2]:font-medium [&_h2]:tracking-wide [&_em]:text-[var(--faint)] [&_em]:not-italic [&_em]:font-mono [&_em]:text-xs">
      <Brand />
      <p className="m-0 text-[var(--mfg)] font-mono text-xs font-medium mt-[18px]">方案 C · 工作台</p>
      <h2>主题</h2>
      {tracks.map((track) => track.pending
        ? <div className="flex items-baseline justify-between gap-2 py-[7px] text-[var(--faint)] text-sm" key={track.id}><span>{track.title}</span><em>尚未发布</em></div>
        : <a key={track.id} href="#course" aria-current="page"><span>{track.title}</span><em className="font-mono tabular-nums">{course.lessons.length} 课</em></a>)}
      <h2>课时</h2>
      {course.lessons.map((lesson) => <a className="text-[var(--mfg)] [&_span_span]:mr-2 [&_span_span]:text-[var(--faint)] [&_span_span]:text-xs" key={lesson.id} href={`#${lesson.id}`}><span><span className="font-mono tabular-nums">{lesson.number}</span>{lesson.title}</span></a>)}
      <div className="mt-7 flex flex-wrap gap-x-3 gap-y-2 border-t border-[var(--line)] pt-4 text-[var(--mfg)] text-xs font-mono tabular-nums">
        <VariantSwitch current="c" />
        <Link href="/zh">现站</Link>
      </div>
    </aside>
    <div className="min-w-0 px-8 pt-7 max-[721px]:px-4 max-[721px]:pt-[22px]">
      <main id="main">
        <section className="grid grid-cols-3 rounded-[10px] border border-[var(--bd)] max-[961px]:grid-cols-1 [&>div]:px-4 [&>div]:pt-3.5 [&>div]:pb-3 [&>div+div]:border-l [&>div+div]:border-[var(--line)] max-[961px]:[&>div+div]:border-l-0 max-[961px]:[&>div+div]:border-t max-[961px]:[&>div+div]:border-[var(--line)] [&_b]:block [&_b]:text-3xl [&_b]:font-medium [&_b]:tracking-heading [&_b]:leading-display max-[721px]:[&_b]:text-2xl [&_span]:text-[var(--mfg)] [&_span]:text-xs" aria-label="这门课">
          <div><b className="font-mono tabular-nums">{String(course.lessons.length).padStart(2, '0')}</b><span>课</span></div>
          <div><b>{levelLabel[course.level]}</b><span>级别</span></div>
          <div><b className="font-mono tabular-nums">5</b><span>界面语言</span></div>
        </section>
        <p className="m-0 text-[var(--mfg)] font-mono text-xs font-medium mt-7" id="course">{course.title}</p>
        <h1 className="m-0 mt-2.5 text-title md:text-display font-medium tracking-heading leading-tight">走完一个能解释清楚的闭环。</h1>
        <p className="m-0 mt-5 max-w-[680px] text-base leading-body text-[var(--mfg)]">{first?.opening}</p>
        {first?.quote ? <figure className="mt-[22px] rounded-xl bg-[var(--surface)] p-1 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--bd)_64%,transparent)] [&_p]:m-0 [&_p]:px-3 [&_p]:pt-1 [&_p]:pb-3 [&_pre]:m-0 [&_pre]:overflow-auto [&_pre]:px-3 [&_pre]:pt-1 [&_pre]:pb-3 [&_pre]:text-[var(--fg)] [&_pre]:font-mono [&_pre]:text-caption [&_pre]:leading-copy [&_pre]:whitespace-pre">
          <figcaption className="flex justify-between gap-3 px-3 pt-2 pb-1 text-[var(--faint)] text-xs font-mono tabular-nums"><span>任务描述 · {first.id}</span><span>可直接交给 AI</span></figcaption>
          <p>{first.quote}</p>
        </figure> : null}
        {samples.length ? <div className="grid grid-cols-2 gap-3 max-[721px]:grid-cols-1 [&>*]:min-w-0">{samples.map((sample, index) => <figure className="mt-[22px] rounded-xl bg-[var(--surface)] p-1 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--bd)_64%,transparent)] [&_p]:m-0 [&_p]:px-3 [&_p]:pt-1 [&_p]:pb-3 [&_pre]:m-0 [&_pre]:overflow-auto [&_pre]:px-3 [&_pre]:pt-1 [&_pre]:pb-3 [&_pre]:text-[var(--fg)] [&_pre]:font-mono [&_pre]:text-caption [&_pre]:leading-copy [&_pre]:whitespace-pre" key={sampleLabel[index]}>
          <figcaption className="flex justify-between gap-3 px-3 pt-2 pb-1 text-[var(--faint)] text-xs font-mono tabular-nums"><span>{sampleLabel[index]}</span><span>{sample.lang}</span></figcaption>
          <pre><code>{sample.code}</code></pre>
        </figure>)}</div> : null}
        {first?.callout ? <div className="mt-4 flex items-start gap-3 [&_p]:m-0 [&_p]:text-[var(--mfg)] [&_p]:text-sm"><Badge>{first.callout.title}</Badge><p>{first.callout.body}</p></div> : null}

        <section className="pt-20 max-[721px]:pt-14">
          <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4 [&_p]:m-0 [&_p]:mt-2 [&_p]:max-w-[640px] [&_p]:text-[var(--mfg)]"><div><h2 className="m-0 text-2xl font-medium tracking-tight leading-tight">课时</h2><p>{course.audience}</p></div></div>
          <div className="mt-2">{course.lessons.map((lesson) => <article className="grid grid-cols-[44px_minmax(0,1fr)] items-baseline gap-3 border-t border-[var(--line)] py-[13px] max-[721px]:grid-cols-1 max-[721px]:gap-1 [&>span:first-child]:text-[var(--faint)] [&>span:first-child]:text-xs [&>span:last-child]:text-[var(--faint)] [&>span:last-child]:text-xs [&_strong]:font-medium" id={lesson.id} key={lesson.id}>
            <span className="font-mono tabular-nums">{lesson.number}</span>
            <div><strong>{lesson.title}</strong><span className="block text-[var(--mfg)] text-caption font-normal">{lesson.description}</span></div>


          </article>)}</div>
        </section>

        <section className="pt-20 max-[721px]:pt-14">
          <h2 className="m-0 text-2xl font-medium tracking-tight leading-tight">做完时应能解释</h2>
          <ul className="m-0 mt-2 list-none p-0 [&_li]:grid [&_li]:grid-cols-[28px_minmax(0,1fr)] [&_li]:gap-2 [&_li]:border-t [&_li]:border-[var(--line)] [&_li]:py-3">{course.goals.map((goal) => <li key={goal}><span className="mt-1 size-3.5 rounded-[3px] border border-[var(--bd)]" aria-hidden /><span>{goal}</span></li>)}</ul>
        </section>
      </main>
      <DesignFooter flush />
    </div>
  </div>;
}
