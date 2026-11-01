import { test, expect } from '@playwright/test';
import { readCatalog } from '../../../src/lib/content/manifest';
import { globalAchievementCourses } from '../../../src/lib/content/model';

const catalog = readCatalog();
const courses = globalAchievementCourses(catalog, 'zh').filter((course) => course.achievements.length);
const total = courses.reduce((count, course) => count + course.achievements.length, 0);
const [first, second] = courses;
const start = first.achievements[0].url.split('#')[0];
const definition = (url: string, id: string) => catalog.documents.find((doc) => doc.url === url.split('#')[0])!.achievements.find((item) => item.id === id)!;
const key = (courseId: string, id: string) => `lac:v1:${courseId}:achievement:${id}`;

test.skip(process.env.CONTENT_TEST === '1', 'Uses multiple published courses.');

test('existing course records form one global inventory across courses and languages', async ({ page }, testInfo) => {
  test.skip(courses.length < 2, 'Requires two courses with achievements.');
  const records = {
    [key(first.id, first.achievements[0].id)]: JSON.stringify({ unlockedAt: '2026-10-01T00:00:00Z' }),
    [key(second.id, second.achievements[0].id)]: JSON.stringify({ unlockedAt: '2026-10-02T00:00:00Z' }),
    [key(first.id, 'unknown-achievement')]: JSON.stringify({ unlockedAt: '2026-10-02T00:00:00Z' }),
    [key('unpublished-course', first.achievements[0].id)]: JSON.stringify({ unlockedAt: '2026-10-02T00:00:00Z' }),
  };
  await page.addInitScript((records) => { for (const [name, value] of Object.entries(records)) localStorage.setItem(name, value); }, records);
  await page.goto(start);
  await expect(page.locator('[data-achievement-count]')).toContainText('已解锁 2 项成就');
  await page.getByRole('button', { name: '我的成就', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '我的成就' });
  await expect(dialog.locator('[data-medal]')).toHaveCount(total);
  await expect(dialog.locator('[data-earned="true"]')).toHaveCount(2);
  await expect.poll(async () => Number(await dialog.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeCloseTo(200 / total, 8);
  const otherCourse = dialog.locator(`[data-medal-course="${second.id}"]`).first();
  await expect(otherCourse).toHaveAttribute('data-earned', 'true');
  await otherCourse.hover();
  await otherCourse.getByRole('link').click();
  await expect(page).toHaveURL(new RegExp(second.achievements[0].url + '$'));
  await expect(page.locator('[data-achievement-count]')).toContainText('已解锁 2 项成就');
  const english = catalog.courses.find((course) => course.locale === 'en' && course.id === first.id)!;
  await page.goto(english.lessons[0].url);
  await page.getByRole('button', { name: 'My achievements', exact: true }).click();
  const translated = page.getByRole('dialog', { name: 'My achievements' });
  await expect(translated.locator('[data-medal]')).toHaveCount(total);
  await expect(translated.locator('[data-earned="true"]')).toHaveCount(2);
  await expect(translated.locator(`[data-medal-course="${second.id}"]`).first().getByRole('link')).toHaveAttribute('href', second.achievements[0].url);
  expect(await page.evaluate((names) => Object.fromEntries(names.map((name) => [name, localStorage.getItem(name)])), Object.keys(records))).toEqual(records);
  await testInfo.attach('global-achievements-across-languages', { body: await translated.screenshot(), contentType: 'image/png' });
  await testInfo.attach('global-achievement-inventory', { body: JSON.stringify({ total, earned: 2, courses: globalAchievementCourses(catalog, 'en') }, null, 2), contentType: 'application/json' });
});

test('unlocks from another course update an open gallery across tabs and after clearing storage', async ({ page, context }) => {
  test.skip(courses.length < 2, 'Requires two courses with achievements.');
  await page.goto(start);
  await page.getByRole('button', { name: '我的成就', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '我的成就' });
  const other = await context.newPage();
  const achievement = second.achievements[0];
  await other.goto(achievement.url);
  const exercise = definition(achievement.url, achievement.id);
  await other.locator(`[data-achievement="${achievement.id}"]`).getByRole('radio').nth(exercise.options.findIndex((option) => option.value === exercise.answer)).click();
  await expect(dialog.locator(`[data-medal-course="${second.id}"][data-medal="${achievement.id}"]`)).toHaveAttribute('data-earned', 'true');
  await expect.poll(async () => Number(await dialog.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeCloseTo(100 / total, 8);
  const saved = await other.evaluate((name) => localStorage.getItem(name), key(second.id, achievement.id));
  await other.reload();
  await expect(other.locator(`[data-achievement="${achievement.id}"]`)).toHaveAttribute('data-state', 'unlocked');
  expect(await other.evaluate((name) => localStorage.getItem(name), key(second.id, achievement.id))).toBe(saved);
  await other.evaluate(() => localStorage.clear());
  await expect(dialog.locator('[data-earned="true"]')).toHaveCount(0);
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await other.close();
});

test('blocked storage retains in-memory unlocks while navigating between courses', async ({ page }, testInfo) => {
  test.skip(courses.length < 2, 'Requires two courses with achievements.');
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  await page.goto(start);
  for (const course of [first, second]) {
    const achievement = course.achievements[0];
    const exercise = definition(achievement.url, achievement.id);
    await page.locator(`[data-achievement="${achievement.id}"]`).getByRole('radio').nth(exercise.options.findIndex((option) => option.value === exercise.answer)).click();
    await page.getByRole('button', { name: '我的成就', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: '我的成就' });
    await expect(dialog.locator('[data-earned="true"]')).toHaveCount(course === first ? 1 : 2);
    if (course === first) {
      const destination = dialog.locator(`[data-medal-course="${second.id}"]`).first();
      await destination.hover();
      await destination.getByRole('link').click();
      await expect(page).toHaveURL(new RegExp(second.achievements[0].url + '$'));
    } else {
      await expect(dialog.locator(`[data-medal-course="${first.id}"]`).first()).toHaveAttribute('data-earned', 'true');
      await testInfo.attach('global-achievements-memory-fallback', { body: await dialog.screenshot(), contentType: 'image/png' });
    }
  }
});
