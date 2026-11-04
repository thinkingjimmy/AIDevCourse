import { getLocale, getTranslations } from 'next-intl/server';
import { parseYouTubeUrl, type EmbedProps } from '@/lib/embeds/urls';
import { EmbedSource } from './source-link';

export async function YouTube({ url, title }: EmbedProps) {
  const video = parseYouTubeUrl(url);
  if (!video) throw new Error('YouTube requires a valid HTTPS YouTube video URL');
  const [t, locale] = await Promise.all([getTranslations('Ui'), getLocale()]);
  const label = title?.trim() || t('youtubeEmbedTitle');
  const parameters = new URLSearchParams({ playsinline: '1', hl: locale });
  if (video.start) parameters.set('start', String(video.start));
  return <figure data-embed="youtube" aria-label={label} className="not-prose my-8 min-w-0">
    <div className="relative aspect-video min-h-[202px] w-full overflow-hidden rounded-sm border border-border bg-muted">
      <iframe src={`https://www.youtube-nocookie.com/embed/${video.id}?${parameters}`} title={label}
        width={560} height={315} loading="lazy" allow="encrypted-media; fullscreen; picture-in-picture; web-share"
        allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 size-full border-0" />
    </div>
    <EmbedSource href={video.source}>{t('watchOnYouTube')}</EmbedSource>
  </figure>;
}
