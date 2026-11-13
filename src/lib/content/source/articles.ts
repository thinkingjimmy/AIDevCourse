import 'server-only';
import { courses } from '@source';
import type { ContentDocument } from '../model';

export function getArticle(doc: ContentDocument) {
  // Read the live collection on each request so hot reload can replace its article loaders.
  return courses.find(article => article.info.path === doc.file);
}
