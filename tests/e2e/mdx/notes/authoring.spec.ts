import { test, expect } from '@playwright/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('JimmyNote authoring rejects broken, empty, and ambiguous pairs', async ({ browserName }) => {
  test.skip(browserName !== 'chromium', 'The authoring CLI is independent of the browser.');
  test.setTimeout(60000);
  const root = mkdtempSync(join(tmpdir(), 'aidevcourse-notes-'));
  try {
    cpSync('content', join(root, 'content'), { recursive: true });
    cpSync('public', join(root, 'public'), { recursive: true });
    const file = join(root, 'content/en/llm-101/model-fundamentals/what-a-language-model-does.mdx');
    const original = readFileSync(file, 'utf8') + '\n## First change\n';
    const pair = '\nRead <JimmyNoteAnchor id="context">this text</JimmyNoteAnchor>.\n\n<JimmyNote anchor="context">\n**Context** and [a link](#first-change).\n</JimmyNote>\n';
    const image = '![An illustration.](/images/brand/wordmark.svg)';
    const imagePair = `\n<JimmyNoteAnchor id="illustration" variant="image">\n\n${image}\n\n</JimmyNoteAnchor>\n\n<JimmyNote anchor="illustration">\nAn illustration credit.\n</JimmyNote>\n`;
    const embedPair = pair.replace('**Context** and [a link](#first-change).', '<XEmbed url="https://x.com/API/status/133640144317198338" />');
    const cases = [
      { name: 'paired rich note', body: pair.replace('[a link](#first-change)', '`code`'), valid: true },
      { name: 'X-only note', body: embedPair, valid: true },
      { name: 'YouTube-only note', body: embedPair.replace('<XEmbed url="https://x.com/API/status/133640144317198338" />', '<YouTube url="https://youtu.be/M7lc1UVf-VE" />'), valid: true },
      { name: 'multiple embeds without text', body: embedPair.replace('</JimmyNote>', '\n<YouTube url="https://youtu.be/M7lc1UVf-VE" />\n</JimmyNote>'), valid: true },
      { name: 'text and embed note', body: embedPair.replace('<XEmbed', 'Original post.\n\n<XEmbed'), valid: true },
      { name: 'invalid embedded post', body: embedPair.replace('/status/133640144317198338', ''), valid: false, error: 'XEmbed requires a valid HTTPS X post URL' },
      { name: 'embed with content', body: embedPair.replace(' />', '>\nUnexpected text\n</XEmbed>'), valid: false, error: 'XEmbed does not accept children' },
      { name: 'embed without its anchor', body: embedPair.slice(embedPair.indexOf('<JimmyNote anchor=')), valid: false, error: 'Missing JimmyNoteAnchor' },
      { name: 'manual embed-only flag', body: embedPair.replace('anchor="context"', 'anchor="context" embedOnly="true"'), valid: false, error: 'Unsupported attribute on JimmyNote' },
      { name: 'whitespace-only note', body: embedPair.replace(/<XEmbed[^>]+\/>/, '  \n'), valid: false, error: 'JimmyNote requires text or an embed' },
      { name: 'empty wrapper', body: embedPair.replace(/<XEmbed[^>]+\/>/, '<Callout />'), valid: false, error: 'JimmyNote requires text or an embed' },
      { name: 'paired image credit', body: imagePair, valid: true },
      { name: 'referenced image credit', body: imagePair.replace(image, '![An illustration.][figure]') + '\n[figure]: /images/brand/wordmark.svg\n', valid: true },
      { name: 'missing image note', body: imagePair.split('<JimmyNote anchor=')[0], valid: false, error: 'Missing JimmyNote' },
      { name: 'empty image anchor', body: imagePair.replace(image, ''), valid: false, error: 'requires exactly one image' },
      { name: 'text in an image anchor', body: imagePair.replace(image, 'A paragraph.'), valid: false, error: 'requires exactly one image' },
      { name: 'multiple images in an anchor', body: imagePair.replace(image, `${image}\n\n${image}`), valid: false, error: 'requires exactly one image' },
      { name: 'image without alt text', body: imagePair.replace('An illustration.', ''), valid: false, error: 'Images require meaningful localized alt text' },
      { name: 'inline image anchor', body: imagePair.replace('\n<JimmyNoteAnchor', '\nRead <JimmyNoteAnchor').replace('>\n\n' + image + '\n\n</JimmyNoteAnchor>', '>' + image + '</JimmyNoteAnchor>'), valid: false, error: 'Image JimmyNoteAnchor must be a standalone block' },
      { name: 'unknown anchor variant', body: imagePair.replace('variant="image"', 'variant="video"'), valid: false, error: 'JimmyNoteAnchor variant must be text or image' },
      { name: 'note before its anchor', body: '\n<JimmyNote anchor="context">\nA note.\n</JimmyNote>\n\nRead <JimmyNoteAnchor id="context">this</JimmyNoteAnchor>.\n', valid: true },
      { name: 'manual note number', body: pair.replace('id="context"', 'id="context" noteNumber="9"'), valid: false, error: 'Unsupported attribute on JimmyNoteAnchor' },
      { name: 'literal code', body: '\n```mdx\n<JimmyNote />\n```\n', valid: true },
      { name: 'missing anchor', body: '\n<JimmyNote anchor="context">\nA note.\n</JimmyNote>\n', valid: false, error: 'Missing JimmyNoteAnchor' },
      { name: 'missing note', body: '\nRead <JimmyNoteAnchor id="context">this</JimmyNoteAnchor>.\n', valid: false, error: 'Missing JimmyNote' },
      { name: 'duplicate anchor', body: pair + '\nRead <JimmyNoteAnchor id="context">again</JimmyNoteAnchor>.\n', valid: false, error: 'Duplicate JimmyNoteAnchor' },
      { name: 'duplicate note', body: pair + '\n<JimmyNote anchor="context">\nAnother note.\n</JimmyNote>\n', valid: false, error: 'Duplicate JimmyNote' },
      { name: 'empty note', body: '\nRead <JimmyNoteAnchor id="context">this</JimmyNoteAnchor>.\n\n<JimmyNote anchor="context" />\n', valid: false, error: 'JimmyNote requires text' },
      { name: 'empty anchor', body: '\nRead <JimmyNoteAnchor id="context" />.\n\n<JimmyNote anchor="context">\nA note.\n</JimmyNote>\n', valid: false, error: 'JimmyNoteAnchor requires text' },
      { name: 'inline note', body: '\nRead <JimmyNote anchor="context">a note</JimmyNote>.\n', valid: false, error: 'JimmyNote must be a standalone block' },
      { name: 'block anchor', body: '\n<JimmyNoteAnchor id="context">\nA paragraph.\n</JimmyNoteAnchor>\n', valid: false, error: 'JimmyNoteAnchor must be inline' },
      { name: 'invalid identifier', body: pair.replaceAll('context', 'Not Valid'), valid: false, error: 'stable ASCII identifier' },
    ];
    const evidence = [];
    for (const example of cases) {
      writeFileSync(file, original + example.body);
      const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), join(process.cwd(), 'scripts/check-content.ts')], {
        cwd: root, env: { ...process.env, CONTENT_TEST: '0' }, encoding: 'utf8', timeout: 15000,
      });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
      expect(result.error).toBeUndefined();
      expect(result.status === 0, output).toBe(example.valid);
      if ('error' in example) expect(output).toContain(example.error);
      evidence.push({ name: example.name, status: result.status, output });
    }
    await test.info().attach('JimmyNote authoring results', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});
