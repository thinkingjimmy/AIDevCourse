import type { ComponentProps } from 'react';
import Image from 'next/image';
import { AlertTitle } from '@/components/ui/alert';
import { FramedNote } from './framed-note';

export function JimmyNote(props: ComponentProps<'aside'>) {
  return <FramedNote {...props} label="Jimmy" data-component="jimmy-note" signature={<>
      <Image src="/images/jimmy-avatar.png" alt="" width={32} height={32} sizes="2rem" className="size-8 shrink-0 rounded-full object-cover" />
      <AlertTitle className="text-sm leading-copy font-medium" lang="en">Jimmy</AlertTitle>
  </>} />;
}
