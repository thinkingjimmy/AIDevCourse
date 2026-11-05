import { test, expect } from '@playwright/test';
import { readCatalog } from '../../../../src/lib/content/manifest';

test.skip(process.env.CONTENT_TEST === '1', 'Uses the published multilingual lesson.');

for (const [locale, label, completed, next] of [
  ['zh', '标记为已完成', '已完成', '下一章'],
  ['en', 'Mark as complete', 'Completed', 'Next chapter'],
  ['ja', '完了にする', '完了', '次の章へ'],
  ['fr', 'Marquer comme terminé', 'Terminé', 'Chapitre suivant'],
  ['es', 'Marcar como completada', 'Completada', 'Siguiente capítulo'],
]) {
  test(`${locale}: rounded completion button localizes and fits enlarged mobile text`, async ({ page }, testInfo) => {
    const course = readCatalog().courses.find((entry) => entry.id === 'llm-101' && entry.locale === locale)!;
    const lesson = course.lessons[0];
    await page.setViewportSize({ width: 320, height: 960 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(lesson.url);
    const button = page.getByRole('button', { name: label, exact: true });
    for (const textSize of [16, 32]) {
      await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}px`; }, textSize);
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeEnabled();
      const geometry = await button.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return { radius: style.borderRadius, background: style.backgroundColor, border: style.borderColor, color: style.color, height: rect.height, right: rect.right, left: rect.left, width: element.clientWidth, contentWidth: element.scrollWidth };
      });
      expect(geometry.radius).toBe(`${textSize / 4}px`);
      expect(geometry.background).toBe('rgb(49, 86, 75)');
      expect(geometry.border).toBe(geometry.background);
      expect(geometry.color).toBe('rgb(255, 255, 255)');
      expect(geometry.height).toBeGreaterThanOrEqual(44);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(320);
      expect(geometry.contentWidth).toBeLessThanOrEqual(geometry.width);
      await testInfo.attach(`completion-${locale}-${textSize}px`, { body: await button.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      await testInfo.attach(`completion-geometry-${locale}-${textSize}px`, { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
    }
    await button.click();
    await expect(page).toHaveURL(course.lessons[1]?.url ?? course.url);
    await page.goto(lesson.url);
    await page.locator('[data-slot="mobile-sidebar-trigger"]').click();
    await expect(page.locator(`[data-mobile="true"] a[href="${lesson.url}"]`).getByRole('img', { name: completed, exact: true })).toBeVisible();
    await testInfo.attach(`completed-icon-${locale}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    await page.keyboard.press('Escape');
    await expect(button).toHaveCount(0);
    const nextButton = page.getByRole('button', { name: next, exact: true });
    await expect(nextButton).toBeEnabled();
    await expect(nextButton).toHaveCSS('border-radius', '4px');
    await testInfo.attach(`next-chapter-${locale}`, { body: await nextButton.screenshot(), contentType: 'image/png' });
    await nextButton.click();
    await expect(page).toHaveURL(course.lessons[1]?.url ?? course.url);
  });
}
