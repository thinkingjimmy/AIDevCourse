import type { ComponentProps } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function ProfilePreview({ name = 'Alex Kim', subtitle, textOverflow = 'wrap', children, className, ...props }:
  ComponentProps<typeof Card> & { name?: string; subtitle: string; textOverflow?: 'ellipsis' | 'wrap' }) {
  const textClassName = textOverflow === 'ellipsis' ? 'truncate' : 'whitespace-normal';
  return <Card {...props} className={cn('w-full rounded-xl shadow-sm', className)}>
    <CardContent className="p-4">
      <div className="mb-4 flex items-start gap-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">AK</span>
        <div className="min-w-0 flex-1">
          <p className={cn('profile-name m-0 text-sm font-semibold', textClassName)} title={name}>{name}</p>
          <p className={cn('profile-subtitle m-0 text-xs text-muted-foreground', textClassName)} title={subtitle}>{subtitle}</p>
        </div>
      </div>
      {children}
    </CardContent>
  </Card>;
}
