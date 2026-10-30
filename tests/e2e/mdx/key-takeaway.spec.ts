import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

for (const scenario of [
  { name: 'desktop', width: 1280, height: 960, javaScriptEnabled: true },
  { name: 'narrow', width: 320, height: 844, javaScriptEnabled: true },
  { name: 'enlarged', width: 390, height: 844, javaScriptEnabled: true },
  { name: 'no-js', width: 390, height: 844, javaScriptEnabled: false },
]) {
  test(`KeyTakeaway emphasizes memory on ${scenario.name}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: scenario, javaScriptEnabled: scenario.javaScriptEnabled });
    try {
      const page = await context.newPage();
      const response = await page.goto('/design/components');
      expect(response?.status()).toBe(200);
      if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const section = page.locator('#key-takeaways');
      const notes = section.getByRole('note', { name: '划重点', exact: true });
      await expect(notes).toHaveCount(2);
      await expect(notes.first().locator('[data-slot="alert-description"] strong')).toHaveText('模型生成的是下一个 Token，而不是一次性生成整段回答。');
      await expect(notes.nth(1).locator('mark')).toHaveText('生成答案不等于核实事实');
      await expect(notes.nth(1).getByRole('listitem')).toHaveCount(2);
      await expect(notes.nth(1).locator('[data-slot="alert-description"] code')).toHaveText('Token');
      await expect(notes.locator('img')).toHaveCount(0);
      const frameStyle = (element: Element) => {
        const style = getComputedStyle(element);
        return { border: style.border, radius: style.borderRadius, shadow: style.boxShadow, background: style.backgroundColor, color: style.color };
      };
      const reference = await page.getByRole('note', { name: 'Jimmy', exact: true }).first().evaluate(frameStyle);
      const evidence = [];
      for (const note of await notes.all()) {
        expect(await note.evaluate(frameStyle)).toEqual(reference);
        await expect(note.locator('[data-slot="alert-title"]')).toHaveText('划重点');
        const layout = await note.evaluate((element) => {
          const frame = element.getBoundingClientRect();
          const label = element.querySelector('[data-slot="note-signature"]')!.getBoundingClientRect();
          const content = element.querySelector('[data-slot="alert-description"]')!.getBoundingClientRect();
          const parent = element.parentElement!.getBoundingClientRect();
          return { width: frame.width, parentWidth: parent.width, left: frame.left, parentLeft: parent.left,
            labelCenter: label.top + label.height / 2, frameTop: frame.top, borderTop: parseFloat(getComputedStyle(element).borderTopWidth), labelBottom: label.bottom, contentTop: content.top,
            fits: element.scrollWidth <= element.clientWidth };
        });
        expect(layout.fits).toBe(true);
        expect(Math.abs(layout.width - layout.parentWidth)).toBeLessThan(1);
        expect(Math.abs(layout.left - layout.parentLeft)).toBeLessThan(1);
        expect(Math.abs(layout.labelCenter - layout.frameTop - layout.borderTop)).toBeLessThan(0.1);
        expect(layout.contentTop).toBeGreaterThan(layout.labelBottom);
        evidence.push(layout);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('#key-takeaways').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      const screenshot = test.info().outputPath(`key-takeaway-${scenario.name}.png`);
      await section.screenshot({ path: screenshot, animations: 'disabled', style: 'header, a[href="#main"] { visibility: hidden !important; }' });
      await test.info().attach('Key takeaway preview', { path: screenshot, contentType: 'image/png' });
      await test.info().attach('Key takeaway layout', { body: JSON.stringify({ reference, notes: evidence }, null, 2), contentType: 'application/json' });
      await notes.nth(1).getByRole('link', { name: '写作说明' }).click();
      await expect(page).toHaveURL(/#authoring$/);
      await expect(page.locator('#authoring')).toBeInViewport();
    } finally { await context.close(); }
  });
}

test('KeyTakeaway authoring accepts memory blocks and rejects invalid declarations', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'The authoring CLI is independent of the browser.');
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-key-takeaway-'));
  try {
    cpSync('tests/fixtures', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'content/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    const examples = [
      { name: 'rich memory block', body: '\n<KeyTakeaway>\n**Remember** the `input`.\n\n- Keep a source.\n- Verify a claim.\n</KeyTakeaway>\n', valid: true },
      { name: 'literal code', body: '\n```mdx\n<KeyTakeaway />\n```\n', valid: true },
      { name: 'empty block', body: '\n<KeyTakeaway />\n', valid: false, error: 'requires text to remember' },
      { name: 'inline block', body: '\nKeep <KeyTakeaway>this</KeyTakeaway> in mind.\n', valid: false, error: 'must be a standalone block' },
      { name: 'custom label', body: '\n<KeyTakeaway title="Remember">A conclusion.</KeyTakeaway>\n', valid: false, error: 'does not accept attributes' },
    ];
    const evidence = [];
    for (const example of examples) {
      writeFileSync(file, original + example.body);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(example.valid);
      if (example.error) expect(output).toContain(example.error);
      evidence.push({ name: example.name, status: result.status, output });
    }
    await test.info().attach('Key takeaway authoring', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
