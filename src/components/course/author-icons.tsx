import type { ComponentProps } from 'react';

export type AuthorAction = 'star' | 'xiaohongshu' | 'x' | 'bilibili' | 'wechat';

export function AuthorActionIcon({ name, ...props }: ComponentProps<'svg'> & { name: AuthorAction }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={name === 'xiaohongshu' ? '0 0 36 24' : '0 0 24 24'}
    width={name === 'xiaohongshu' ? 24 : 16} height={16} fill="none" stroke="currentColor" strokeWidth={1.5}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden data-author-action-icon={name} {...props}>
    {name === 'star' && <path d="m12 3 2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.92 1.06-6.2L3 9.53l6.22-.9Z" />}
    {name === 'xiaohongshu' && <text x={18} y={16} textAnchor="middle" fill="currentColor" stroke="none" fontSize={12} fontWeight={400}
      fontFamily="Noto Sans SC, PingFang SC, Microsoft YaHei, sans-serif">小红书</text>}
    {name === 'x' && <path d="M4 3h4.2L20 21h-4.2ZM4 21l6.8-8M13.2 10.4 20 3" />}
    {name === 'bilibili' && <>
      <rect x={3} y={7} width={18} height={14} rx={3} />
      <path d="m7 3 3 4m7-4-3 4M8 12v3m8-3v3" />
    </>}
    {name === 'wechat' && <>
      <rect x={3} y={3} width={6} height={6} rx={0.5} />
      <rect x={15} y={3} width={6} height={6} rx={0.5} />
      <rect x={3} y={15} width={6} height={6} rx={0.5} />
      <path d="M15 15h3v3h3m-6 3h3m3 0v-.01" />
    </>}
  </svg>;
}
