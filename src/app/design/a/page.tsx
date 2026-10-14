/**
 * [INPUT]: The published zh AI coding course.
 * [OUTPUT]: Catalog homepage: goals, lesson cards, topic map, and site principles.
 * [POS]: Design A. It does not replace /[lang].
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { Metadata } from 'next';
import { levelLabel, loadDesignCourse, principles, tracks, typeLabel } from '../catalog';
import { DesignFooter, DesignHeader } from '../ui';

export const metadata: Metadata = { title: '方案 A · 目录' };

export default function DesignA() {
  const course = loadDesignCourse();
  return <>
    <DesignHeader current="a" sections={[{ href: '#goals', label: '目标' }, { href: '#course', label: '课程' }, { href: '#tracks', label: '版图' }, { href: '#principles', label: '约定' }]} />
    <main id="main"><div className="d-wrap">
      <section className="d-hero">
        <p className="d-kicker">方案 A · 目录</p>
        <h1 className="d-display">和 AI 一起写代码，<br />每一步都看得懂。</h1>
        <p className="d-lead">从一个十分钟就能完成的小改动开始：说清要改什么，给出恰好够用的上下文，再亲手确认结果。判断权始终在你手里。</p>
        <div className="d-actions">
          <a className="d-btn" href="#course">看这门课</a>
          <a className="d-link" href="#tracks">三块主题</a>
        </div>
        <p className="d-method d-num">idea → context → code → check</p>
      </section>

      <section id="goals" className="d-section">
        <div className="d-sec-head"><h2 className="d-h2">学完可以做到</h2></div>
        <div>{course.goals.map((goal, index) => <div className="d-goal" key={goal}>
          <span className="d-num">{String(index + 1).padStart(2, '0')}</span>
          <p>{goal}</p>
        </div>)}</div>
      </section>

      <section id="course" className="d-section">
        <div className="d-sec-head">
          <div>
            <h2 className="d-h2">{course.title}</h2>
            <p>{course.description}</p>
          </div>
          <span className="d-kicker">{levelLabel[course.level]} · {course.lessons.length} 课 · {course.durationMinutes} 分钟</span>
        </div>
        <div className="d-grid-3">{course.lessons.map((lesson) => <article className="d-card" key={lesson.id}>
          <div className="d-card-k"><span className="d-num">{lesson.number}</span><span className="d-tag">{typeLabel[lesson.type]}</span></div>
          <h3>{lesson.title}</h3>
          <p className="desc">{lesson.description}</p>
          <div className="d-card-f"><span>{lesson.moduleTitle}</span><span className="d-num">{lesson.durationMinutes} 分钟</span></div>
        </article>)}</div>
      </section>

      <section id="tracks" className="d-section">
        <div className="d-sec-head">
          <div>
            <h2 className="d-h2">三块主题</h2>
            <p>站上要教 AI coding、LLM 和 AI agents。下面只列出仓库里已经写好的课。</p>
          </div>
        </div>
        <div className="d-lines">{tracks.map((track) => <div className="d-line" key={track.id}>
          <span className="name">{track.title}</span>
          <span className={`status d-num${track.pending ? ' pending' : ''}`}>{track.pending ? '尚未发布' : '已写好'}</span>
          <span className={track.pending ? 'pending' : undefined}>{track.pending ? track.note : `${course.title} · ${course.lessons.length} 课`}</span>
        </div>)}</div>
      </section>

      <section id="principles" className="d-section">
        <div className="d-sec-head"><h2 className="d-h2">阅读约定</h2></div>
        <div className="d-grid-4">{principles.map((item, index) => <article className="d-principle" key={item.id}>
          <span className="d-kicker">{String(index + 1).padStart(2, '0')}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>)}</div>
      </section>
    </div></main>
    <DesignFooter />
  </>;
}
