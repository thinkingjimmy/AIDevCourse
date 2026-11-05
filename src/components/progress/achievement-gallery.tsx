'use client';
import { useState, type ReactElement } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import { BracketsCurlyIcon } from '@phosphor-icons/react/dist/ssr/BracketsCurly';
import { ChartLineUpIcon } from '@phosphor-icons/react/dist/ssr/ChartLineUp';
import { ChatTextIcon } from '@phosphor-icons/react/dist/ssr/ChatText';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { MedalIcon } from '@phosphor-icons/react/dist/ssr/Medal';
import { ShuffleIcon } from '@phosphor-icons/react/dist/ssr/Shuffle';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/overlays/dialog';
import { Button } from '@/components/ui/button';
import { useAchievements } from './achievement-provider';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/course/sidebar';

const medalIcons = {
  'input-shapes-output': ChatTextIcon,
  'token-boundaries': BracketsCurlyIcon,
  'sampling-can-vary': ShuffleIcon,
  'token-probability-not-truth': ChartLineUpIcon,
  'generation-vs-verification': MagnifyingGlassIcon,
};

export function AchievementGallery({ children }: { children?: ReactElement }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('Course');
  const ui = useTranslations('Ui');
  const format = useFormatter();
  const { courses, learning, ready } = useAchievements();
  const { isMobile, setOpenMobile } = useSidebar();
  const achievements = courses.flatMap((course) => course.achievements.map((item) => ({ ...item, courseId: course.id })));
  const isEarned = (courseId: string, id: string) => ready && Object.hasOwn(learning[courseId]?.unlocked ?? {}, id);
  const earned = achievements.filter((item) => isEarned(item.courseId, item.id)).length;
  const total = achievements.length;
  const percent = total ? earned / total * 100 : 0;
  const countLabel = t('achievementCount', { count: earned });
  const completion = t('achievementsCompletion', { percent: format.number(percent / 100, { style: 'percent', maximumFractionDigits: 1 }) });

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      {children ?? <Button variant="plain" size="reset" disabled={!ready} aria-label={t('achievementsTitle')} title={t('achievementsTitle')}
        className="group/summary h-11 min-w-0 flex-1 justify-start gap-2.5 rounded-md p-2 text-left hover:bg-brand-soft focus-visible:outline-brand group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:focus-visible:-outline-offset-2">
        <span role="progressbar" aria-label={t('achievementsTitle')} aria-valuetext={countLabel}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-busy={!ready}
          className="flex size-7 shrink-0 items-center justify-center rounded-full p-0.5"
          style={{ background: `conic-gradient(var(--color-brand) ${percent}%, var(--color-brand-soft) 0)` }}>
          <span aria-hidden className="flex size-full items-center justify-center rounded-full bg-sidebar text-base">🥇</span>
        </span>
        <span className="flex h-7 min-w-0 flex-1 flex-col justify-between group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-caption leading-none font-medium text-brand">{t('achievementsTitle')}</span>
          <span data-achievement-count className="block truncate text-xs leading-none text-brand tabular-nums">{countLabel}</span>
        </span>
      </Button>}
    </DialogTrigger>
    <DialogContent data-course-achievements overlayClassName="bg-background/60 backdrop-blur-sm"
      className="top-1/2 max-h-[calc(100dvh-32px)] w-[min(760px,calc(100vw-32px))] -translate-y-1/2 rounded-sm border-brand shadow-[4px_4px_0_var(--color-brand-soft)] max-sm:top-1/2">
      <header className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5 max-sm:px-4">
        <DialogTitle className="m-0 text-xl leading-snug font-semibold tracking-tight text-brand">{t('achievementsTitle')}</DialogTitle>
        <DialogClose asChild><Button variant="brand-outline" size="icon-touch" className="size-11 rounded-sm before:inset-0" aria-label={ui('close')}><XIcon size={18} aria-hidden /></Button></DialogClose>
      </header>
      <DialogDescription className="sr-only">{countLabel}</DialogDescription>
      <div className="mx-6 mt-4 shrink-0 border-b border-brand/15 pb-5 max-sm:mx-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="m-0 text-sm text-brand/80"><strong className="mr-1 text-4xl leading-none font-semibold text-brand tabular-nums">{format.number(earned)}</strong> {t('achievementsCollectionCount', { total })}</p>
          <span className="text-xs text-brand/80 tabular-nums">{completion}</span>
        </div>
        <div role="progressbar" aria-label={t('achievementsTitle')} aria-valuetext={`${countLabel} · ${completion}`}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-busy={!ready}
          className="mt-3.5 h-1.5 rounded-sm bg-brand-soft">
          <div className="h-full rounded-sm bg-brand" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="@container/medals min-h-0 overflow-y-auto px-6 pt-6 pb-6 max-sm:px-4">
        {total ? <ul className="m-0 grid list-none grid-cols-1 gap-x-4 gap-y-5 p-0 @[15rem]/medals:grid-cols-2 sm:@[34rem]/medals:grid-cols-4" aria-label={t('achievementsTitle')}>
          {achievements.map((achievement) => {
            const unlocked = isEarned(achievement.courseId, achievement.id);
            const Icon = medalIcons[achievement.id as keyof typeof medalIcons] ?? MedalIcon;
            return <li key={`${achievement.courseId}:${achievement.id}`} data-medal={achievement.id} data-medal-course={achievement.courseId} data-earned={unlocked}
              aria-label={`${achievement.title} · ${t(unlocked ? 'achievementEarned' : 'achievementLocked')}`}
              className="group/medal relative grid min-w-0 grid-rows-[4.5rem_minmax(2.5rem,auto)] content-start justify-items-start gap-y-2 text-left">
              <span data-medal-emblem aria-hidden className={cn(
                'relative flex size-18 items-center justify-center rounded-sm border shadow-[3px_3px_0_var(--color-brand-soft)] before:pointer-events-none before:absolute before:inset-1 before:rounded-sm before:border',
                unlocked ? 'border-brand bg-brand-soft text-brand before:border-brand/25' : 'border-brand/20 bg-brand/5 text-brand/60 before:border-brand/10',
              )}>
                <Icon size={30} />
                {unlocked && <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-sm border-2 border-background bg-brand text-white"><CheckIcon size={12} weight="bold" /></span>}
              </span>
              <span className={cn('min-h-10 text-caption leading-copy font-medium text-reading [overflow-wrap:anywhere]', unlocked && 'text-brand')}>{achievement.title}</span>
              <Link data-medal-link href={achievement.url} aria-label={t('achievementVisit', { title: achievement.title })}
                onClick={() => { setOpen(false); if (isMobile) setOpenMobile(false); }}
                className="absolute -top-1.5 left-13.5 z-10 flex size-6.5 items-center justify-center rounded-sm border border-brand/35 bg-background text-brand opacity-0 shadow-[2px_2px_0_var(--color-brand-soft)] transition-opacity group-hover/medal:opacity-100 group-focus-within/medal:opacity-100 hover:border-brand hover:bg-brand-soft focus-visible:opacity-100 focus-visible:outline-brand [@media(hover:none)]:opacity-100 [@media(pointer:coarse)]:opacity-100 [@media(pointer:coarse)]:before:absolute [@media(pointer:coarse)]:before:-inset-2.5">
                <ArrowUpRightIcon size={14} aria-hidden />
              </Link>
            </li>;
          })}
        </ul> : <p className="m-0 text-sm text-brand/80">{t('achievementsEmpty')}</p>}
      </div>
    </DialogContent>
  </Dialog>;
}
