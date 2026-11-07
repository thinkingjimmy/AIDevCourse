import type { ComponentProps } from 'react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { cn } from '@/lib/utils';

export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return <div data-slot="native-select-wrapper" className="relative w-fit max-w-full has-[select:disabled]:opacity-50">
    <select data-slot="native-select" className={cn(
      'h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent px-3 py-2 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20',
      className,
    )} {...props} />
    <CaretDownIcon data-slot="native-select-icon" aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground opacity-50" />
  </div>;
}

export function NativeSelectOption({ className, ...props }: ComponentProps<'option'>) {
  return <option data-slot="native-select-option" className={cn('bg-[Canvas] text-[CanvasText]', className)} {...props} />;
}
