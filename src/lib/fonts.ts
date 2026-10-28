/**
 * [INPUT]: Next.js self-hosted Geist, Geist Mono, and Geist Pixel font loaders.
 * [OUTPUT]: Shared sans, mono, and pixel font variables for public and root 404 documents.
 * [POS]: Latin font configuration shared by the locale layout and root error document; CJK fonts stay locale-specific.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { Geist, Geist_Mono, Geist_Pixel } from 'next/font/google';

export const sans = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
export const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });
// The shared CSS stack supplies Geist and Noto fallbacks without synthesized Pixel metrics.
export const pixel = Geist_Pixel({
  subsets: ['latin'],
  variable: '--font-geist-pixel',
  display: 'swap',
  adjustFontFallback: false,
  fallback: [],
});
