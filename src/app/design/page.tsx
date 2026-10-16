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
    <main id="main"><div className="mx-auto w-[min(720px,calc(100%-32px))] pt-[72px] max-[721px]:pt-10">
      <p className="m-0 text-[var(--mfg)] [font-family:var(--mono)] text-[12px] font-medium">AIDevCourse · aidevcourse.com</p>
      <h1 className="m-0 text-[clamp(36px,5vw,52px)] font-medium tracking-[-.03em] leading-[1.12] mt-[18px]">三份首页。</h1>
      <p className="m-0 mt-5 max-w-[680px] text-[17px] leading-[1.7] text-[var(--mfg)]">同一套锌色、发丝线和等宽数字，三种不同的首页。内容来自仓库里已经写好的中文课，当前首页保持原样。</p>
      <div className="mt-7">{studies.map((item) => <Link key={item.href} href={item.href} className="grid grid-cols-[148px_96px_minmax(0,1fr)] items-baseline gap-3 border-t border-[var(--line)] py-3.5 text-[14px] hover:bg-[color-mix(in_oklab,var(--muted)_55%,transparent)] max-[721px]:grid-cols-1 max-[721px]:gap-1">
        <span className="font-medium">{item.name}</span>
        <span className="text-[12px] text-[var(--mfg)] [font-family:var(--mono)] tabular-nums">{item.path}</span>
        <span>{item.body}</span>
      </Link>)}</div>
    </div></main>
    <DesignFooter />
  </>;
}
