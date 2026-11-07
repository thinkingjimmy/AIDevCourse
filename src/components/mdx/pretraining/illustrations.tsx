import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@/lib/i18n/config';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { getTokenizationExample } from '../tokenization/model';
import { pretrainingImages } from './images';

export function usePretrainingSteps() {
  const currentLocale = useLocale();
  const locale = isLocale(currentLocale) ? currentLocale : 'en';
  const t = useTranslations('Pretraining');
  const example = getTokenizationExample(locale);
  return (['cleaning', 'tokens', 'prediction'] as const).map((value) => ({
    value, label: t(value), image: pretrainingImages[locale][value],
    description: value === 'tokens'
      ? t('tokensDescription', { text: example.text, tokens: example.tokens.map((token) => `${token.text} → ${token.id}`).join(t('tokenSeparator')) })
      : t(value === 'cleaning' ? 'cleaningDescription' : 'predictionDescription'),
  }));
}

export function PretrainingIllustration({ step, interactive = true }: { step: ReturnType<typeof usePretrainingSteps>[number]; interactive?: boolean }) {
  const t = useTranslations('Pretraining');
  const image = <Image src={step.image} alt={step.description} loading="eager" sizes="(min-width: 768px) 640px, 100vw" className="block aspect-video h-auto w-full object-contain" />;

  return <div data-pretraining-illustration={step.value} className="aspect-video w-full rounded-sm bg-white">
    {interactive ? <Dialog>
      <DialogTrigger asChild>
        <Button variant="plain" size="reset" aria-label={t('zoom', { label: step.label })} className="block w-full cursor-zoom-in touch-manipulation rounded-sm">{image}</Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="top-1/2 w-[calc(100vw-2rem)] max-w-6xl -translate-y-1/2 rounded-sm border-foreground bg-white p-2 pt-12 shadow-none max-sm:top-1/2">
        <DialogTitle className="sr-only">{t('imageTitle', { label: step.label })}</DialogTitle>
        <DialogClose asChild>
          <Button variant="plain" size="icon-touch" aria-label={t('close')} className="absolute top-2 right-2 rounded-sm text-black"><XIcon size={20} aria-hidden /></Button>
        </DialogClose>
        <Image src={step.image} alt={step.description} sizes="(min-width: 1200px) 1120px, 100vw" className="min-h-0 w-full object-contain" />
      </DialogContent>
    </Dialog> : image}
  </div>;
}
