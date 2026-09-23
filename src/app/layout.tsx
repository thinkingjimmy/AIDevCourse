/**
 * [INPUT]: Locale layouts or the global unavailable-page document.
 * [OUTPUT]: A shared root boundary without imposing a fallback content language.
 * [POS]: Keeps notFound recovery outside the language document's rendering boundary.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
