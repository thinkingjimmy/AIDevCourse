'use client';

import { useId, useState } from 'react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/overlays/dropdown-menu';
import { InputGroupButton } from './input-group';

type Model = { id: string; name: string };

export function ModelSelector({ label, provider, models }: { label: string; provider: string; models: readonly [Model, ...Model[]] }) {
  const [modelId, setModelId] = useState(models[0].id);
  const labelId = useId();
  const selected = models.find(model => model.id === modelId) ?? models[0];

  return <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <InputGroupButton variant="outline" size="sm" aria-describedby={labelId} className="relative h-auto min-h-8 min-w-0 touch-manipulation rounded-full border-brand/30 py-1 text-left text-base leading-tight whitespace-normal text-foreground before:absolute before:inset-x-0 before:top-1/2 before:min-h-11 before:-translate-y-1/2 hover:border-brand/50 hover:bg-background focus-visible:outline-brand sm:text-sm [@media(scripting:none)]:hidden">
        <span className="min-w-0 [overflow-wrap:anywhere]"><span className="@max-[16rem]/chat-input:hidden">{provider}{' '}</span>{selected.name}</span>
        <CaretDownIcon className="size-3.5 text-brand" aria-hidden />
      </InputGroupButton>
    </DropdownMenuTrigger>
    <span id={labelId} className="sr-only">{label}</span>
    <DropdownMenuContent align="end" collisionPadding={12} aria-labelledby={labelId} className="rounded-sm border-brand/35">
      <DropdownMenuRadioGroup value={selected.id} onValueChange={setModelId}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{provider}</DropdownMenuLabel>
          {models.map(model => <DropdownMenuRadioItem key={model.id} value={model.id}>{model.name}</DropdownMenuRadioItem>)}
        </DropdownMenuGroup>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
    <noscript><span className="inline-flex min-h-8 items-center rounded-full border border-brand/30 bg-background px-2.5 text-base font-medium text-foreground sm:text-sm">{provider} {models[0].name}</span></noscript>
  </DropdownMenu>;
}
