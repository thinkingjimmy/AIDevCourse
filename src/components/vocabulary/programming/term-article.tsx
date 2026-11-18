import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/layout/page-primitives';
import { LessonArticle } from '@/components/course/feedback/lesson-article';
import { Heading } from '@/components/mdx/heading';
import { LocalizedCodeBlock } from '@/components/mdx/code-block';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { programmingSections, type programmingTerm } from '@/lib/vocabulary/programming';
import { programmingArticle } from '@/lib/vocabulary/programming-articles';
import type { Locale } from '@/lib/i18n/config';
import { site } from '@/lib/site-config';

type Term = NonNullable<ReturnType<typeof programmingTerm>>;

export async function TermArticle({ locale, term, path, outlineLabel }: { locale: Locale; term: Term; path: string; outlineLabel: string }) {
  const article = programmingArticle(term.id);
  if (!article) throw new Error(`Missing programming article data for ${term.id}`);
  const t = await getTranslations({ locale, namespace: `ProgrammingVocabulary.terms.${term.id}` });
  const rich = (key: string) => t.rich(key, {
    code: chunks => <code>{chunks}</code>, strong: chunks => <strong>{chunks}</strong>,
  });
  const sections = programmingSections[term.id];

  return <div className="mx-auto w-full max-w-[51rem] min-w-0" data-slot="programming-reading-group">
    <LessonArticle title={t('title')} pageUrl={new URL(path, site.origin).href}>
      <PageTitle variant="lesson" id={term.id} tabIndex={-1}>{t('title')}</PageTitle>
      {term.english !== t('title') && <p className="m-0 mb-3 text-sm leading-copy text-muted-foreground" lang="en">{term.english}</p>}
      <p className="m-0 mb-7 text-base leading-body text-muted-foreground" data-slot="term-description">{t('description')}</p>
      <details className="mb-8 rounded-sm border border-border px-4 min-[961px]:hidden" data-slot="programming-article-outline">
        <summary className="cursor-pointer py-3 text-sm font-medium text-brand">{outlineLabel}</summary>
        <nav aria-label={outlineLabel} className="flex flex-col gap-1 pb-3">
          {sections.map(id => <a key={id} href={`#${id}`} className="py-2 text-sm leading-body text-reading underline-offset-4 hover:underline">{t(`article.${id}.heading`)}</a>)}
        </nav>
      </details>
      {/* Keep each heading's expanded link-copy target inside the reading width. */}
      <div className="prose course-prose [&_h2]:pr-2.5" data-slot="programming-article" data-programming-term={term.id}>
        <Heading as="h2" id="meaning">{t('article.meaning.heading')}</Heading>
        <p>{rich('article.meaning.definition')}</p>
        <p>{rich('article.meaning.analogy')}</p>
        <p>{rich('article.meaning.keyPoint')}</p>

        <Heading as="h2" id="how-it-works">{t('article.how-it-works.heading')}</Heading>
        <p>{rich('article.how-it-works.intro')}</p>
        <ol data-slot="term-flow" className="not-prose my-6 grid list-none gap-3 p-0 sm:grid-cols-2">
          {article.steps.map((step, index) => <li key={step} className="m-0 rounded-sm border border-border bg-surface p-4">
            <span aria-hidden className="mb-2 block font-mono text-caption tabular-nums text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
            <p className="m-0 text-sm leading-body text-reading">{rich(`article.how-it-works.steps.${step}`)}</p>
          </li>)}
        </ol>
        <p>{rich('article.how-it-works.note')}</p>

        <Heading as="h2" id="example">{t('article.example.heading')}</Heading>
        <p>{rich('article.example.intro')}</p>
        <ul>{article.points.map(point => <li key={point}>{rich(`article.example.points.${point}`)}</li>)}</ul>
        <p>{rich('article.example.codeIntro')}</p>
        <LocalizedCodeBlock data-language={article.code.language}><code>{article.code.source}</code></LocalizedCodeBlock>
        <p>{rich('article.example.afterCode')}</p>

        <Heading as="h2" id="comparison">{t('article.comparison.heading')}</Heading>
        <p>{rich('article.comparison.intro')}</p>
        <div className="not-prose my-6 overflow-hidden rounded-sm">
          <Table aria-label={t('article.comparison.heading')} className="min-w-128 [&_td]:whitespace-normal [&_th]:whitespace-normal">
            <TableHeader><TableRow>
              {(['aspect', 'left', 'right'] as const).map(column => <TableHead key={column}>{t(`article.comparison.columns.${column}`)}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>{article.rows.map(row => <TableRow key={row}>
              <TableHead scope="row">{t(`article.comparison.rows.${row}.label`)}</TableHead>
              <TableCell>{rich(`article.comparison.rows.${row}.left`)}</TableCell>
              <TableCell>{rich(`article.comparison.rows.${row}.right`)}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </div>
        <p>{rich('article.comparison.mixed')}</p>

        <Heading as="h2" id="uses">{t('article.uses.heading')}</Heading>
        <p>{rich('article.uses.intro')}</p>
        <ul>{article.uses.map(use => <li key={use}>{rich(`article.uses.items.${use}`)}</li>)}</ul>
        <p>{rich('article.uses.benefits')}</p>
        <p>{rich('article.uses.limits')}</p>

        <Heading as="h2" id="misconceptions">{t('article.misconceptions.heading')}</Heading>
        {article.misconceptions.map(item => <section key={item}>
          <h3>{t(`article.misconceptions.items.${item}.title`)}</h3>
          <p>{rich(`article.misconceptions.items.${item}.body`)}</p>
        </section>)}

        <Heading as="h2" id="recap">{t('article.recap.heading')}</Heading>
        <p>{rich('article.recap.question')}</p>
        <p><strong>{t('article.recap.answer')}</strong> {rich('article.recap.reason')}</p>
        <p>{rich('article.recap.remember')}</p>

        <Heading as="h2" id="references">{t('article.references.heading')}</Heading>
        <p>{rich('article.references.intro')}</p>
        <ul>{article.links.map(({ id, href }) => <li key={id}><a href={href} target="_blank" rel="noreferrer">{t(`article.references.links.${id}`)}</a></li>)}</ul>
      </div>
    </LessonArticle>
  </div>;
}
