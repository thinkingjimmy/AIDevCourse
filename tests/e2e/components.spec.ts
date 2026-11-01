import { localeCookie, type Locale } from '../../src/lib/i18n/config';
import { localePath } from '../../src/lib/i18n/routing';
import { readCatalog } from '../../src/lib/content/manifest';
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Token encoding diagram', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'The lesson belongs to the published catalog.');

  for (const scenario of [
    { name: 'desktop', width: 1280, height: 960, javaScriptEnabled: true },
    { name: 'narrow', width: 320, height: 844, javaScriptEnabled: true },
    { name: 'enlarged', width: 390, height: 844, javaScriptEnabled: true },
    { name: 'no-js', width: 390, height: 844, javaScriptEnabled: false },
  ]) {
    test(`preserves encoding order and reading on ${scenario.name}`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ baseURL, viewport: scenario, javaScriptEnabled: scenario.javaScriptEnabled });
      try {
        const page = await context.newPage();
        const response = await page.goto('/zh/courses/llm-101/what-is-a-token');
        expect(response?.status()).toBe(200);
        if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
        if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
        const figure = page.getByRole('figure', { name: '文本编码、模型运算与输出解码的过程' });
        await expect(figure).toBeVisible();
        expect(await figure.evaluate((element) => element.previousElementSibling?.textContent)).toContain('每个词元对应一个 ID');
        await expect(figure).toContainText('今天广州的天气如何？');
        await expect(figure).toContainText('词元处理器 Tokenizer');
        const pairs = figure.getByRole('listitem');
        await expect(pairs.locator('dt')).toHaveText(['Token：今天', 'Token：广州', 'Token：的', 'Token：天气', 'Token：如何', 'Token：？']);
        await expect(pairs.locator('dd')).toHaveText(['Token ID：47256', 'Token ID：132426', 'Token ID：1616', 'Token ID：167823', 'Token ID：24608', 'Token ID：4802']);
        await expect(figure).toContainText('Token ID 按原顺序送入模型');
        await expect(figure.getByLabel('输入 Token ID 数组')).toHaveText('[47256, 132426, 1616, 167823, 24608, 4802]');
        await expect(figure.getByLabel('输出 Token ID 数组')).toHaveText('[47256]');
        await expect(figure.getByText('LLM', { exact: true })).toBeVisible();
        await expect(figure).not.toContainText('你输入的文本');
        await expect(figure).not.toContainText('词元与 ID 沿用下文示例');
        const panelStyle = (element: Element) => {
          const style = getComputedStyle(element);
          return { background: style.backgroundColor, color: style.color, padding: style.padding, font: style.font };
        };
        const inputStyle = await figure.getByText('今天广州的天气如何？', { exact: true }).evaluate(panelStyle);
        expect(inputStyle.background).toBe('rgb(244, 244, 245)');
        expect(await figure.getByText('LLM', { exact: true }).evaluate(panelStyle)).toEqual(inputStyle);
        const decoder = figure.getByRole('group', { name: 'Tokenizer 解码' });
        await expect(decoder).toContainText('解码 Decoding');
        await expect(decoder.locator('dt')).toHaveText(['Token ID', 'Token']);
        await expect(decoder.locator('dd')).toHaveText(['47256', '今天']);
        const output = figure.locator('[data-token-output]');
        await expect(output).toHaveText('今天');
        expect(await output.evaluate(panelStyle)).toEqual(inputStyle);
        const order = await figure.evaluate((element) => ({ text: element.textContent ?? '', decoderFits: element.querySelector('[aria-label="Tokenizer 解码"]')!.scrollWidth <= element.querySelector('[aria-label="Tokenizer 解码"]')!.clientWidth }));
        expect(order.text).toMatch(/\[47256, 132426, 1616, 167823, 24608, 4802\].*LLM.*模型输出 Token ID.*\[47256\].*解码 Decoding.*47256.*今天.*呈现给用户.*今天/s);
        expect(order.decoderFits).toBe(true);
        for (const array of await figure.locator('code[aria-label]').all()) {
          expect(await array.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
        }
        const geometry = await figure.evaluate((element) => ({
          figureWidth: element.clientWidth,
          figureScrollWidth: element.scrollWidth,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          cells: [...element.querySelectorAll('li')].map((cell) => ({ text: cell.textContent, width: cell.clientWidth, scrollWidth: cell.scrollWidth })),
        }));
        expect(geometry.figureScrollWidth).toBeLessThanOrEqual(geometry.figureWidth);
        expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewportWidth);
        for (const cell of geometry.cells) expect(cell.scrollWidth).toBeLessThanOrEqual(cell.width);
        if (scenario.javaScriptEnabled) {
          const accessibility = await new AxeBuilder({ page }).include('figure[aria-label="文本编码、模型运算与输出解码的过程"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
          expect(accessibility.violations).toEqual([]);
        }
        await test.info().attach(`token-encoding-${scenario.name}`, { body: await figure.screenshot(), contentType: 'image/png' });
        await test.info().attach('encoding-layout', { body: JSON.stringify(geometry, null, 2), contentType: 'application/json' });
      } finally { await context.close(); }
    });
  }
});

