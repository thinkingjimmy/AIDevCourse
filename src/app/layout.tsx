/**
 * [INPUT]: Shared site identity, locale layouts, or the global unavailable-page document.
 * [OUTPUT]: Shared brand titles and icons, without imposing a fallback content language.
 * [POS]: Keeps notFound recovery outside the language document's rendering boundary.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { site } from '@/lib/site-config';

export const metadata: Metadata = {
  title: { template: `%s · ${site.name}`, default: site.name },
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
    apple: { url: '/images/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
