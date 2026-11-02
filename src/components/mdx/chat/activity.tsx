import type { ComponentProps, ReactNode } from 'react';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceIcon, TraceLine, TraceTitle } from '@/components/ui/ai-elements/trace';
import { cn } from '@/lib/utils';

type ChatActivityProps = Omit<ComponentProps<'div'>, 'title'> & {
  title: ReactNode;
  label: string;
  icon: ReactNode;
  defaultOpen?: boolean;
};

export function ChatActivity({ title, label, icon, defaultOpen = false, children, className, ...props }: ChatActivityProps) {
  const line = <TraceLine className="leading-reading">
    <TraceIcon>{icon}</TraceIcon>
    <TraceTitle className="overflow-visible text-clip whitespace-normal [overflow-wrap:anywhere]">{title}</TraceTitle>
  </TraceLine>;
  return <div {...props} className={cn('min-w-0', className)}>
    <Trace className="[@media(scripting:none)]:hidden">
      <TraceCollapsible defaultOpen={defaultOpen}>
        <TraceCollapsibleTrigger className="min-h-11 border-0 bg-transparent p-0 shadow-none" aria-label={label}>{line}</TraceCollapsibleTrigger>
        <TraceCollapsibleContent>{children}</TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
    <noscript>
      <details open={defaultOpen} className="group/activity-fallback min-w-0">
        <summary aria-label={label} className="flex min-h-11 w-fit max-w-full cursor-pointer list-none items-center gap-1 rounded-md text-muted-foreground [&::-webkit-details-marker]:hidden">
          {line}
          <TraceIcon className="group-open/activity-fallback:rotate-90"><CaretRightIcon /></TraceIcon>
        </summary>
        <div className="mt-2 mb-1 ml-[calc(--spacing(2)-1px)] min-w-0 border-l pr-1 pl-4">{children}</div>
      </details>
    </noscript>
  </div>;
}
