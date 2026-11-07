'use client';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { canonicalPath } from '@/lib/i18n/routing';
import { groupModules } from '@/lib/content/model';
import { cn } from '@/lib/utils';
import { directoryStyles } from '@/components/navigation/directory-presentation';
import { useLearning } from '@/components/progress/progress-provider';
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/navigation/sidebar';

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

export function CourseOverviewLink({ className }: { className?: string }) {
  const { course } = useLearning();
  return <Link href={course.url} className={cn(directoryStyles.title, 'no-underline hover:bg-sidebar-accent hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand', className)}>{course.title}</Link>;
}

export function ModuleTree({ staticMode = false, showOverview = true }: { staticMode?: boolean; showOverview?: boolean }) {
  const ui = useTranslations('Ui');
  const { course, learning } = useLearning();
  const pathname = canonicalPath(usePathname());
  const groups = groupModules(course.lessons);
  const currentModule = groups.find((group) => group.lessons.some(({ lesson }) => lesson.url === pathname))?.module;
  const [open, setOpen] = useOpenModules(course.id);
  useEffect(() => {
    if (currentModule === undefined) return;
    setOpen((value) => value[currentModule] === true ? value : { ...value, [currentModule]: true });
  }, [currentModule, setOpen]);
  return <SidebarGroup className={directoryStyles.group}>
    {showOverview && <CourseOverviewLink className="mb-1" />}
    <nav aria-label={ui('menu')} className={directoryStyles.tree}>
      {groups.map((group, index) => {
        const expanded = staticMode || (open[group.module] ?? group.module === currentModule);
        const title = <>
          <span className={directoryStyles.categoryNumber}>{String(index + 1).padStart(2, '0')}{' '}</span>
          <span className="min-w-0">{group.title}{!staticMode && <CaretDownIcon size={14} aria-hidden className={cn(directoryStyles.caret, !expanded && '-rotate-90')} />}</span>
        </>;
        return <SidebarMenu className="gap-0" key={group.module}>
          <SidebarMenuItem>
            {staticMode ? <p className="m-0 flex items-baseline gap-2 p-2 min-[961px]:pl-5 text-sm leading-snug font-medium text-foreground">{title}</p> : <SidebarMenuButton className={directoryStyles.category} aria-expanded={expanded} onClick={() => setOpen((value) => ({ ...value, [group.module]: !expanded }))}>
              {title}
            </SidebarMenuButton>}
            {expanded && <SidebarMenuSub className={directoryStyles.submenu}>
              {group.lessons.map(({ lesson, part }) => {
                const current = pathname === lesson.url;
                return <SidebarMenuSubItem key={lesson.id}>
                  <SidebarMenuSubButton asChild isActive={current} className={directoryStyles.link}>
                    <Link href={lesson.url} aria-current={current ? 'page' : undefined}>
                      <span className={directoryStyles.number}>{part}{' '}</span>
                      <span className={directoryStyles.label}>{lesson.title}</span>
                      {Object.hasOwn(learning.completed, lesson.id) && <CheckCircleIcon data-slot="lesson-completed" size={16} weight="fill" role="img" aria-label={ui('completed')} className="ml-auto shrink-0 text-brand" />}
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

