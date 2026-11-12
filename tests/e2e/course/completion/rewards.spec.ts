import { test, expect } from '@playwright/test';
import { catalog, courses, llm, last, completionKey, rewardKey, celebration, burst, seedCompletions, openGallery, capture } from './helpers';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published course inventory.');

test('all five learning courses have one completion medal, including empty courses', async ({ page }, testInfo) => {
  await page.goto(last.url);
  const gallery = await openGallery(page);
  const medals = gallery.locator('[data-medal="course-completion"]');
  await expect(medals).toHaveCount(5);
  for (const id of ['llm-101', 'coding-101', 'design-101', 'deepseek-101', 'agent-101']) {
    const course = catalog.courses.find((course) => course.locale === 'zh' && course.id === id)!;
    const medal = medals.filter({ has: page.locator(`a[href="${course.url}"]`) });
    await expect(medal).toHaveAttribute('data-earned', 'false');
    await expect(medal).toHaveAccessibleName(`完成 ${course.title} · 未解锁`);
    await expect(medal.getByRole('link')).toHaveAccessibleName(`课程总览 · ${course.title}`);
    expect(await page.evaluate((key) => localStorage.getItem(key), rewardKey(id))).toBeNull();
  }
  await expect(gallery.locator('[data-medal-course="ai-coding"][data-medal="course-completion"]')).toHaveCount(0);
  await capture(page, testInfo, 'five-course-completion-medals');
});

for (const id of ['llm-101', 'coding-101']) {
  test(`${id}: old complete records earn one medal without exercises or celebration`, async ({ page }, testInfo) => {
    const course = courses.find((course) => course.id === id)!;
    const local = catalog.courses.find((course) => course.id === id && course.locale === 'zh')!;
    await seedCompletions(page, id, course.lessonIds);
    await page.goto(local.lessons[0].url);
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), rewardKey(id))).not.toBeNull();
    const saved = await page.evaluate((key) => localStorage.getItem(key), rewardKey(id));
    expect(JSON.parse(saved!).unlockedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes(':achievement:')))).toEqual([rewardKey(id)]);
    await expect(celebration(page)).toHaveCount(0);
    await expect(burst(page)).toHaveCount(0);
    await page.reload();
    const gallery = await openGallery(page);
    const medal = gallery.locator(`[data-medal-course="${id}"][data-medal="course-completion"]`);
    await expect(medal).toHaveAttribute('data-earned', 'true');
    expect(await page.evaluate((key) => localStorage.getItem(key), rewardKey(id))).toBe(saved);
    await capture(page, testInfo, `${id}-restored-completion`);
    await medal.getByRole('link').focus();
    await medal.getByRole('link').press('Enter');
    await expect(page).toHaveURL(local.url);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('finishing an earlier missing lesson awards the course without a celebration', async ({ page }, testInfo) => {
  const missing = llm.lessons[0];
  await seedCompletions(page, llm.id, courses.find((course) => course.id === llm.id)!.lessonIds.filter((id) => id !== missing.id));
  await page.goto(missing.url);
  expect(await page.evaluate((key) => localStorage.getItem(key), rewardKey())).toBeNull();
  await page.getByRole('button', { name: '标记为已完成', exact: true }).click();
  await expect(page).toHaveURL(llm.lessons[1].url);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), rewardKey())).not.toBeNull();
  await expect(celebration(page)).toHaveCount(0);
  await expect(burst(page)).toHaveCount(0);
  const gallery = await openGallery(page);
  await expect(gallery.locator('[data-medal-course="llm-101"][data-medal="course-completion"]')).toHaveAttribute('data-earned', 'true');
  await capture(page, testInfo, 'earlier-missing-lesson-completed');
});

test('translated lessons share progress but cannot shorten the full course requirement', async ({ page, context }, testInfo) => {
  const english = catalog.courses.find((course) => course.id === llm.id && course.locale === 'en')!;
  const translatedLast = english.lessons.at(-1)!;
  await seedCompletions(page, llm.id, english.lessons.slice(0, -1).map((lesson) => lesson.id));
  await page.goto(translatedLast.url);
  await page.getByRole('button', { name: 'Mark as complete', exact: true }).click();
  await expect(celebration(page)).toBeVisible();
  await expect(celebration(page)).toContainText('Another lesson complete. Keep going!');
  expect(await page.evaluate((key) => localStorage.getItem(key), rewardKey())).toBeNull();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(english.url);
  await page.goto(english.lessons[0].url);
  const gallery = await openGallery(page, 'My achievements');
  const medal = gallery.locator('[data-medal-course="llm-101"][data-medal="course-completion"]');
  await expect(medal).toHaveAttribute('data-earned', 'false');
  const other = await context.newPage();
  await other.goto(last.url);
  await other.evaluate(({ id, lessons }) => {
    for (const lesson of lessons) localStorage.setItem(`lac:v1:${id}:completion:${lesson}`, JSON.stringify({ completedAt: '2026-10-02T00:00:00Z' }));
  }, { id: llm.id, lessons: llm.lessons.filter((lesson) => !english.lessons.some((item) => item.id === lesson.id)).map((lesson) => lesson.id) });
  await expect(medal).toHaveAttribute('data-earned', 'true');
  await expect(celebration(page)).toHaveCount(0);
  await expect(burst(page)).toHaveCount(0);
  await expect(celebration(other)).toHaveCount(0);
  await capture(page, testInfo, 'shared-completion-across-languages-and-tabs');
  await other.close();
});

test('invalid and unknown completion records cannot earn a medal; earned medals stay earned', async ({ page }, testInfo) => {
  const missing = llm.lessons[0];
  await seedCompletions(page, llm.id, llm.lessons.slice(1).map((lesson) => lesson.id));
  await page.addInitScript(({ key, courseId }) => {
    localStorage.setItem(key, '{"completedAt":"not-a-date"}');
    localStorage.setItem(`lac:v1:${courseId}:completion:unknown-lesson`, JSON.stringify({ completedAt: '2026-10-01T00:00:00Z' }));
  }, { key: completionKey(llm.id, missing.id), courseId: llm.id });
  await page.goto(missing.url);
  const gallery = await openGallery(page);
  const medal = gallery.locator('[data-medal-course="llm-101"][data-medal="course-completion"]');
  await expect(medal).toHaveAttribute('data-earned', 'false');
  expect(await page.evaluate((key) => localStorage.getItem(key), rewardKey())).toBeNull();
  const earned = JSON.stringify({ unlockedAt: '2026-10-03T00:00:00Z' });
  await page.evaluate(({ key, earned }) => { localStorage.setItem(key, earned); window.dispatchEvent(new Event('focus')); }, { key: rewardKey(), earned });
  await expect(medal).toHaveAttribute('data-earned', 'true');
  expect(await page.evaluate((key) => localStorage.getItem(key), rewardKey())).toBe(earned);
  await capture(page, testInfo, 'completion-record-validation');
});
