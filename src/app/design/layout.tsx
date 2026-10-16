/**
 * [INPUT]: Homepage studies and writing-component preview routes.
 * [OUTPUT]: A zinc document shell that does not use the live site header.
 * [POS]: Isolated preview layout for /design.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '@/styles/preview.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: '首页设计稿', template: '%s · AIDevCourse' },
  robots: { index: false, follow: false },
  icons: { icon: '/favicon.svg' },
};

export default function DesignLayout({ children }: { children: ReactNode }) {
  return <html lang="zh-Hans" className={`design ${sans.variable} ${mono.variable}`}><body>{children}</body></html>;
}