test.describe('ChatMessage', () => {
  for (const viewport of [{ name: 'desktop', width: 1280, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
    test(`renders Markdown and sender alignment on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/design/components');
      const chat = page.locator('#chat');
      const messages = chat.locator('[data-component="chat-message"]');
      await expect(messages).toHaveCount(4);
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
        await page.goto('/zh/courses/llm-101/what-a-language-model-does');
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
        await page.goto('/zh/courses/llm-101/what-a-language-model-does');
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
    await page.goto('/zh/courses/llm-101/what-a-language-model-does');
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
    for (const locale of ['zh', 'en', 'ja', 'fr', 'es'] as const) {
      const title = locale === 'zh' ? '大语言模型是如何生成回答的？' : 'What a language model does';
      const path = localePath(locale as Locale, `/courses/llm-101/what-a-language-model-does`);
      await page.goto(localePath(locale as Locale, `/`));
      await expect(page.locator(`a[href="${path}"]`).first()).toBeVisible();
      await page.goto(localePath(locale as Locale, `/courses/llm-101`));
      await expect(page.getByRole('link', { name: title }).first()).toHaveAttribute('href', path);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lac:v1:llm-101:last') ?? 'null')?.lessonId)).toBe('what-a-language-model-does');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path}$`));
    }
    await page.goto('/zh/courses/llm-101/what-a-language-model-does');
    await test.info().attach('what-a-language-model-does-title-and-navigation', { body: await page.screenshot(), contentType: 'image/png' });
  });

  for (const viewport of [{ name: 'desktop', width: 1280, height: 960 }, { name: 'mobile', width: 390, height: 844 }, { name: 'narrow', width: 320, height: 844 }]) {
    test(`menus use a quote frame and inset trial caption on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/zh/courses/llm-101/what-a-language-model-does');
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
      await expect(menus.locator('figcaption')).toHaveText('🧪 试一试');
      await expect(menus.locator('figcaption [aria-hidden="true"]')).toHaveText('🧪 ');
      await expect(menus.locator('img, label, p, [role="status"]')).toHaveCount(0);
      const frameStyles = (element: Element) => { const style = getComputedStyle(element); return { border: style.border, radius: style.borderRadius, shadow: style.boxShadow }; };
      expect(await menus.evaluate(frameStyles)).toEqual(await page.locator('[data-component="key-takeaway"]').first().evaluate(frameStyles));
      await menus.scrollIntoViewIfNeeded();
      const frame = (await menus.boundingBox())!;
      const caption = (await menus.locator('figcaption').boundingBox())!;
      expect(caption.y + caption.height / 2).toBeCloseTo(frame.y + 1, 0);
      expect(caption.x).toBeGreaterThan(frame.x);
      await test.info().attach(`menu-comparison-closed-${viewport.name}`, {
        body: await page.screenshot({ clip: { x: frame.x - 8, y: frame.y - 16, width: frame.width + 16, height: frame.height + 24 }, animations: 'disabled' }),
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
      const accessibility = await new AxeBuilder({ page }).include('figure[aria-label="两种菜单对比"]').include('[role="menu"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(accessibility.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await test.info().attach(`menu-comparison-${viewport.name}`, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
    });
  }

  test('explanations remain readable without JavaScript', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    try {
      const page = await context.newPage();
      await page.goto('/zh/courses/llm-101/what-a-language-model-does');
      const generation = page.getByRole('figure', { name: '文字接龙演示' });
      await generation.getByText('查看完整生成过程', { exact: true }).click();
      await expect(generation.getByText('按概率采样，本次选中「今」（42%），而非概率最高的「广」（48%）。', { exact: true })).toBeVisible();
      await expect(generation.getByText('最终回答（虚构）：今天广州天气晴朗，温度在 28 ℃。', { exact: true })).toBeVisible();
      await expect(page.getByRole('combobox', { name: '浏览器原生菜单' })).toBeVisible();
      await expect(page.getByRole('figure', { name: '两种菜单对比', exact: true })).toBeVisible();
      await expect(page.getByRole('figure', { name: '两种菜单对比', exact: true }).locator('figcaption')).toHaveText('🧪 试一试');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await test.info().attach('what-a-language-model-does-no-js', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      await page.locator('noscript > details > summary').filter({ hasText: '课程目录' }).click();
      const nativeFooter = page.locator('noscript > details [data-sidebar="footer"]');
      await expect(nativeFooter.getByRole('link', { name: '关于', exact: true })).toBeVisible();
      await nativeFooter.locator('.language-picker summary').click();
      const english = nativeFooter.locator('.language-options a[hreflang="en"]');
      await expect(english).toBeInViewport();
      await english.click();
      await expect(page).toHaveURL(/\/courses\/llm-101\/what-a-language-model-does$/);
      await page.goto('/zh/courses/llm-101/why-model-answers-vary');
      await expect(page.locator('article h1')).toHaveText('为什么同样的问题，模型的回答会不同？');
      await expect(page.locator('article h2')).toHaveCount(6);
      await expect(page.locator('article table')).toHaveCount(5);
      await expect(page.locator('article')).toContainText('所以使用大语言模型时，永远不要认为每次都能得到完全相同的答案。');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await test.info().attach('sampling-no-js-mobile', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      await page.goto('/zh/courses/llm-101/how-language-models-are-trained');
      const achievement = page.locator('[data-achievement="generation-vs-verification"]');
      await achievement.getByText('查看解释', { exact: true }).click();
      await expect(achievement.locator('noscript details p')).toBeVisible();
      await expect(achievement.locator('noscript details p')).toContainText('它生成的回答只是基于训练数据的预测，并不代表真实天气。');
      await expect(achievement.locator('noscript > p')).toHaveText('成就解锁与保存需要 JavaScript，你可以继续阅读。');
      await expect(achievement.getByRole('radio')).toHaveCount(0);
      await test.info().attach('model-training-no-js', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    } finally { await context.close(); }
  });
});

test.describe('Learning achievements', () => {
  test.skip(process.env.CONTENT_TEST === '1', 'The achievement belongs to the published Chinese lesson.');
  const path = '/zh/courses/llm-101/how-language-models-are-trained';
  const key = 'lac:v1:llm-101:achievement:generation-vs-verification';
  const block = '[data-achievement="generation-vs-verification"]';
  const count = '[data-achievement-count]';
  const correct = '它生成了一句天气预报，但这个回答不一定代表真实天气，仍需要查证。';
  const explanation = '正如前文提到那样，模型的训练数据是有时间限制的，它无法获取训练数据之后的信息。在没有接入天气数据情况下，不可能知道今天广州的天气。它生成的回答只是基于训练数据的预测，并不代表真实天气。';
  const takeaway = '模型的训练数据是有时间限制的，它无法获取训练数据之后的信息。所以，在没有接入天气数据情况下，不可能知道今天广州的天气。';
  async function expectCount(page: Page, value: number) {
    const mobile = (page.viewportSize()?.width ?? 1280) < 961;
    if (mobile) await page.getByRole('button', { name: '课程目录', exact: true }).click();
    await expect(page.locator(count)).toHaveText(`已解锁 ${value} 项成就`);
    const footer = page.locator('[data-sidebar="footer"]');
    await expect(footer.locator(count)).toBeVisible();
    await expect(page.locator('[data-sidebar="header"]').locator(count)).toHaveCount(0);
    const total = readCatalog().courses.find((course) => course.id === 'llm-101')?.achievements.length ?? 0;
    await expect(footer.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(total ? value / total * 100 : 0));
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
      await page.goto('/zh/courses/llm-101/what-a-language-model-does');
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
      const accessibility = await new AxeBuilder({ page }).include('[data-sidebar="footer"]').include('[role="menu"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
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
      await expect(page).toHaveURL(/\/courses\/llm-101\/what-a-language-model-does$/);
      expect((await context.cookies()).find((cookie) => cookie.name === localeCookie)?.value).toBe('en');
      if (mobile) await page.getByRole('button', { name: 'Course navigation', exact: true }).click();
      await page.getByRole('button', { name: 'More', exact: true }).click();
      await page.getByRole('menuitem', { name: 'About', exact: true }).click();
      await expect(page).toHaveURL(/\/about$/);
    });

    test(`achievement unlock, retry, keyboard, and persistence on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const frameStyles = (element: Element) => { const style = getComputedStyle(element); return { border: style.border, radius: style.borderRadius, shadow: style.boxShadow }; };
      await page.goto('/zh/courses/llm-101/what-a-language-model-does');
      const quoteFrame = await page.locator('article [data-component="chat"]').first().evaluate(frameStyles);
      await page.goto(path);
      const challenge = page.locator(block);
      await expect(challenge.getByRole('radio', { name: correct })).toBeEnabled();
      await expect(challenge.getByText('成就挑战', { exact: true })).toBeVisible();
      await expect(challenge.getByText('成就挑战', { exact: true }).locator('..')).toContainText('🥇');
      await expect(challenge.getByRole('heading')).toHaveCount(0);
      await expect(challenge.getByRole('group')).toContainText('下面哪种理解更准确');
      await expect(challenge.getByText('说得这么具体，就能信吗？', { exact: true })).toHaveCount(0);
      expect(await challenge.evaluate(frameStyles)).toEqual(quoteFrame);
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
      await expect(challenge.getByRole('status')).toContainText(explanation);
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
      await expect(challenge.getByText(explanation, { exact: true })).toHaveCount(0);
      await expect(challenge.getByText(takeaway, { exact: true })).toBeVisible();
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
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lac:v1:llm-101:last')!).lessonId)).toBe('how-language-models-are-trained-part-1');
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
      localStorage.setItem('lac:v1:llm-101:lesson:what-a-language-model-does', JSON.stringify({ completed: true, updatedAt: '2026-10-01T00:00:00Z' }));
      localStorage.setItem('lac:v1:other-course:achievement:generation-vs-verification', JSON.stringify({ unlockedAt: '2026-10-01T00:00:00Z' }));
      localStorage.setItem('lac:v1:llm-101:achievement:unknown-achievement', JSON.stringify({ unlockedAt: '2026-10-01T00:00:00Z' }));
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
      await other.goto(localePath(locale as Locale, '/courses/llm-101/what-a-language-model-does'));
      await expect(other.locator(count)).toContainText(label);
      await expect(other.locator(block)).toHaveCount(0);
    }
    expect(await page.evaluate(() => localStorage.getItem('lac:v1:llm-101:lesson:what-a-language-model-does'))).toContain('"completed":true');
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
      await expect(page.locator('article > .prose')).toContainText('模型的训练数据是有时间限制的');
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
