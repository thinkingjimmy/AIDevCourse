/**
 * [INPUT]: The published zh AI coding course.
 * [OUTPUT]: Editorial course page used as the homepage.
 * [POS]: Design B. It does not replace /[lang].
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { Metadata } from 'next';
import { levelLabel, loadDesignCourse, typeLabel } from '../catalog';
import { DesignFooter, DesignHeader } from '../ui';

export const metadata: Metadata = { title: '方案 B · 课页' };

export default function DesignB() {
  const course = loadDesignCourse();
  return <>
    <DesignHeader current="b" sections={[{ href: '#fit', label: '适合谁' }, { href: '#goals', label: '会学会' }, { href: '#path', label: '路径' }]} />
    <main id="main"><div className="d-narrow d-course-hero">
      <p className="d-kicker">方案 B · 课页 · AIDevCourse</p>
      <div className="d-pills">
        <span className="d-pill">{levelLabel[course.level]}</span>
        <span className="d-pill">{course.lessons.length} 课</span>
        <span className="d-pill">{course.durationMinutes} 分钟</span>
        <span className="d-pill">免费</span>
      </div>
      <h1 className="d-display">{course.title}</h1>
      <p className="d-lead">{course.description}</p>
      <p className="d-body">{course.intro}</p>

      <section id="fit" className="d-split">
        <dt>适合谁</dt>
        <dd><p>{course.audience}</p></dd>
        <dt>开始之前</dt>
        <dd>{course.prerequisites.map((item) => <p key={item}>{item}</p>)}</dd>
      </section>

      <section id="goals" className="d-section">
        <h2 className="d-h2">你将学会</h2>
        <div className="d-follow">{course.goals.map((goal, index) => <div className="d-goal" key={goal}>
          <span className="d-num">{String(index + 1).padStart(2, '0')}</span>
          <p>{goal}</p>
        </div>)}</div>
      </section>

      <section id="path" className="d-section">
        <div className="d-sec-head">
          <h2 className="d-h2">学习路径</h2>
          <span className="d-kicker">按顺序读</span>
        </div>
        {course.modules.map((module) => <div className="d-module" key={module.title}>
          <h3>{module.title}</h3>
          {module.lessons.map((lesson) => <article className="d-lesson" id={lesson.id} key={lesson.id}>
            <header>
              <span className="d-num">{lesson.number}</span>
              <h4>{lesson.title}</h4>
              <span className="d-tag">{typeLabel[lesson.type]}</span>
              <span className="mins d-num">{lesson.durationMinutes} 分钟</span>
            </header>
            <p className="desc">{lesson.description}</p>
            <p className="opening">{lesson.opening}</p>
          </article>)}
        </div>)}
        {course.closing ? <p className="d-closing">{course.closing}</p> : null}
      </section>
    </div></main>
    <DesignFooter />
  </>;
}
