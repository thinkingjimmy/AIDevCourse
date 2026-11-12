import { cache } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { parseResourceDiskIds } from '@/lib/content/resource-disks';
import { getCourses } from '@/lib/content/source';
import type { Locale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { blogCourseId } from '@/lib/site-config';
import { vocabularyCollections, vocabularyPagePaths } from '@/lib/vocabulary/collections';
import { DiskLink, type GalleryItem } from './disk';

export const getGalleryCatalog = cache(async (locale: Locale) => {
  const [home, course, ui, vocabulary] = await Promise.all([
    getTranslations({ locale, namespace: 'Home' }),
    getTranslations({ locale, namespace: 'Course' }),
    getTranslations({ locale, namespace: 'Ui' }),
    getTranslations({ locale, namespace: 'Vocabulary' }),
  ]);
  const resources: GalleryItem[] = await Promise.all(Object.values(vocabularyCollections).map(async collection => {
    const copy = await getTranslations({ locale, namespace: collection.namespace });
    return {
      id: collection.resourceId, slug: collection.resourceId, title: copy('title'), description: copy('description'),
      url: localePath(locale, vocabularyPagePaths(collection.id)[0]), kind: 'resource', group: 'resources', dots: 0,
      labels: { level: vocabulary('tool'), status: vocabulary('termCount', { count: collection.categories.reduce((total, category) => total + category.terms.length, 0) }) },
    };
  }));
  const courses: GalleryItem[] = [];
  for (const { id, slug, title, description, url, level, section, updating, lessons } of getCourses(locale)) {
    const item = { id, slug, title, description, url };
    if (id === blogCourseId) {
      resources.unshift({ ...item, kind: 'resource', group: 'resources', dots: 0,
        labels: { level: '', status: home('articleCount', { count: lessons.length }) } });
      continue;
    }
    const introduction = section === 'introduction';
    const stamp = updating ? course('updatingStamp') : undefined;
    courses.push({ ...item, kind: 'course', group: introduction ? 'introduction' : level,
      dots: introduction ? 0 : { beginner: 1, intermediate: 2, advanced: 3 }[level],
      labels: { level: introduction ? home('gettingStarted') : ui(level),
        status: lessons.length ? ui('lessonCount', { count: lessons.length }) : stamp ? undefined : course('updating'),
        stamp } });
  }
  return { label: vocabulary('resources'), items: { courses, resources } };
});

export async function ResourceDisks({ items }: { items?: string }) {
  const { label, items: { courses, resources } } = await getGalleryCatalog(await getLocale() as Locale);
  const catalog = [...courses, ...resources];
  const selected = items === undefined ? resources.filter(item => item.id !== blogCourseId)
    : parseResourceDiskIds(items).flatMap(id => catalog.find(item => item.id === id) ?? []);
  if (!selected.length) return null;
  return <ul data-component="resource-disks" role="list" aria-label={label}
    className="resource-disks not-prose my-8 flex list-none flex-wrap p-0">
    {selected.map(item => <li key={item.id} className="m-0 p-0"><DiskLink item={item} /></li>)}
  </ul>;
}
