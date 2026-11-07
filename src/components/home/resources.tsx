import { getLocale, getTranslations } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import { localePath } from '@/lib/i18n/routing';
import { vocabularyCollections } from '@/lib/vocabulary/collections';
import { DiskLink, type GalleryItem } from './disk';

export async function getLearningResources(locale: Locale) {
  const t = await getTranslations({ locale, namespace: 'Vocabulary' });
  const items: GalleryItem[] = await Promise.all(Object.values(vocabularyCollections).map(async collection => {
    const copy = await getTranslations({ locale, namespace: collection.namespace });
    return {
      id: collection.resourceId, slug: collection.resourceId, title: copy('title'), description: copy('description'),
      url: localePath(locale, `${collection.path}/${collection.categories[0].id}`), kind: 'resource', group: 'resources', dots: 0,
      labels: { level: t('tool'), status: t('termCount', { count: collection.categories.reduce((total, category) => total + category.terms.length, 0) }) },
    };
  }));
  return { label: t('resources'), items };
}

export async function ResourceDisks() {
  const { label, items } = await getLearningResources(await getLocale() as Locale);
  return <ul data-component="resource-disks" role="list" aria-label={label}
    className="not-prose my-8 flex list-none flex-wrap gap-x-6 gap-y-8 p-0">
    {items.map(item => <li key={item.id} className="m-0 p-0"><DiskLink item={item} /></li>)}
  </ul>;
}
