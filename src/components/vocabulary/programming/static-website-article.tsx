import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/layout/page-primitives';
import { LessonArticle } from '@/components/course/feedback/lesson-article';
import { Heading } from '@/components/mdx/heading';
import { LocalizedCodeBlock } from '@/components/mdx/code-block';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { StaticWebsiteDemo } from '../demos/programming/static-website';
import { programmingSections } from '@/lib/vocabulary/programming';
import type { Locale } from '@/lib/i18n/config';
import { site } from '@/lib/site-config';

const html = '<h1>Hello, world!</h1>\n<button id="counter">Clicks: 0</button>\n<script src="script.js"></script>';
const script = 'const button = document.querySelector("#counter");\nlet clicks = 0;\n\nbutton.addEventListener("click", () => {\n  clicks += 1;\n  button.textContent = `Clicks: ${clicks}`;\n});';
const references = [
  ['clientServer', 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Client-Server_overview#static_sites'],
  ['server', 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_web_server'],
  ['pages', 'https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages'],
  ['javascript', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction'],
  ['caching', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching'],
] as const;

export async function StaticWebsiteArticle({ locale, path, outlineLabel }: { locale: Locale; path: string; outlineLabel: string }) {
  const t = await getTranslations({ locale, namespace: 'ProgrammingVocabulary.terms.static-website' });
  const demo = await getTranslations({ locale, namespace: 'ProgrammingVocabulary.demo' });
  const rich = (key: string) => t.rich(`article.${key}`, {
    code: chunks => <code>{chunks}</code>, strong: chunks => <strong>{chunks}</strong>,
  });
  const sections = programmingSections['static-website'];

  return <div className="mx-auto w-full max-w-[51rem] min-w-0" data-slot="programming-reading-group">
    <LessonArticle title={t('title')} pageUrl={new URL(path, site.origin).href}>
      <PageTitle variant="lesson" id="static-website" tabIndex={-1}>{t('title')}</PageTitle>
      {locale !== 'en' && <p className="m-0 mb-3 text-sm leading-copy text-muted-foreground" lang="en">Static website</p>}
      <p className="m-0 mb-7 text-base leading-body text-muted-foreground" data-slot="term-description">{t('description')}</p>
      <details className="mb-8 rounded-sm border border-border px-4 min-[961px]:hidden" data-slot="programming-article-outline">
        <summary className="cursor-pointer py-3 text-sm font-medium text-brand">{outlineLabel}</summary>
        <nav aria-label={outlineLabel} className="flex flex-col gap-1 pb-3">
          {sections.map(id => <a key={id} href={`#${id}`} className="py-2 text-sm leading-body text-reading underline-offset-4 hover:underline">{t(`article.${id}.heading`)}</a>)}
        </nav>
      </details>
      {/* Keep each heading's expanded link-copy target inside the reading width. */}
      <div className="prose course-prose [&_h2]:pr-2.5" data-slot="programming-article">
        <Heading as="h2" id="meaning">{t('article.meaning.heading')}</Heading>
        <p>{rich('meaning.definition')}</p>
        <p>{t('article.meaning.analogy')}</p>
        <p>{rich('meaning.keyPoint')}</p>

        <Heading as="h2" id="how-it-works">{t('article.how-it-works.heading')}</Heading>
        <p>{t('article.how-it-works.intro')}</p>
        <ol>{(['prepare', 'deploy', 'request', 'render'] as const).map(step => <li key={step}>{t(`article.how-it-works.${step}`)}</li>)}</ol>
        <p>{t('article.how-it-works.cache')}</p>

        <Heading as="h2" id="example">{t('article.example.heading')}</Heading>
        <p>{t('article.example.intro')}</p>
        <pre><code>{'portfolio/\n├── index.html\n├── style.css\n└── script.js'}</code></pre>
        <ul>{(['html', 'css', 'js'] as const).map(file => <li key={file}>{rich(`example.${file}`)}</li>)}</ul>
        <p>{t('article.example.codeIntro')}</p>
        <LocalizedCodeBlock data-language="html"><code>{html}</code></LocalizedCodeBlock>
        <p>{t('article.example.scriptIntro')}</p>
        <LocalizedCodeBlock data-language="javascript"><code>{script}</code></LocalizedCodeBlock>
        <p>{t('article.example.change')}</p>
        <p>{t('article.example.generated')}</p>

        <Heading as="h2" id="interaction">{t('article.interaction.heading')}</Heading>
        <p>{t('article.interaction.intro')}</p>
        <figure className="not-prose my-8 min-w-0" aria-labelledby="interaction">
          <StaticWebsiteDemo />
          <figcaption className="mt-4 text-sm leading-body text-muted-foreground">{demo('caveat')}</figcaption>
        </figure>
        <p>{t('article.interaction.explanation')}</p>

        <Heading as="h2" id="comparison">{t('article.comparison.heading')}</Heading>
        <p>{t('article.comparison.intro')}</p>
        <div className="not-prose my-6 overflow-hidden rounded-sm">
          <Table aria-label={t('article.comparison.heading')} className="min-w-128 [&_td]:whitespace-normal [&_th]:whitespace-normal">
            <TableHeader><TableRow>
              {(['aspect', 'static', 'dynamic'] as const).map(column => <TableHead key={column}>{t(`article.comparison.${column}`)}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>{(['timing', 'work', 'data', 'updates'] as const).map(row => <TableRow key={row}>
              <TableHead scope="row">{t(`article.comparison.rows.${row}.label`)}</TableHead>
              <TableCell>{t(`article.comparison.rows.${row}.static`)}</TableCell>
              <TableCell>{t(`article.comparison.rows.${row}.dynamic`)}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </div>
        <p>{t('article.comparison.mixed')}</p>

        <Heading as="h2" id="uses">{t('article.uses.heading')}</Heading>
        <p>{t('article.uses.intro')}</p>
        <ul>{(['portfolio', 'publishing', 'marketing'] as const).map(use => <li key={use}>{t(`article.uses.${use}`)}</li>)}</ul>
        <p>{t('article.uses.benefits')}</p>
        <p>{t('article.uses.limits')}</p>

        <Heading as="h2" id="misconceptions">{t('article.misconceptions.heading')}</Heading>
        {(['frozen', 'server', 'database', 'security'] as const).map(item => <section key={item}>
          <h3>{t(`article.misconceptions.${item}.title`)}</h3>
          <p>{t(`article.misconceptions.${item}.body`)}</p>
        </section>)}

        <Heading as="h2" id="recap">{t('article.recap.heading')}</Heading>
        <p>{t('article.recap.question')}</p>
        <p><strong>{t('article.recap.answer')}</strong> {t('article.recap.reason')}</p>
        <p>{rich('recap.remember')}</p>

        <Heading as="h2" id="references">{t('article.references.heading')}</Heading>
        <p>{t('article.references.intro')}</p>
        <ul>{references.map(([label, href]) => <li key={label}><a href={href} target="_blank" rel="noreferrer">{t(`article.references.${label}`)}</a></li>)}</ul>
      </div>
    </LessonArticle>
  </div>;
}
