import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { renderMermaid } from '@/lib/content/mermaid/render';

export function MermaidDiagram({ source }: { source: string }) {
  const id = useId();
  const t = useTranslations('Ui');
  const { svg, width } = renderMermaid(source, `mermaid-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`);
  return <div data-component="mermaid" role="region" aria-label={t('mermaidDiagram')} tabIndex={0}
    className="not-prose my-7 min-w-0 max-w-full overflow-x-auto rounded-sm border border-border bg-background p-4">
    <div className="mermaid-diagram mx-auto" style={{ width: `${width / 16}rem` }} dangerouslySetInnerHTML={{ __html: svg }} />
  </div>;
}
