/**
 * [INPUT]: Fumadocs Markdown primitives and sibling code-block.tsx copy control.
 * [OUTPUT]: The sole supported MDX component registry, including the paper-styled Callout.
 * [POS]: MDX rendering registry used by course and lesson pages.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ReactNode } from 'react';
import defaults from 'fumadocs-ui/mdx';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { Info, TriangleAlert } from 'lucide-react';
import { LocalizedCodeBlock } from './code-block';
import type { MDXComponents } from 'mdx/types';
function Callout({ title, type = 'info', children }: { title?: ReactNode; type?: string; children?: ReactNode }) {
  const Icon = type === 'warning' || type === 'warn' || type === 'error' ? TriangleAlert : Info;
  return <aside className="callout" data-type={type} role="note"><Icon size={18} aria-hidden /><div>{title && <strong>{title}</strong>}<div>{children}</div></div></aside>;
}
export function getMDXComponents(): MDXComponents {
  return { ...defaults, Steps, Step, Callout, pre: LocalizedCodeBlock };
}
