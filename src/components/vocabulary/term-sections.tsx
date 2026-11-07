import { Fragment } from 'react';
import { useTranslations } from 'next-intl';
import { vocabularyCollections, type DictionaryTermId, type VocabularyKind } from '@/lib/vocabulary/collections';
import type { VocabularySection } from '@/lib/vocabulary/presentation';
import { TermCard } from './term-card';

export function TermSections({ sections, visible, selected, collection }: {
  sections: readonly VocabularySection[]; visible: ReadonlySet<DictionaryTermId>;
  selected: DictionaryTermId; collection: VocabularyKind;
}) {
  const t = useTranslations(vocabularyCollections[collection].namespace);
  return <div className="vocabulary-sections">{sections.map(section => {
    const headingId = `vocabulary-section-${section.id}`;
    const Heading = section.title ? 'h3' : 'h2';
    const cards = <>
      <div className="vocabulary-grid">
        {section.terms.filter(([id]) => visible.has(id)).map(([id, english]) =>
          <TermCard key={id} id={id} english={english} collection={collection} selected={id === selected} heading={Heading} />)}
      </div>
      <noscript><div className="vocabulary-grid">{section.terms.filter(([id]) => !visible.has(id)).map(([id, english]) => <article className="vocabulary-static" key={id} id={id}>
        <Heading>{t(`terms.${id}.title`)}{t(`terms.${id}.title`) !== english && <> <span lang="en">{english}</span></>}</Heading>
        <p>{t(`terms.${id}.description`)}</p>
      </article>)}</div></noscript>
    </>;
    return section.title ? <section key={section.id} className="vocabulary-section" data-typography-section={section.id} aria-labelledby={headingId}>
      <header className="vocabulary-section-heading">
        <h2 id={headingId}>{t(section.title)}</h2>
        {section.description && <p>{t(section.description)}</p>}
      </header>
      {cards}
    </section> : <Fragment key={section.id}>{cards}</Fragment>;
  })}</div>;
}
