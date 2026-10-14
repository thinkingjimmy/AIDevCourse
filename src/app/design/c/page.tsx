/**
 * [INPUT]: The published zh AI coding course, including the first lesson's real task and diff.
 * [OUTPUT]: Studio homepage with a topic rail, metrics, and the actual code change.
 * [POS]: Design C. It does not replace /[lang].
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { levelLabel, loadDesignCourse, tracks, typeLabel } from '../catalog';
import { Brand, DesignFooter, VariantSwitch } from '../ui';

export const metadata: Metadata = { title: '方案 C · 工作台' };

const sampleLabel = ['修改前', '期望结果'];

export default function DesignC() {
  const course = loadDesignCourse();
  const first = course.lessons[0];
  const samples = first?.samples.filter((sample) => sample.lang === 'tsx').slice(0, 2) ?? [];
  return <div className="studio">
    <aside className="rail">
      <Brand />
      <p className="d-kicker">方案 C · 工作台</p>
      <h2>主题</h2>
      {tracks.map((track) => track.pending
        ? <div className="quiet" key={track.id}><span>{track.title}</span><em>尚未发布</em></div>
        : <a key={track.id} href="#course" aria-current="page"><span>{track.title}</span><em className="d-num">{course.lessons.length} 课</em></a>)}
      <h2>课时</h2>
      {course.lessons.map((lesson) => <a className="lesson-link" key={lesson.id} href={`#${lesson.id}`}><span><span className="d-num">{lesson.number}</span>{lesson.title}</span></a>)}
      <div className="rail-foot d-num">
        <VariantSwitch current="c" />
        <Link href="/zh">现站</Link>
      </div>
    </aside>
    <div className="studio-main">
      <main id="main">
        <section className="metrics" aria-label="这门课">
          <div><b className="d-num">{String(course.lessons.length).padStart(2, '0')}</b><span>课</span></div>
          <div><b className="d-num">{course.durationMinutes}</b><span>分钟</span></div>
          <div><b>{levelLabel[course.level]}</b><span>级别</span></div>
          <div><b className="d-num">5</b><span>界面语言</span></div>
        </section>
        <p className="d-kicker" id="course">{course.title}</p>
        <h1 className="d-display">走完一个能解释清楚的闭环。</h1>
        <p className="d-lead">{first?.opening}</p>
        {first?.quote ? <figure className="codefig">
          <figcaption className="codefig-bar d-num"><span>任务描述 · {first.id}</span><span>可直接交给 AI</span></figcaption>
          <p>{first.quote}</p>
        </figure> : null}
        {samples.length ? <div className="diff">{samples.map((sample, index) => <figure className="codefig" key={sampleLabel[index]}>
          <figcaption className="codefig-bar d-num"><span>{sampleLabel[index]}</span><span>{sample.lang}</span></figcaption>
          <pre><code>{sample.code}</code></pre>
        </figure>)}</div> : null}
        {first?.callout ? <div className="callout"><span className="d-tag">{first.callout.title}</span><p>{first.callout.body}</p></div> : null}

        <section className="d-section">
          <div className="d-sec-head"><div><h2 className="d-h2">课时</h2><p>{course.audience}</p></div></div>
          <div className="sheet">{course.lessons.map((lesson) => <article className="sheet-row" id={lesson.id} key={lesson.id}>
            <span className="d-num">{lesson.number}</span>
            <div><strong>{lesson.title}</strong><span className="sub">{lesson.description}</span></div>
            <span className="d-tag">{typeLabel[lesson.type]}</span>
            <span className="d-num">{lesson.durationMinutes} 分钟</span>
          </article>)}</div>
        </section>

        <section className="d-section">
          <h2 className="d-h2">做完时应能解释</h2>
          <ul className="checks">{course.goals.map((goal) => <li key={goal}><span className="box" aria-hidden /><span>{goal}</span></li>)}</ul>
        </section>
      </main>
      <DesignFooter flush />
    </div>
  </div>;
}
