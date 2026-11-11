import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isColorTermId, isIconographyTermId } from '@/lib/vocabulary/catalog';
import { isAnimationTermId } from '@/lib/vocabulary/animation';
import { isProgrammingTermId } from '@/lib/vocabulary/programming';
import { vocabularyCollections, type DictionaryTermId, type VocabularyKind } from '@/lib/vocabulary/collections';
import { TypographyDemo } from './demos/typography-demo';
import { ColorDemo } from './demos/color';
import { IconographyDemo } from './demos/iconography';
import { EntranceDemo } from './demos/animation/entrance-demo';
import { StaticWebsiteDemo } from './demos/programming/static-website';

export function TermCard({ id, english, selected, collection, heading = 'h2' }: { id: DictionaryTermId; english: string; selected: boolean; collection: VocabularyKind; heading?: 'h2' | 'h3' }) {
  const t = useTranslations(vocabularyCollections[collection].namespace);
  const title = t(`terms.${id}.title`);
  const subject = isProgrammingTermId(id) ? 'programming' : isAnimationTermId(id) ? 'animation' : isColorTermId(id) ? 'color' : isIconographyTermId(id) ? 'iconography' : 'typography';
  return <article id={id} data-term={id} data-selected={selected} className={`vocabulary-term vocabulary-${subject}`} tabIndex={-1} aria-labelledby={`${id}-title`}>
    <Card className="vocabulary-card h-full py-6">
      <CardHeader>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
          <CardTitle as={heading} id={`${id}-title`} className="m-0 text-lg leading-snug">{title}</CardTitle>
          {title !== english && <span lang="en" className="text-caption text-muted-foreground">{english}</span>}
        </div>
        <CardDescription className="vocabulary-definition m-0 leading-body text-reading">{t(`terms.${id}.description`)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col py-0">
        {isProgrammingTermId(id) ? <StaticWebsiteDemo /> : isAnimationTermId(id) ? <EntranceDemo id={id} /> : isColorTermId(id) ? <ColorDemo id={id} /> : isIconographyTermId(id) ? <IconographyDemo id={id} /> : <TypographyDemo id={id} />}
      </CardContent>
    </Card>
  </article>;
}
