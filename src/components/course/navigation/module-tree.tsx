'use client';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { canonicalPath } from '@/lib/i18n/routing';
import { groupModules } from '@/lib/content/model';
import { useLearning } from '@/components/progress/progress-provider';
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '../sidebar';

const closedModules: Record<string, boolean> = {};
const openByCourse = new Map<string, Record<string, boolean>>();
const openListeners = new Set<() => void>();
function moduleStorageKey(courseId: string) { return `aidevcourse:modules:${courseId}`; }
function loadOpenModules(courseId: string) {
  const cached = openByCourse.get(courseId);
  if (cached) return cached;
  let value: Record<string, boolean> = {};
  try {
    const raw = sessionStorage.getItem(moduleStorageKey(courseId));
    const parsed = raw ? JSON.parse(raw) as unknown : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      value = Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'));
    }
  } catch { /* A blocked session store still keeps the in-memory map for this visit. */ }
  openByCourse.set(courseId, value);
  return value;
}
function publishOpenModules(courseId: string, value: Record<string, boolean>) {
  openByCourse.set(courseId, value);
  try { sessionStorage.setItem(moduleStorageKey(courseId), JSON.stringify(value)); } catch { /* In-memory state still covers this visit. */ }
  openListeners.forEach((listener) => listener());
}
function useOpenModules(courseId: string) {
  const open = useSyncExternalStore(
    (listener) => { openListeners.add(listener); return () => { openListeners.delete(listener); }; },
    () => loadOpenModules(courseId),
    () => closedModules,
  );
  const setOpen = useCallback((update: (value: Record<string, boolean>) => Record<string, boolean>) => {
    const current = loadOpenModules(courseId);
    const next = update(current);
    if (next !== current) publishOpenModules(courseId, next);
  }, [courseId]);
  return [open, setOpen] as const;
}

export function ModuleTree({ staticMode = false }: { staticMode?: boolean }) {
  const ui = useTranslations('Ui');
  const { course } = useLearning();
  const pathname = canonicalPath(usePathname());
  const groups = groupModules(course.lessons);
  const currentModule = groups.find((group) => group.lessons.some(({ lesson }) => lesson.url === pathname))?.module;
  const [open, setOpen] = useOpenModules(course.id);
  useEffect(() => {
    if (currentModule === undefined) return;
    setOpen((value) => value[currentModule] === true ? value : { ...value, [currentModule]: true });
  }, [currentModule, setOpen]);
  return <SidebarGroup className="m-0 p-2 max-[961px]:px-4 max-[961px]:pb-4">
    <Link href={course.url} className="mb-1 block rounded-md p-2 text-base leading-snug font-semibold text-foreground no-underline hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground max-[961px]:flex max-[961px]:min-h-11 max-[961px]:items-center">{course.title}</Link>
    <nav aria-label={ui('menu')} className="course-navigation flex flex-col gap-1.5 text-sm">
      {groups.map((group, index) => {
        const expanded = staticMode || (open[group.module] ?? group.module === currentModule);
        const title = <>
          <span className="shrink-0 font-mono text-caption font-normal text-sidebar-foreground tabular-nums">{String(index + 1).padStart(2, '0')}{' '}</span>
          <span className="min-w-0">{group.title}</span>
        </>;
        return <SidebarMenu className="gap-0" key={group.module}>
          <SidebarMenuItem>
            {staticMode ? <p className="m-0 flex items-baseline gap-2 p-2 pl-7.5 text-sm leading-snug font-medium text-foreground">{title}</p> : <SidebarMenuButton className="h-auto justify-start gap-2 max-[961px]:min-h-12 rounded-md p-2 font-sans text-sm leading-snug font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground" aria-expanded={expanded} onClick={() => setOpen((value) => ({ ...value, [group.module]: !expanded }))}>
              <CaretDownIcon size={14} aria-hidden className={`size-3.5 shrink-0 text-muted-foreground ${expanded ? '' : '-rotate-90'}`} />
              {title}
            </SidebarMenuButton>}
            {expanded && <SidebarMenuSub className="m-0 translate-x-0 gap-0.5 border-0 p-0">
              {group.lessons.map(({ lesson, part }) => {
                const current = pathname === lesson.url;
                return <SidebarMenuSubItem key={lesson.id}>
                  <SidebarMenuSubButton asChild isActive={current} className="h-auto w-full translate-x-0 max-[961px]:min-h-12 max-[961px]:[&>span:last-child]:overflow-visible max-[961px]:[&>span:last-child]:whitespace-normal rounded-md p-2 pl-7.5 text-sm leading-normal font-normal text-sidebar-foreground hover:bg-accent hover:text-foreground data-[active=true]:bg-accent data-[active=true]:font-bold data-[active=true]:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
                    <Link href={lesson.url} aria-current={current ? 'page' : undefined}>
                      <span className="w-7 shrink-0 font-mono text-caption font-normal text-sidebar-foreground tabular-nums">{part}{' '}</span>
                      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{lesson.title}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>;
              })}
            </SidebarMenuSub>}
          </SidebarMenuItem>
        </SidebarMenu>;
      })}
    </nav>
  </SidebarGroup>;
}

