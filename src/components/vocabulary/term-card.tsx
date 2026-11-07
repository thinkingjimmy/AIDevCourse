import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isColorTermId } from '@/lib/vocabulary/catalog';
import { isAnimationTermId } from '@/lib/vocabulary/animation';
import { vocabularyCollections, type DictionaryTermId, type VocabularyKind } from '@/lib/vocabulary/collections';
import { TypographyDemo } from './demos/typography-demo';
import { ColorDemo } from './demos/color';
import { EntranceDemo } from './demos/animation/entrance-demo';

export function TermCard({ id, english, selected, collection, heading = 'h2' }: { id: DictionaryTermId; english: string; selected: boolean; collection: VocabularyKind; heading?: 'h2' | 'h3' }) {
  const t = useTranslations(vocabularyCollections[collection].namespace);
  const title = t(`terms.${id}.title`);
  return <article id={id} data-term={id} data-selected={selected} className={`vocabulary-term${!isAnimationTermId(id) && isColorTermId(id) ? ' vocabulary-color' : ''}`} tabIndex={-1} aria-labelledby={`${id}-title`}>
    <Card className="vocabulary-card h-full py-6">
      <CardHeader>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
          <CardTitle as={heading} id={`${id}-title`} className="m-0 text-lg leading-snug">{title}</CardTitle>
          {title !== english && <span lang="en" className="text-caption text-muted-foreground">{english}</span>}
        </div>
        <CardDescription className="vocabulary-definition m-0 leading-body text-reading">{t(`terms.${id}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col py-0">
        {isAnimationTermId(id) ? <EntranceDemo id={id} /> : isColorTermId(id) ? <ColorDemo id={id} /> : <TypographyDemo id={id} />}
      </CardContent>
    </Card>
  </article>;
}
