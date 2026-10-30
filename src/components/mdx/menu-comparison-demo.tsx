'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/overlays/dropdown-menu';

const choices = ['菜单 A', '菜单 B', '菜单 C'];

export function MenuComparisonDemo() {
  const [nativeChoice, setNativeChoice] = useState('');
  const [customChoice, setCustomChoice] = useState('');

  return <figure aria-label="两种菜单对比" lang="zh-CN" className="quote-frame not-prose relative my-8 grid grid-cols-2 px-5 pt-8 pb-5">
    <figcaption className="absolute start-2.5 top-0 -translate-y-1/2 bg-background px-1.5 text-sm leading-copy font-medium text-foreground sm:start-3.5">试一试</figcaption>
    <div className="flex justify-center">
      <div className="relative w-24">
        <Button asChild variant="outline" size="action" className="block w-full cursor-pointer appearance-none text-base text-transparent hover:text-transparent">
          <select aria-label={`请点击，浏览器原生菜单${nativeChoice ? `，已选择 ${nativeChoice}` : ''}`} value={nativeChoice} onChange={(event) => setNativeChoice(event.target.value)}>
            <option value="" disabled className="text-foreground">请点击</option>
            {choices.map((choice) => <option key={choice} className="text-foreground">{choice}</option>)}
          </select>
        </Button>
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-base font-medium text-foreground">请点击</span>
      </div>
    </div>
    <div className="flex justify-center">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="action" className="w-24 text-base" aria-label={`打开 shadcn 菜单，请点击${customChoice ? `，已选择 ${customChoice}` : ''}`}>
            请点击
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]" aria-label="shadcn 菜单选项" lang="zh-CN">
          {choices.map((choice) => <DropdownMenuItem key={choice} onSelect={() => setCustomChoice(choice)}>{choice}</DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </figure>;
}
