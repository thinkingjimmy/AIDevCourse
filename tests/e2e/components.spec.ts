/**
 * [INPUT]: The real MDX preview, Chinese What a language model does lesson, responsive viewports, and a production server, canonical locale paths.
 * [OUTPUT]: Author-note, chat thinking/completed states with user/LLM avatars, reduced-motion behavior, lesson demos, question-only achievement prompts, explicit answer feedback, immediate earned cards, non-destructive retries after success with timestamp and count checks, and screenshot evidence.
 * [POS]: Component acceptance suite; local screenshots do not require baseline images.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { localeCookie, type Locale } from '../../src/lib/i18n/config';
import { localePath } from '../../src/lib/i18n/routing';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const viewport of [{ name: 'desktop', width: 1280, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
  test(`JimmyNote renders authored Markdown on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const response = await page.goto('/design/components');
    expect(response?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const notes = page.getByRole('note', { name: 'Jimmy', exact: true });
    await expect(notes).toHaveCount(2);
    await expect(notes.first()).toContainText('大企业的影子 AI');
    await expect(notes.nth(1).locator('p')).toHaveCount(2);
    await expect(notes.nth(1).locator('p strong')).toContainText('自己的观察');
    await expect(notes.nth(1).getByRole('link', { name: '写作说明' })).toHaveAttribute('href', '#authoring');
    for (const note of await notes.all()) {
      const style = await note.evaluate((element) => {
        const computed = getComputedStyle(element);
        return { background: computed.backgroundColor, color: computed.color, border: computed.borderTopWidth, shadow: computed.boxShadow };
      });
      expect(style).toEqual({ background: 'rgb(228, 228, 231)', color: 'rgb(43, 43, 34)', border: '0px', shadow: 'none' });
      await expect(note.locator('[data-slot="alert-title"]')).toHaveText('Jimmy');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    const path = test.info().outputPath(`jimmy-note-${viewport.name}.png`);
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    await test.info().attach('JimmyNote preview', { path, contentType: 'image/png' });
  });
}

test('JimmyNote and its links work without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/design/components');
    const notes = page.getByRole('note', { name: 'Jimmy', exact: true });
    await expect(notes).toHaveCount(2);
    await notes.nth(1).getByRole('link', { name: '写作说明' }).click();
    await expect(page).toHaveURL(/#authoring$/);
    await expect(page.locator('#authoring')).toBeInViewport();
    const path = test.info().outputPath('jimmy-note-no-js.png');
    await page.screenshot({ path, fullPage: true });
    await test.info().attach('JimmyNote without JavaScript', { path, contentType: 'image/png' });
  } finally { await context.close(); }
});

test.describe('ChatMessage', () => {
  for (const viewport of [{ name: 'desktop', width: 1280, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
    test(`renders Markdown and sender alignment on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/design/components');
      const chat = page.locator('#chat');
      const messages = chat.locator('[data-component="chat-message"]');
      await expect(messages).toHaveCount(3);
      const user = messages.first();
      const assistant = messages.nth(1);
      await expect(user).toHaveAttribute('data-from', 'user');
      await expect(user).toHaveCSS('justify-content', 'flex-end');
      await expect(user.locator('[data-slot="message-content"]')).toHaveCSS('background-color', 'rgb(244, 244, 245)');
      const avatar = user.locator('[data-slot="message-avatar"]');
      await expect(avatar).toBeVisible();
      await expect(avatar).toHaveAttribute('aria-hidden', 'true');
      await expect(avatar).toHaveCSS('width', '32px');
      await expect(avatar).toHaveCSS('height', '32px');
      const bubbleBounds = await user.locator('[data-slot="message-content"]').boundingBox();
      const avatarBounds = await avatar.boundingBox();
      expect(avatarBounds!.x).toBeGreaterThan(bubbleBounds!.x + bubbleBounds!.width);
      await expect(assistant).toHaveAttribute('data-from', 'assistant');
      await expect(assistant).toHaveCSS('justify-content', 'flex-start');
      const assistantAvatar = assistant.locator('[data-slot="message-avatar"]');
      const assistantBubble = assistant.locator('[data-slot="message-content"]');
      await expect(assistantAvatar).toBeVisible();
      const avatarColors = (element: Element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, color: style.color, border: style.borderColor };
      };
      expect(await assistantAvatar.evaluate(avatarColors)).toEqual(await avatar.evaluate(avatarColors));
      await expect(assistantBubble).toHaveCSS('border-top-width', '1px');
      const assistantAvatarBounds = await assistantAvatar.boundingBox();
      const assistantBubbleBounds = await assistantBubble.boundingBox();
      expect(assistantAvatarBounds!.x + assistantAvatarBounds!.width).toBeLessThan(assistantBubbleBounds!.x);
      await expect(assistant.locator('p')).toHaveCount(2);
      await expect(assistant.locator('strong')).toHaveText('实时天气数据');
      await expect(assistant.getByRole('link', { name: '写作说明' })).toHaveAttribute('href', '#authoring');
      for (const message of await messages.all()) {
        await expect(message).toHaveCSS('border-top-width', '1px');
        await expect(message).toHaveCSS('border-top-color', 'rgb(9, 9, 11)');
        expect(await message.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const accessibility = await new AxeBuilder({ page }).include('#chat').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await test.info().attach(`chat-preview-${viewport.name}`, { body: await chat.screenshot(), contentType: 'image/png' });

      if (process.env.CONTENT_TEST !== '1') {
        await page.goto('/zh/courses/ai-101/what-a-language-model-does');
        const pending = page.locator('[data-component="chat"]').first();
        const prompt = pending.locator('[data-from="user"]');
        await expect(prompt).toHaveText('今天广州的天气如何？');
        await expect(prompt).toHaveAttribute('data-from', 'user');
        const frameStyles = (element: Element) => {
          const style = getComputedStyle(element);
          return { border: style.border, radius: style.borderRadius, shadow: style.boxShadow };
        };
        const sharedFrame = page.locator('[data-generation-demo]');
        expect(await pending.evaluate(frameStyles)).toEqual(await sharedFrame.evaluate(frameStyles));
        await expect(prompt.locator('[data-slot="message-avatar"]')).toBeVisible();
        await expect(page.locator('blockquote').filter({ hasText: '今天广州的天气如何？' })).toHaveCount(0);
        const thinking = pending.locator('[data-state="thinking"]');
        await expect(thinking).toHaveAttribute('data-from', 'assistant');
        await expect(thinking.locator('[data-slot="message-avatar"]')).toBeVisible();
        await expect(thinking.getByRole('status')).toHaveText('Thinking');
        await expect(thinking.locator('[data-slot="message-content"]')).toHaveCSS('border-top-width', '0px');
        await expect(thinking.locator('[data-slot="message-content"]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(thinking.locator('[data-slot="spinner"]')).not.toHaveCSS('animation-name', 'none');
        const pendingAccessibility = await new AxeBuilder({ page }).include('[data-state="thinking"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(pendingAccessibility.violations).toEqual([]);
        const thinkingPath = test.info().outputPath(`chat-thinking-${viewport.name}.png`);
        await pending.screenshot({ path: thinkingPath, animations: 'disabled' });
        await test.info().attach(`chat-thinking-${viewport.name}`, { path: thinkingPath, contentType: 'image/png' });
        await prompt.scrollIntoViewIfNeeded();
        await test.info().attach(`chat-lesson-${viewport.name}`, { body: await page.screenshot(), contentType: 'image/png' });
        const conversation = page.locator('[data-component="chat"]').last();
        const turns = conversation.locator('[data-component="chat-message"]');
        await expect(turns).toHaveCount(2);
        await expect(turns.first()).toHaveAttribute('data-from', 'user');
        await expect(turns.first()).toHaveText('今天广州的天气如何？');
        await expect(turns.first().locator('[data-slot="message-avatar"]')).toBeVisible();
        await expect(turns.nth(1)).toHaveAttribute('data-from', 'assistant');
        await expect(turns.nth(1)).toHaveText('今天广州天气晴朗，温度在 28 ℃');
        await expect(turns.nth(1).locator('[data-slot="message-avatar"]')).toBeVisible();
        await expect(turns.nth(1).locator('[data-slot="message-content"]')).toHaveCSS('border-top-width', '1px');
        expect(await conversation.evaluate(frameStyles)).toEqual(await sharedFrame.evaluate(frameStyles));
        for (const turn of await turns.all()) {
          await expect(turn).toHaveCSS('border-top-width', '0px');
        }
        const questionBounds = await turns.first().boundingBox();
        const answerBounds = await turns.nth(1).boundingBox();
        expect(answerBounds!.y).toBeGreaterThanOrEqual(questionBounds!.y + questionBounds!.height);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const path = test.info().outputPath(`chat-conversation-${viewport.name}.png`);
        await conversation.screenshot({ path });
        await test.info().attach(`chat-conversation-${viewport.name}`, { path, contentType: 'image/png' });
      }
    });
  }

  test('remains readable and links work without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto('/design/components');
      const chat = page.locator('#chat');
      await expect(chat.locator('[data-from="user"]').first()).toHaveText('今天广州的天气如何？');
      await expect(chat.locator('[data-from="user"]').first().locator('[data-slot="message-avatar"]')).toBeVisible();
      await chat.getByRole('link', { name: '写作说明' }).click();
      await expect(page).toHaveURL(/#authoring$/);
      await expect(page.locator('#authoring')).toBeInViewport();
      await test.info().attach('chat-no-js', { body: await chat.screenshot(), contentType: 'image/png' });
      if (process.env.CONTENT_TEST !== '1') {
        await page.goto('/zh/courses/ai-101/what-a-language-model-does');
        await expect(page.locator('[data-state="thinking"]').getByRole('status')).toHaveText('Thinking');
        await expect(page.locator('[data-state="thinking"] [data-slot="message-avatar"]')).toBeVisible();
        const conversation = page.locator('[data-component="chat"]').last();
        await expect(conversation.locator('[data-from="user"]')).toHaveText('今天广州的天气如何？');
        await expect(conversation.locator('[data-from="assistant"]')).toHaveText('今天广州天气晴朗，温度在 28 ℃');
        await expect(conversation.locator('[data-from="assistant"] [data-slot="message-avatar"]')).toBeVisible();
        const path = test.info().outputPath('chat-conversation-no-js.png');
        await conversation.screenshot({ path });
        await test.info().attach('chat-conversation-no-js', { path, contentType: 'image/png' });
      }
    } finally { await context.close(); }
  });
  test('Thinking stays readable with reduced motion', async ({ page }) => {
    test.skip(process.env.CONTENT_TEST === '1', 'The example belongs to the published lesson.');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/zh/courses/ai-101/what-a-language-model-does');
    const thinking = page.locator('[data-state="thinking"]');
    await expect(thinking.getByRole('status')).toHaveText('Thinking');
    const spinner = thinking.locator('[data-slot="spinner"]');
    await expect(spinner).toHaveCSS('animation-name', 'none');
    expect(await spinner.evaluate((element) => element.getAnimations().length)).toBe(0);
    const path = test.info().outputPath('chat-thinking-reduced-motion.png');
    await thinking.locator('..').screenshot({ path });
    await test.info().attach('chat-thinking-reduced-motion', { path, contentType: 'image/png' });
  });
});

test.describe('What a language model does lesson demos', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'The lesson belongs to the published catalog.');

  test('renamed lesson keeps localized links, identity, and metadata aligned', async ({ page }) => {
    const title = 'What a language model does';
    for (const locale of ['zh', 'en', 'ja', 'fr', 'es'] as const) {
      const path = localePath(locale as Locale, `/courses/ai-101/what-a-language-model-does`);
      await page.goto(localePath(locale as Locale, `/`));
      await expect(page.locator(`a[href="${path}"]`).first()).toBeVisible();
      await page.goto(localePath(locale as Locale, `/courses/ai-101`));
      await expect(page.getByRole('link', { name: title }).first()).toHaveAttribute('href', path);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lac:v1:ai-101:last') ?? 'null')?.lessonId)).toBe('what-a-language-model-does');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`));
    }
    await page.goto('/zh/courses/ai-101/what-a-language-model-does');
    await test.info().attach('what-a-language-model-does-title-and-navigation', { body: await page.screenshot(), contentType: 'image/png' });
  });

  for (const viewport of [{ name: 'desktop', width: 1280, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
    test(`generation works on ${viewport.name}`, async ({ page }) => {
      test.setTimeout(60000);
      await page.setViewportSize(viewport);
      await page.clock.install({ time: new Date('2026-10-27T10:00:00Z') });
      await page.clock.pauseAt(new Date('2026-10-27T10:00:01Z'));
      const response = await page.goto('/zh/courses/ai-101/what-a-language-model-does');
      expect(response?.status()).toBe(200);
      const generation = page.getByRole('figure', { name: '文字接龙演示' });
      await expect(generation).toHaveAttribute('data-ready', 'true');
      await generation.scrollIntoViewIfNeeded();
      await page.clock.runFor(100);
      const replay = generation.getByRole('button', { name: '重新播放', exact: true });
      await replay.click();
      await page.clock.runFor(1700);
      await generation.getByRole('button', { name: '暂停', exact: true }).click();
      const selected = generation.locator('[data-selected="true"]');
      await expect(generation).toHaveAttribute('data-phase', 'selected');
      await expect(selected.locator('[data-letter]')).toHaveText('今');
      await expect(selected).toHaveAttribute('data-probability', '72');
      await expect(generation.locator('[data-current-input]')).toHaveText('今天广州的天气如何？');
      const padding = await generation.locator('[data-current] [data-row-content]').evaluate((panel) => {
        const bounds = panel.getBoundingClientRect();
        const input = panel.querySelector('[data-input-row]')!.getBoundingClientRect();
        const candidates = panel.querySelector('[data-candidates]')!.getBoundingClientRect();
        const style = getComputedStyle(panel);
        return { horizontal: parseFloat(style.paddingLeft), top: Math.min(input.top, candidates.top) - bounds.top, bottom: bounds.bottom - Math.max(input.bottom, candidates.bottom) };
      });
      expect(padding.top).toBeCloseTo(padding.horizontal, 1);
      expect(padding.bottom).toBeCloseTo(padding.horizontal, 1);
      await test.info().attach(`generation-padding-${viewport.name}`, { body: JSON.stringify(padding, null, 2), contentType: 'application/json' });
      await page.clock.runFor(1000);
      await expect(generation).toHaveAttribute('data-phase', 'selected');
      await test.info().attach(`generation-selected-${viewport.name}`, { body: await generation.screenshot(), contentType: 'image/png' });
      await generation.getByRole('button', { name: '继续播放', exact: true }).click();
      await page.clock.runFor(800);
      await expect(generation.locator('[data-draft-input]')).toHaveText('今天广州的天气如何？今');
      await page.clock.runFor(900);
      await expect(generation).toHaveAttribute('data-round', '2');
      await expect(generation.locator('[data-current-input]')).toHaveText('今天广州的天气如何？今');
      await page.clock.runFor(1500);
      await expect(selected.locator('[data-letter]')).toHaveText('天');
      await expect(selected).toHaveAttribute('data-probability', '81');
      await page.clock.runFor(800);
      await expect(generation.locator('[data-draft-input]')).toHaveText('今天广州的天气如何？今天');
      await page.clock.runFor(40000);
      await expect(generation).toHaveAttribute('data-complete', 'true');
      await expect(generation.locator('[data-generation-output]')).toHaveText('今天广州天气晴朗，温度在 28 ℃。');
      expect(await generation.locator('[data-draft-input]').innerText()).toBe('今天广州天气晴朗，温度在 28 ℃。');
      await expect(generation.getByRole('button', { name: '暂停', exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const path = test.info().outputPath(`generation-complete-${viewport.name}.png`);
      await generation.screenshot({ path });
      await test.info().attach(`generation-complete-${viewport.name}`, { path, contentType: 'image/png' });
      await replay.click();
      await expect(generation.locator('[data-generation-output]')).toBeEmpty();
      await expect(generation).toHaveAttribute('data-round', '1');
      await generation.getByRole('button', { name: '暂停', exact: true }).click();
      await replay.click();
      await expect(generation).toHaveAttribute('data-playing', 'true');
    });

    test(`menus use equal columns without an outer border on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/zh/courses/ai-101/what-a-language-model-does');
      const menus = page.getByRole('figure', { name: '两种菜单对比' });
      const native = menus.getByRole('combobox', { name: '浏览器原生菜单' });
      await expect(native.getByRole('option')).toHaveText(['请点击', '菜单 A', '菜单 B', '菜单 C']);
      await expect(menus.locator('[data-slot="button"]')).toHaveCount(2);
      await expect(menus.locator('svg')).toHaveCount(0);
      const controls = menus.locator('[data-slot="button"]');
      const left = await controls.first().boundingBox();
      const right = await controls.last().boundingBox();
      const columns = menus.locator(':scope > div');
      await expect(columns).toHaveCount(2);
      const leftColumn = await columns.first().boundingBox();
      const rightColumn = await columns.last().boundingBox();
      expect(leftColumn!.width).toBeCloseTo(rightColumn!.width, 0);
      expect(left!.x + left!.width / 2).toBeCloseTo(leftColumn!.x + leftColumn!.width / 2, 0);
      expect(right!.x + right!.width / 2).toBeCloseTo(rightColumn!.x + rightColumn!.width / 2, 0);
      await expect(menus.locator('figcaption, label, p, [role="status"]')).toHaveCount(0);
      await expect(menus).toHaveCSS('border-top-width', '0px');
      await expect(menus).toHaveCSS('box-shadow', 'none');
      await menus.scrollIntoViewIfNeeded();
      const frame = (await menus.boundingBox())!;
      await test.info().attach(`menu-comparison-closed-${viewport.name}`, {
        body: await page.screenshot({ clip: { x: frame.x - 8, y: frame.y - 8, width: frame.width + 16, height: frame.height + 16 }, animations: 'disabled' }),
        contentType: 'image/png',
      });
      await native.selectOption('菜单 B');
      await expect(native).toHaveAttribute('aria-label', /已选择 菜单 B/);
      await expect(native).toHaveValue('菜单 B');
      const trigger = menus.getByRole('button', { name: '打开 shadcn 菜单' });
      await trigger.click();
      await expect(page.getByRole('menuitem')).toHaveText(['菜单 A', '菜单 B', '菜单 C']);
      await page.getByRole('menuitem', { name: '菜单 C' }).click();
      await expect(trigger).toHaveAttribute('aria-label', /已选择 菜单 C/);
      await expect(trigger).toHaveText('请点击');
      await expect(native).toHaveAttribute('aria-label', /已选择 菜单 B/);
      await expect(native).toHaveValue('菜单 B');
      await expect(trigger).toBeFocused();
      await trigger.press('ArrowDown');
      await expect(page.getByRole('menuitem', { name: '菜单 A' })).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('menuitem', { name: '菜单 B' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(trigger).toHaveAttribute('aria-label', /已选择 菜单 B/);
      await expect(trigger).toHaveText('请点击');
      await expect(trigger).toBeFocused();
      await trigger.press('Enter');
      await expect(page.getByRole('menu')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await trigger.click();
      await expect(page.getByRole('menu')).toBeVisible();
      const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await test.info().attach(`menu-comparison-${viewport.name}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    });
  }

  test('generation respects reduced motion and enlarged text', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto('/zh/courses/ai-101/what-a-language-model-does');
    await page.evaluate(() => { document.documentElement.style.fontSize = '20px'; });
    const generation = page.getByRole('figure', { name: '文字接龙演示' });
    await expect(generation).toHaveAttribute('data-complete', 'true');
    await generation.scrollIntoViewIfNeeded();
    await expect(generation).toHaveAttribute('data-playing', 'false');
    await expect(generation.locator('[data-generation-output]')).toHaveText('今天广州天气晴朗，温度在 28 ℃。');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Faded animation snapshots have a text alternative; audit the controls and accessible description.
    const accessibility = await new AxeBuilder({ page }).include('[data-generation-demo]').exclude('[data-paper]').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    const path = test.info().outputPath('generation-reduced-enlarged.png');
    await generation.screenshot({ path });
    await test.info().attach('generation-reduced-enlarged', { path, contentType: 'image/png' });
  });

  test('explanations remain readable without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto('/zh/courses/ai-101/what-a-language-model-does');
      const generation = page.getByRole('figure', { name: '文字接龙演示' });
      await generation.getByText('查看完整生成过程', { exact: true }).click();
      await expect(generation.getByText('最终回答（虚构）：今天广州天气晴朗，温度在 28 ℃。', { exact: true })).toBeVisible();
      await expect(page.getByRole('combobox', { name: '浏览器原生菜单' })).toBeVisible();
      const achievement = page.locator('[data-achievement="generation-vs-verification"]');
      await achievement.getByText('查看解释', { exact: true }).click();
      await expect(achievement.locator('noscript details p')).toBeVisible();
      await expect(achievement.locator('noscript details p')).toContainText('它生成的回答只是基于训练数据的预测，并不代表真实天气。');
      await expect(achievement.locator('noscript > p')).toHaveText('成就解锁与保存需要 JavaScript，你可以继续阅读。');
      await expect(achievement).toHaveAttribute('data-state', 'locked');
      await expect(achievement.getByRole('radio')).toHaveCount(0);
      await expect(page.getByRole('figure', { name: '两种菜单对比', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await test.info().attach('what-a-language-model-does-no-js', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      await page.locator('noscript > details > summary').filter({ hasText: '课程目录' }).click();
      const nativeFooter = page.locator('noscript > details [data-sidebar="footer"]');
      await expect(nativeFooter.getByRole('link', { name: '关于', exact: true })).toBeVisible();
      await nativeFooter.locator('.language-picker summary').click();
      const english = nativeFooter.locator('.language-options a[hreflang="en"]');
      await expect(english).toBeInViewport();
      await english.click();
      await expect(page).toHaveURL(/\/courses\/ai-101\/what-a-language-model-does$/);
    } finally { await context.close(); }
  });
});

test.describe('Learning achievements', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'The achievement belongs to the published Chinese lesson.');
  const path = '/zh/courses/ai-101/what-a-language-model-does';
  const key = 'lac:v1:ai-101:achievement:generation-vs-verification';
  const block = '[data-achievement="generation-vs-verification"]';
  const count = '[data-achievement-count]';
  const correct = '它生成了一句天气预报，真实天气仍需要查证。';
  async function expectCount(page: Page, value: number) {
    const mobile = (page.viewportSize()?.width ?? 1280) < 961;
    if (mobile) await page.getByRole('button', { name: '课程目录', exact: true }).click();
    await expect(page.locator(count)).toHaveText(`已解锁 ${value} 项成就`);
    const footer = page.locator('[data-sidebar="footer"]');
    await expect(footer.locator(count)).toBeVisible();
    await expect(page.locator('[data-sidebar="header"]').locator(count)).toHaveCount(0);
    await expect(footer.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(value * 100));
    const earned = await footer.locator(count).boundingBox();
    const more = await footer.getByRole('button', { name: '更多', exact: true }).boundingBox();
    expect(earned!.x + earned!.width).toBeLessThan(more!.x);
    await expect(footer.getByText('我的成就', { exact: true })).toBeVisible();
    await expect(footer.getByRole('link', { name: '关于', exact: true })).toHaveCount(0);
    await expect(footer.getByRole('progressbar')).toHaveCSS('width', '40px');
    await expect(footer.getByRole('progressbar')).toHaveCSS('height', '40px');
    await test.info().attach(`achievement-footer-${mobile ? 'mobile' : 'desktop'}-${value}`, { body: await footer.screenshot(), contentType: 'image/png' });
    await expect(page.locator('.course-navigation')).not.toContainText('已完成');
    await expect(page.locator('a[aria-current="page"]').first()).toHaveAttribute('href', path);
    await expect(page.locator('[data-sidebar="header"] .h-0\\.5')).toHaveCount(0);
    if (mobile) await page.keyboard.press('Escape');
  }

  for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
    test(`medal footer More menu and language submenu on ${viewport.name}`, async ({ page, context }) => {
      await page.setViewportSize(viewport);
      await page.goto(path);
      const mobile = viewport.width < 961;
      if (mobile) await page.getByRole('button', { name: '课程目录', exact: true }).click();
      const footer = page.locator('[data-sidebar="footer"]');
      const more = footer.getByRole('button', { name: '更多', exact: true });
      await expect(more).toBeVisible();
      await more.focus(); await more.press('Enter');
      await expect(page.getByRole('menuitem', { name: '关于', exact: true })).toBeFocused();
      await page.keyboard.press('ArrowDown');
      const change = page.getByRole('menuitem', { name: '修改语言', exact: true });
      await expect(change).toBeFocused();
      await expect(change).toHaveCSS('cursor', 'pointer');
      await expect(page.getByRole('menuitem', { name: '关于', exact: true })).toHaveCSS('cursor', 'pointer');
      await page.keyboard.press('ArrowRight');
      const languages = page.locator('[data-slot="dropdown-menu-sub-content"]');
      await expect(languages).toBeVisible();
      await expect(languages.getByRole('menuitem')).toHaveCount(5);
      for (const item of await languages.getByRole('menuitem').all()) await expect(item).toHaveCSS('cursor', 'pointer');
      await expect(languages.locator('a[aria-current="true"]')).toHaveAttribute('hreflang', 'zh-Hans');
      for (const menu of await page.getByRole('menu').all()) {
        const box = await menu.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      }
      const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await test.info().attach(`medal-more-submenu-${viewport.name}`, { body: await page.screenshot(), contentType: 'image/png' });
      const boxes = [await footer.boundingBox(), ...await Promise.all((await page.getByRole('menu').all()).map((menu) => menu.boundingBox()))].filter((box) => box !== null);
      const left = Math.max(0, Math.min(...boxes.map((box) => box.x)) - 8);
      const top = Math.max(0, Math.min(...boxes.map((box) => box.y)) - 8);
      const right = Math.min(viewport.width, Math.max(...boxes.map((box) => box.x + box.width)) + 8);
      const bottom = Math.min(viewport.height, Math.max(...boxes.map((box) => box.y + box.height)) + 8);
      await test.info().attach(`medal-more-detail-${viewport.name}`, { body: await page.screenshot({ clip: { x: left, y: top, width: right - left, height: bottom - top } }), contentType: 'image/png' });
      await page.keyboard.press('ArrowLeft');
      await expect(languages).toHaveCount(0);
      await expect(change).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(more).toBeFocused();
      if (mobile) await expect(page.locator('[data-mobile="true"]')).toBeVisible();
      await more.click(); await page.getByRole('menuitem', { name: '修改语言', exact: true }).click();
      await page.locator('[data-slot="dropdown-menu-sub-content"] a[hreflang="en"]').click();
      await expect(page).toHaveURL(/\/courses\/ai-101\/what-a-language-model-does$/);
      expect((await context.cookies()).find((cookie) => cookie.name === localeCookie)?.value).toBe('en');
      if (mobile) await page.getByRole('button', { name: 'Course navigation', exact: true }).click();
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('menuitem', { name: 'About', exact: true }).click();
      await expect(page).toHaveURL(/\/about$/);
    });

    test(`achievement unlock, retry, keyboard, and persistence on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(path);
      const challenge = page.locator(block);
      await expect(challenge.getByRole('radio', { name: correct })).toBeEnabled();
      await expect(challenge.getByText('成就挑战', { exact: true })).toBeVisible();
      await expect(challenge.getByText('成就挑战', { exact: true }).locator('..')).toContainText('🥇');
      await expect(challenge.getByRole('heading')).toHaveCount(0);
      await expect(challenge.getByRole('group')).toContainText('下面哪种理解更准确');
      await expect(challenge.getByText('说得这么具体，就能信吗？', { exact: true })).toHaveCount(0);
      const frameStyles = (element: Element) => {
        const style = getComputedStyle(element);
        return { border: style.border, radius: style.borderRadius, shadow: style.boxShadow };
      };
      expect(await challenge.evaluate(frameStyles)).toEqual(await page.locator('article blockquote, article [data-component="chat"]').first().evaluate(frameStyles));
      const choices = challenge.getByRole('radio');
      const firstChoice = await choices.nth(0).boundingBox();
      const secondChoice = await choices.nth(1).boundingBox();
      expect(secondChoice!.y).toBeGreaterThan(firstChoice!.y + firstChoice!.height);
      await expectCount(page, 0);
      await expect(page.locator('.completion-box')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /标记为已完成|取消完成标记/ })).toHaveCount(0);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(challenge).toHaveAttribute('data-state', 'locked');
      await challenge.scrollIntoViewIfNeeded();
      await test.info().attach(`achievement-before-${viewport.name}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      await test.info().attach(`achievement-card-before-${viewport.name}`, { body: await challenge.screenshot(), contentType: 'image/png' });
      await challenge.getByRole('radio', { name: '回答这么具体，说明它知道广州的真实天气。' }).click();
      await expect(challenge.getByRole('status')).toContainText('回答不正确');
      await expect(challenge.getByRole('status')).toContainText('具体的回答也可能只是生成结果，不能证明模型查过天气');
      await expect(challenge.getByRole('radio').first()).toBeChecked();
      await expect(challenge.getByRole('radio').first()).toHaveAttribute('aria-invalid', 'true');
      await expect(challenge.locator('[data-answer-feedback="incorrect"]')).toHaveCSS('border-top-width', '1px');
      const questionAccessibility = await new AxeBuilder({ page }).include(block).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(questionAccessibility.violations).toEqual([]);
      await test.info().attach(`achievement-wrong-answer-${viewport.name}`, { body: await challenge.screenshot(), contentType: 'image/png' });
      await expectCount(page, 0);
      const answer = challenge.getByRole('radio', { name: correct });
      if (viewport.name === 'narrow') {
        await challenge.getByRole('radio').first().focus();
        await challenge.getByRole('radio').first().press('ArrowDown');
      } else {
        await answer.focus();
        await answer.press('Space');
      }
      await expect(challenge).toHaveAttribute('data-state', 'unlocked');
      await expect(challenge.getByRole('status')).toContainText('回答正确');
      await expect(challenge.getByText('具体的回答也可能只是生成结果，不能证明模型查过天气。生成回答和查证事实，是两件事。', { exact: true })).toHaveCount(0);
      await expect(challenge.getByText('下次看到 AI 给出具体数字，你知道先确认它的数据来源。', { exact: true })).toBeVisible();
      await expect(challenge.getByRole('heading')).toHaveText('🥇 成就已解锁 · 分清生成与查证');
      await expect(challenge.getByRole('heading')).toBeFocused();
      await expect(challenge.getByRole('radio')).toHaveCount(0);
      await expect(challenge.getByRole('button', { name: '查看成就', exact: true })).toHaveCount(0);
      await expect(challenge.getByRole('button', { name: '再试一次', exact: true })).toBeVisible();
      await test.info().attach(`achievement-correct-answer-${viewport.name}`, { body: await challenge.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      const correctAccessibility = await new AxeBuilder({ page }).include(block).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(correctAccessibility.violations).toEqual([]);
      await expectCount(page, 1);
      await expect(challenge.getByRole('radio')).toHaveCount(0);
      const saved = await page.evaluate((key) => localStorage.getItem(key), key);
      expect(saved).not.toBeNull();
      await test.info().attach(`achievement-after-${viewport.name}`, { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
      await test.info().attach(`achievement-card-after-${viewport.name}`, { body: await challenge.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      if (viewport.name === 'mobile') {
        await page.getByRole('button', { name: '课程目录', exact: true }).click();
        await expect(page.locator('[data-mobile="true"]')).toContainText('已解锁 1 项成就');
        await test.info().attach('achievement-mobile-sidebar', { body: await page.screenshot(), contentType: 'image/png' });
        await page.keyboard.press('Escape');
      }
      await page.reload();
      await expect(challenge).toHaveAttribute('data-state', 'unlocked');
      await expect(challenge.getByRole('status')).toBeEmpty();
      expect(await challenge.evaluate((element) => element.getAnimations().length)).toBe(0);
      expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(saved);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lac:v1:ai-101:last')!).lessonId)).toBe('what-a-language-model-does');
      const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }

  for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
    test(`achievement retry preserves earned status on ${viewport.name}`, async ({ page, context }) => {
      await page.setViewportSize(viewport);
      await page.goto(path);
      const challenge = page.locator(block);
      await challenge.getByRole('radio', { name: correct }).click();
      await expect(challenge).toHaveAttribute('data-state', 'unlocked');
      const saved = await page.evaluate((key) => localStorage.getItem(key), key);
      expect(saved).not.toBeNull();
      await challenge.getByRole('button', { name: '再试一次', exact: true }).click();
      await expect(challenge).toHaveAttribute('data-state', 'retrying');
      await expect(challenge.getByText('成就挑战', { exact: true }).locator('..')).toContainText('🥇');
      await expect(challenge.getByRole('radio').first()).toBeFocused();
      expect(await challenge.evaluate((element) => element.getAnimations().length)).toBe(0);
      await expect(challenge.getByRole('status')).toBeEmpty();
      await expect(challenge.locator('input:checked')).toHaveCount(0);
      for (const radio of await challenge.getByRole('radio').all()) await expect(radio).toBeEnabled();
      await expectCount(page, 1);
      const other = await context.newPage();
      await other.goto(path);
      await expect(other.locator(block)).toHaveAttribute('data-state', 'unlocked');
      await expect(other.locator(count)).toContainText('已解锁 1 项成就');
      await page.bringToFront();
      await challenge.getByRole('radio').first().click();
      await expect(challenge.getByRole('status')).toContainText('回答不正确');
      await expect(challenge.getByRole('radio')).toHaveCount(2);
      await expectCount(page, 1);
      await test.info().attach(`achievement-retry-wrong-${viewport.name}`, { body: await challenge.screenshot(), contentType: 'image/png' });
      await challenge.getByRole('radio', { name: correct }).focus();
      await page.keyboard.press('Space');
      await expect(challenge).toHaveAttribute('data-state', 'unlocked');
      await expectCount(page, 1);
      expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(saved);
      await expect(challenge).toHaveAttribute('data-state', 'unlocked');
      const retry = challenge.getByRole('button', { name: '再试一次', exact: true });
      await retry.focus();
      await retry.press('Enter');
      await expect(challenge).toHaveAttribute('data-state', 'retrying');
      await expect(challenge.getByText('成就挑战', { exact: true }).locator('..')).toContainText('🥇');
      await expect(challenge.getByRole('radio').first()).toBeFocused();
      expect(await challenge.evaluate((element) => element.getAnimations().length)).toBe(0);
      await test.info().attach(`achievement-retry-ready-${viewport.name}`, { body: await challenge.screenshot(), contentType: 'image/png' });
      const accessibility = await new AxeBuilder({ page }).include(block).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      await page.reload();
      await expect(challenge).toHaveAttribute('data-state', 'unlocked');
      await expect(challenge.getByRole('button', { name: '再试一次', exact: true })).toBeVisible();
      expect(await challenge.evaluate((element) => element.getAnimations().length)).toBe(0);
      expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(saved);
      await expectCount(page, 1);
      await other.close();
    });
  }

  test('achievement shares tabs and translations without counting legacy or other-course records', async ({ page, context }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lac:v1:ai-101:lesson:what-a-language-model-does', JSON.stringify({ completed: true, updatedAt: '2026-10-01T00:00:00Z' }));
      localStorage.setItem('lac:v1:other-course:achievement:generation-vs-verification', JSON.stringify({ unlockedAt: '2026-10-01T00:00:00Z' }));
      localStorage.setItem('lac:v1:ai-101:achievement:unknown-achievement', JSON.stringify({ unlockedAt: '2026-10-01T00:00:00Z' }));
    });
    await page.goto(path);
    await expect(page.locator(count)).toContainText('已解锁 0 项成就');
    const other = await context.newPage();
    await other.goto(path);
    await expect(other.locator(count)).toContainText('已解锁 0 项成就');
    await page.locator(block).getByRole('radio', { name: correct }).click();
    await expect(other.locator(block)).toHaveAttribute('data-state', 'unlocked');
    await expect(other.locator(count)).toContainText('已解锁 1 项成就');
    await expect(other.locator(block).getByRole('status')).toBeEmpty();
    const labels = { en: '1 achievement unlocked', ja: '1 件の実績を解除', fr: '1 accomplissement débloqué', es: '1 logro desbloqueado' };
    for (const [locale, label] of Object.entries(labels)) {
      await other.goto(localePath(locale as Locale, '/courses/ai-101/what-a-language-model-does'));
      await expect(other.locator(count)).toContainText(label);
      await expect(other.locator(block)).toHaveCount(0);
    }
    expect(await page.evaluate(() => localStorage.getItem('lac:v1:ai-101:lesson:what-a-language-model-does'))).toContain('"completed":true');
    await other.close();
    await page.evaluate((key) => localStorage.removeItem(key), key);
    await page.reload();
    await expect(page.locator(count)).toContainText('已解锁 0 项成就');
  });

  for (const failure of ['blocked-read', 'blocked-write', 'corrupt'] as const) {
    test(`achievement stays usable with ${failure} storage`, async ({ page }) => {
      await page.addInitScript(({ failure, key }) => {
        if (failure === 'blocked-read') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
        if (failure === 'blocked-write') Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
        if (failure === 'corrupt') localStorage.setItem(key, '{broken');
      }, { failure, key });
      await page.goto(path);
      await page.locator(block).getByRole('radio', { name: correct }).click();
      await expect(page.locator(count)).toContainText('已解锁 1 项成就');
      await expect(page.locator(block)).toContainText('成就暂时保存在当前页面，刷新后可能丢失');
      await expect(page.locator('article > .prose')).toContainText('你的输入决定了模型的输出');
      await page.locator(block).getByRole('button', { name: '再试一次', exact: true }).click();
      await expect(page.locator(block)).toHaveAttribute('data-state', 'retrying');
      await page.locator(block).getByRole('radio').first().click();
      await expect(page.locator(block).getByRole('status').first()).toContainText('回答不正确');
      await page.locator(block).getByRole('radio', { name: correct }).click();
      await expect(page.locator(block)).toHaveAttribute('data-state', 'unlocked');
      await expect(page.locator(count)).toContainText('已解锁 1 项成就');
      await expect(page.locator(block)).toContainText('成就暂时保存在当前页面，刷新后可能丢失');
      if (failure === 'corrupt') expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('{broken');
      await test.info().attach(`achievement-${failure}`, { body: await page.locator(block).screenshot(), contentType: 'image/png' });
    });
  }

  test('achievement honors reduced motion and counts an existing unlock once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    const answer = page.locator(block).getByRole('radio', { name: correct });
    await expect(answer).toBeEnabled();
    await answer.evaluate((input: HTMLInputElement) => { input.click(); input.click(); });
    await expect(page.locator(count)).toContainText('已解锁 1 项成就');
    await expect(page.locator(block)).toHaveAttribute('data-state', 'unlocked');
    expect(await page.locator(block).evaluate((element) => element.getAnimations().length)).toBe(0);
  });
});
