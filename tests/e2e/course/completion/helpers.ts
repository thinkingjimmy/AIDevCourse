import { expect, type Page, type TestInfo } from '@playwright/test';
import { readCatalog } from '../../../../src/lib/content/manifest';
import { globalAchievementCourses } from '../../../../src/lib/content/model';

export const catalog = readCatalog();
export const courses = globalAchievementCourses(catalog, 'zh');
export const llm = catalog.courses.find((course) => course.locale === 'zh' && course.id === 'llm-101')!;
export const last = llm.lessons.at(-1)!;
export const completionKey = (courseId: string, lessonId: string) => `lac:v1:${courseId}:completion:${lessonId}`;
export const rewardKey = (courseId = llm.id) => `lac:v1:${courseId}:achievement:course-completion`;
export const celebration = (page: Page) => page.locator('[data-course-completion-dialog]');
export const burst = (page: Page) => page.locator('[data-achievement-confetti]');

export async function seedCompletions(page: Page, courseId: string, lessonIds: string[]) {
  await page.addInitScript(({ courseId, lessonIds }) => {
    const seed = `completion-test:${courseId}`;
    if (localStorage.getItem(seed)) return;
    localStorage.setItem(seed, 'seeded');
    for (const id of lessonIds) localStorage.setItem(`lac:v1:${courseId}:completion:${id}`, JSON.stringify({ completedAt: '2026-10-01T00:00:00Z' }));
  }, { courseId, lessonIds });
}

export async function openGallery(page: Page, label = '我的成就') {
  await page.getByRole('button', { name: label, exact: true }).click();
  const gallery = page.locator('[data-course-achievements]');
  await expect(gallery).toBeVisible();
  return gallery;
}

export async function capture(page: Page, testInfo: TestInfo, name: string) {
  const screenshot = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path: screenshot });
  await testInfo.attach(name, { path: screenshot, contentType: 'image/png' });
  const records = await page.evaluate(() => {
    try { return Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('lac:v1:'))); }
    catch { return { unavailable: true }; }
  });
  await testInfo.attach(`${name}-records`, { body: JSON.stringify(records, null, 2), contentType: 'application/json' });
}

export async function holdConfetti(page: Page) {
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args: Parameters<Element['animate']>) {
      const animation = animate.apply(this, args);
      if (this.matches('[data-confetti-side]')) {
        animation.pause();
        animation.currentTime = 700;
      }
      return animation;
    };
  });
}
