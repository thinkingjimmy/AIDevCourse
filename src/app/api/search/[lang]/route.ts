import { createSearchAPI } from 'fumadocs-core/search/server';
import { getCatalog } from '@/lib/content/source';
import { getArticle } from '@/lib/content/source/articles';
import { isLocale, locales } from '@/lib/i18n/config';
import { createSearchTokenizer } from '@/lib/search';
export const dynamic = 'force-static';
export function generateStaticParams() { return locales.map((lang) => ({ lang })); }
export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) return new Response('Not found', { status: 404 });
  const catalog = getCatalog();
  const indexes = await Promise.all(catalog.documents.filter((doc) => doc.locale === lang).map(async (doc) => {
    const article = getArticle(doc);
    if (!article) throw new Error(`Missing compiled article: ${doc.url}`);
    return { id: doc.url, url: doc.url, title: doc.data.title, description: doc.data.description,
      breadcrumbs: [catalog.courses.find((course) => course.locale === lang && course.id === doc.data.courseId)!.title],
      // Course overviews render metadata and the syllabus, not their MDX body.
      structuredData: doc.data.kind === 'lesson' ? await article.structuredData() : { headings: [], contents: [] } };
  }));
  return createSearchAPI('advanced', { indexes, tokenizer: createSearchTokenizer() }).staticGET();
}
