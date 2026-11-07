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
  test(`Mermaid fences render readable diagrams on ${scenario.name}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: scenario, javaScriptEnabled: scenario.javaScriptEnabled });
    try {
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      expect((await page.goto('/design/components'))?.status()).toBe(200);
      if (scenario.javaScriptEnabled) await page.evaluate(() => document.fonts.ready);
      if (scenario.name === 'enlarged') await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
      const preview = page.locator('#mermaid');
      const diagrams = preview.locator('[data-component="mermaid"]');
      await expect(diagrams).toHaveCount(3);
      await expect(diagrams.locator('svg.pele-flowchart')).toHaveCount(2);
      await expect(diagrams.locator('svg.pele-sequence')).toHaveCount(1);
      await expect(diagrams.first().locator('title')).toHaveText('Learning flow');
      await expect(diagrams.first().locator('desc')).toHaveText('A question becomes an input, a model response, and a checked result.');
      await expect(diagrams.first()).toContainText('输入问题');
      await expect(diagrams.nth(1)).toContainText('Ask a question');
      await expect(preview.locator('pre code')).toHaveText('flowchart LR\n  A[Literal source] --> B[Still code]');
      await expect(preview.locator('code svg')).toHaveCount(0);
      await expect(preview.locator('script, foreignObject, svg a, svg image')).toHaveCount(0);
      const ids = await preview.locator('[id]').evaluateAll(elements => elements.map(element => element.id));
      expect(new Set(ids).size).toBe(ids.length);
      for (const svg of await diagrams.locator('svg').all()) {
        for (const attribute of ['aria-labelledby', 'aria-describedby']) {
          const references = await svg.getAttribute(attribute);
          for (const id of references?.split(' ') ?? []) await expect(preview.locator(`[id="${id}"]`)).toHaveCount(1);
        }
      }
      const geometry = await diagrams.evaluateAll(elements => elements.map(element => {
        const svg = element.querySelector('svg')!;
        const text = svg.querySelector('text')!;
        return { width: element.clientWidth, scrollWidth: element.scrollWidth, overflow: getComputedStyle(element).overflowX,
          svgWidth: svg.getBoundingClientRect().width, naturalWidth: Number(svg.getAttribute('width')),
          fontSize: getComputedStyle(text).fontSize };
      }));
      for (const diagram of geometry) {
        expect(diagram.overflow).toBe('auto');
        const scale = scenario.name === 'enlarged' ? 1.5 : 1;
        expect(diagram.svgWidth).toBeCloseTo(diagram.naturalWidth * scale, 0);
      }
      const wide = diagrams.last();
      expect(geometry.at(-1)!.scrollWidth).toBeGreaterThan(geometry.at(-1)!.width);
      await expect(wide).toHaveAttribute('tabindex', '0');
      await wide.focus();
      await page.keyboard.down('ArrowRight');
      try { await expect.poll(() => wide.evaluate(element => element.scrollLeft)).toBeGreaterThan(0); }
      finally { await page.keyboard.up('ArrowRight'); }
      await wide.evaluate(element => { element.scrollLeft = 0; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (scenario.javaScriptEnabled) {
        const accessibility = await new AxeBuilder({ page }).include('#mermaid').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(accessibility.violations).toEqual([]);
      }
      expect(errors).toEqual([]);
      await test.info().attach(`mermaid-${scenario.name}`, { body: await preview.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
      await test.info().attach('Mermaid layout and references', { body: JSON.stringify({ scenario, geometry, ids }, null, 2), contentType: 'application/json' });
    } finally { await context.close(); }
  });
}

test('Mermaid authoring CLI rejects invalid diagrams and preserves literal fences', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'The CLI has no browser-specific behavior.');
  test.setTimeout(60000);
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-mermaid-'));
  try {
    cpSync('tests/fixtures', join(root, 'tests/fixtures'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'tests/fixtures/en/ai-coding/foundations/first-change.mdx');
    const original = readFileSync(file, 'utf8');
    const examples = [
      { name: 'flowchart with Chinese and accessibility text', body: '\n```mermaid\nflowchart LR\n accTitle: Learning flow\n accDescr: Input reaches output.\n A[输入] --> B[输出]\n```\n', valid: true },
      { name: 'sequence', body: '\n```mermaid\nsequenceDiagram\n User->>Model: Hello\n```\n', valid: true },
      { name: 'ordinary and nested literal fences', body: '\n```text\nflowchart LR\n A[Unclosed\n```\n\n````mdx\n```mermaid\ninvalid source\n```\n````\n', valid: true },
      { name: 'invalid syntax', body: '\n```mermaid\nflowchart LR\n A[Unclosed\n```\n', valid: false },
      { name: 'unknown diagram', body: '\n```mermaid\nnot a diagram\n```\n', valid: false },
      { name: 'empty diagram', body: '\n```mermaid\n```\n', valid: false },
      { name: 'compiler component is private', body: '\n<MermaidDiagram source="flowchart LR" />\n', valid: false },
    ];
    const evidence = [];
    for (const example of examples) {
      const source = original + example.body;
      writeFileSync(file, source);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/content/check.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '1' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(example.valid);
      if (['invalid syntax', 'unknown diagram', 'empty diagram'].includes(example.name)) {
        const line = source.slice(0, source.lastIndexOf('```mermaid')).split('\n').length;
        expect(output).toContain(`${file}:${line}:1: Invalid Mermaid:`);
      }
      if (example.name === 'compiler component is private') expect(output).toContain('Unknown component: MermaidDiagram');
      evidence.push({ name: example.name, status: result.status, output });
    }
    await test.info().attach('Mermaid authoring CLI', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
