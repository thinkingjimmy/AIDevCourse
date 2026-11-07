'use client';
import { SidebarFooter } from '@/components/navigation/sidebar';
import { AchievementGallery } from '@/components/progress/achievement-gallery';

export function CourseFooter() {
  return <SidebarFooter className="mt-0 w-full flex-row items-center justify-between gap-2 border-t border-border p-2 max-[961px]:px-4 max-[961px]:pb-[max(0.75rem,env(safe-area-inset-bottom))] group-data-[collapsible=icon]:mt-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
    <AchievementGallery />
  </SidebarFooter>;
}
