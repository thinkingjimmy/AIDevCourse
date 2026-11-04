import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { site } from '@/lib/site-config';
import '@/styles/preview.css';

export const metadata: Metadata = {
  title: { default: '首页设计稿', template: `%s · ${site.name}` },
  robots: { index: false, follow: false },
};

export default function DesignLayout({ children }: { children: ReactNode }) {
  // Translation extensions can add root attributes before React hydrates.
  return <html lang="zh-Hans" className="design" suppressHydrationWarning><body>{children}</body></html>;
}
