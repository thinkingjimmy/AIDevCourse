/**
 * [INPUT]: The three homepage routes.
 * [OUTPUT]: A short index that points at each preview without replacing /zh.
 * [POS]: Entry for /design.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { DesignFooter, DesignHeader } from './ui';

export const metadata: Metadata = { title: { absolute: '三份首页 · AIDevCourse' } };

const studies = [
  { href: '/design/a', name: 'A · 目录', path: '/design/a', body: '课程站首页。大标题下面是学习目标、三张课时卡、三块主题和阅读约定。' },
  { href: '/design/b', name: 'B · 课页', path: '/design/b', body: '首页就是这一门课。窄栏阅读：适合谁、会学会什么、按模块展开的路径。' },
  { href: '/design/c', name: 'C · 工作台', path: '/design/c', body: '左侧是主题和课时，右侧是指标、真实任务，以及修改前后的代码。' },
];

export default function DesignIndex() {
  return <>
    <DesignHeader />
    <main id="main"><div className="d-narrow d-course-hero">
      <p className="d-kicker">AIDevCourse · aidevcourse.com</p>
      <h1 className="d-display">三份首页。</h1>
      <p className="d-lead">同一套锌色、发丝线和等宽数字，三种不同的首页。内容来自仓库里已经写好的中文课，当前首页保持原样。</p>
      <div className="d-lines d-follow">{studies.map((item) => <Link key={item.href} href={item.href} className="d-line">
        <span className="name">{item.name}</span>
        <span className="status d-num">{item.path}</span>
        <span>{item.body}</span>
      </Link>)}</div>
    </div></main>
    <DesignFooter />
  </>;
}
