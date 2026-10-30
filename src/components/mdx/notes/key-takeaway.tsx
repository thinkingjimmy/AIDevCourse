import type { ComponentProps } from 'react';
import { getTranslations } from 'next-intl/server';
import { AlertTitle } from '@/components/ui/alert';
import { FramedNote } from './framed-note';

export async function KeyTakeaway(props: ComponentProps<'aside'>) {
  const t = await getTranslations('Ui');
  const label = t('keyTakeaway');
  return <FramedNote {...props} label={label} data-component="key-takeaway" signature={
    <AlertTitle className="text-sm leading-copy font-medium">{label}</AlertTitle>
  } />;
}
