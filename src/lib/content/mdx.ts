import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import { remarkMark } from 'remark-mark-highlight';
import { remarkMath, validateMath } from './math';
import { validateMermaid } from './mermaid/render';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import type { Root } from 'mdast';
import type { AchievementDefinition, ContentDocument } from './model';
import { parseXUrl, parseYouTubeUrl } from '../embeds/urls';
export const supportedComponents = ['Callout', 'JimmyNote', 'JimmyNoteAnchor', 'KeyTakeaway', 'Chat', 'ChatMessage', 'ChatThinking', 'ChatToolCall', 'InlineCitation', 'ChatMessageSequence', 'XEmbed', 'YouTube', 'Steps', 'Step', 'LLMGenerationDemo', 'MenuComparisonDemo', 'NewtonSecondLawDemo', 'TokenizationDiagram', 'TokenProbabilityDiagram', 'LLMPretrainingOverview', 'LLMSingleRoundTrainingDemo', 'LLMMultiRoundTrainingDemo', 'Achievement', 'AchievementOption'] as const;
type Element = {
  name: string; attributes: { type: string; name: string; value: unknown }[];
  children: { type: string; value?: string; name?: string; children?: Element['children'] }[];
};
const achievementFields = ['id', 'title', 'question', 'answer', 'explanation', 'takeaway'] as const;
const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function inspectMarkdown(body: string, file: string, lineOffset = 0) {
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMdx).use(remarkMark).use(remarkMath).parse(body) as Root;
  validateMath(tree, file, lineOffset);
  validateMermaid(tree, file, lineOffset);
  const slugger = new GithubSlugger();
  const headings: ContentDocument['headings'] = [];
  const links: ContentDocument['links'] = [];
  const achievements: AchievementDefinition[] = [];
  const noteAnchors = new Set<string>();
  const notes = new Set<string>();
  const options = new Set<unknown>();
  const definitions = new Map<string, string>();
  visit(tree, 'definition', (node) => { definitions.set(node.identifier, node.url); });
  const fail = (message: string) => { throw new Error(`${file}: ${message}`); };
  visit(tree, (node, _index, parent) => {
    if (node.type === 'heading') {
      if (node.depth === 1) fail('Use level-two headings; the lesson title is the only h1');
      const title = toString(node);
      headings.push({ id: slugger.slug(title), title, depth: node.depth });
    }
    if (node.type === 'link' || node.type === 'image') {
      const label = node.type === 'image' ? node.alt ?? '' : toString(node);
      if (node.type === 'image' && !label.trim()) fail('Images require meaningful localized alt text');
      links.push({ url: node.url, image: node.type === 'image', label });
    }
    if (node.type === 'linkReference' || node.type === 'imageReference') {
      const url = definitions.get(node.identifier);
      if (!url) fail(`Unresolved reference: ${node.identifier}`);
      const label = node.type === 'imageReference' ? node.alt ?? '' : toString(node);
      if (node.type === 'imageReference' && !label.trim()) fail('Images require alt text');
      links.push({ url: url!, image: node.type === 'imageReference', label });
    }
    if (['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression', 'html'].includes(node.type)) {
      fail('Imports, expressions, scripts, and raw HTML are not supported in lessons');
    }
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      const element = node as unknown as Element;
      if (!supportedComponents.includes(element.name as typeof supportedComponents[number])) fail(`Unknown component: ${element.name}`);
      if (['ChatMessageSequence', 'LLMPretrainingOverview', 'LLMSingleRoundTrainingDemo', 'LLMMultiRoundTrainingDemo', 'TokenProbabilityDiagram', 'NewtonSecondLawDemo'].includes(element.name)) {
        if (element.attributes.length) fail(`${element.name} does not accept attributes`);
        if (node.type !== 'mdxJsxFlowElement') fail(`${element.name} must be a standalone block`);
        if (element.children.some((child) => child.type !== 'text' || child.value?.trim())) fail(`${element.name} does not accept children`);
      }
      if (['Chat', 'KeyTakeaway'].includes(element.name) && element.attributes.length) fail(`${element.name} does not accept attributes`);
      if (element.name === 'KeyTakeaway') {
        if (node.type === 'mdxJsxTextElement') fail('KeyTakeaway must be a standalone block');
        if (!toString(node).trim()) fail('KeyTakeaway requires text to remember');
      }
      if (element.name === 'ChatMessage') {
        const sender = element.attributes.find((attribute) => attribute.name === 'from');
        if (!sender || !['user', 'assistant'].includes(sender.value as string)) fail('ChatMessage requires from="user" or from="assistant"');
        const state = element.attributes.find((attribute) => attribute.name === 'state');
        if (state && !['complete', 'thinking'].includes(state.value as string)) fail('ChatMessage state must be "complete" or "thinking"');
        if (state?.value === 'thinking' && sender?.value !== 'assistant') fail('Only assistant messages support state="thinking"');
        if (state?.value === 'thinking' && element.children.some((child) => child.type !== 'text' || child.value?.trim())) fail('Thinking state does not accept content; use ChatThinking inside a completed assistant message');
        if (element.children.filter((child) => child.name === 'ChatThinking').length > 1) fail('ChatMessage accepts at most one ChatThinking');
      }
      const activity = element.name === 'ChatThinking' || element.name === 'ChatToolCall';
      if (activity) {
        if (node.type !== 'mdxJsxFlowElement') fail(`${element.name} must be a standalone block`);
        const owner = parent as unknown as Element | undefined;
        const sender = owner?.attributes?.find((attribute) => attribute.name === 'from');
        const state = owner?.attributes?.find((attribute) => attribute.name === 'state');
        if (owner?.name !== 'ChatMessage' || sender?.value !== 'assistant' || state?.value === 'thinking') fail(`${element.name} must be a direct child of a completed assistant ChatMessage`);
        if (!toString(node).trim()) fail(element.name === 'ChatThinking' ? 'ChatThinking requires reasoning content' : 'ChatToolCall requires content');
      }
      const embed = element.name === 'XEmbed' || element.name === 'YouTube';
      const allowed: readonly string[] = embed ? ['url', 'title'] : element.name === 'JimmyNoteAnchor' ? ['id', 'variant'] : element.name === 'JimmyNote' ? ['anchor'] : element.name === 'Achievement' ? achievementFields : element.name === 'AchievementOption' ? ['value'] : element.name === 'ChatMessage' ? ['from', 'state'] : element.name === 'ChatToolCall' ? ['name', 'title', 'defaultOpen'] : element.name === 'ChatThinking' ? ['defaultOpen'] : element.name === 'InlineCitation' ? ['url', 'title', 'description'] : ['title', 'type'];
      const attributes: Record<string, string> = {};
      for (const attribute of element.attributes) {
        if (attribute.type !== 'mdxJsxAttribute' || !allowed.includes(attribute.name)) fail(`Unsupported attribute on ${element.name}; use static ${allowed.join('/')} values`);
        if (Object.hasOwn(attributes, attribute.name)) fail(`Duplicate attribute ${attribute.name} on ${element.name}`);
        if (activity && attribute.name === 'defaultOpen') {
          const value = attribute.value as { type?: string; value?: string } | null;
          if (value !== null && (typeof value !== 'object' || value.type !== 'mdxJsxAttributeValueExpression' || !/^(true|false)$/.test(value.value?.trim() ?? ''))) fail(`${element.name} defaultOpen must be a static boolean`);
          attributes.defaultOpen = value === null ? 'true' : value.value!.trim();
          continue;
        }
        if (typeof attribute.value !== 'string') fail(`Unsupported attribute on ${element.name}; use static strings`);
        attributes[attribute.name] = attribute.value as string;
      }
      if (element.name === 'ChatToolCall') {
        for (const field of ['name', 'title']) if (!attributes[field]?.trim()) fail(`ChatToolCall requires a nonempty ${field}`);
      }
      if (element.name === 'InlineCitation') {
        if (node.type !== 'mdxJsxTextElement') fail('InlineCitation must be inline');
        if (element.children.some((child) => child.type !== 'text' || child.value?.trim())) fail('InlineCitation does not accept children');
        let source: URL | undefined;
        try { source = new URL(attributes.url); } catch { /* Report the same URL contract below. */ }
        if (!source || !/^https:\/\//i.test(attributes.url) || source.protocol !== 'https:' || source.username || source.password) fail('InlineCitation requires an absolute HTTPS URL without credentials');
        for (const field of ['title', 'description']) if (attributes[field] !== undefined && !attributes[field].trim()) fail(`InlineCitation ${field} must not be empty`);
        links.push({ url: attributes.url, image: false, label: attributes.title || source!.hostname });
      }
      if (embed) {
        if (node.type !== 'mdxJsxFlowElement') fail(`${element.name} must be a standalone block`);
        if (element.children.some((child) => child.type !== 'text' || child.value?.trim())) fail(`${element.name} does not accept children`);
        if (attributes.title !== undefined && !attributes.title.trim()) fail(`${element.name} title must not be empty`);
        const target = element.name === 'XEmbed' ? parseXUrl(attributes.url ?? '') : parseYouTubeUrl(attributes.url ?? '');
        if (!target) fail(`${element.name} requires a valid HTTPS ${element.name === 'XEmbed' ? 'X post' : 'YouTube video'} URL`);
        links.push({ url: target!.source, image: false, label: attributes.title || element.name });
      }
      if (element.name === 'JimmyNote' || element.name === 'JimmyNoteAnchor') {
        const isAnchor = element.name === 'JimmyNoteAnchor';
        const image = isAnchor && attributes.variant === 'image';
        if (isAnchor && attributes.variant && !['text', 'image'].includes(attributes.variant)) fail('JimmyNoteAnchor variant must be text or image');
        if (image) {
          if (node.type !== 'mdxJsxFlowElement') fail('Image JimmyNoteAnchor must be a standalone block');
          const children = element.children.flatMap((child) => child.type === 'paragraph' ? child.children ?? [] : [child])
            .filter((child) => child.type !== 'text' || child.value?.trim());
          if (children.length !== 1 || !['image', 'imageReference'].includes(children[0].type)) fail('Image JimmyNoteAnchor requires exactly one image');
        } else if (isAnchor && node.type !== 'mdxJsxTextElement') fail('JimmyNoteAnchor must be inline');
        if (!isAnchor && node.type !== 'mdxJsxFlowElement') fail('JimmyNote must be a standalone block');
        if (!image && !toString(node).trim()) fail(`${element.name} requires text`);
        const id = attributes[isAnchor ? 'id' : 'anchor'];
        if (!stableId.test(id ?? '')) fail(`${element.name} requires a stable ASCII identifier`);
        const ids = isAnchor ? noteAnchors : notes;
        if (ids.has(id)) fail(`Duplicate ${element.name}: ${id}`);
        ids.add(id);
      }
      if (element.name === 'AchievementOption') {
        if (!options.has(node)) fail('AchievementOption must be a direct child of Achievement');
        if (!stableId.test(attributes.value ?? '')) fail('AchievementOption requires a stable value');
      }
      if (element.name === 'Achievement') {
        for (const field of achievementFields) if (!attributes[field]?.trim()) fail(`Achievement requires ${field}`);
        if (!stableId.test(attributes.id) || !stableId.test(attributes.answer)) fail('Achievement id and answer must be stable ASCII identifiers');
        if (achievements.some((item) => item.id === attributes.id)) fail(`Duplicate achievement ID ${attributes.id}`);
        const choices: AchievementDefinition['options'] = [];
        for (const child of element.children.flatMap((item) => item.type === 'paragraph' ? item.children ?? [] : [item])) {
          if (child.type === 'text' && !child.value?.trim()) continue;
          if (!['mdxJsxFlowElement', 'mdxJsxTextElement'].includes(child.type) || child.name !== 'AchievementOption') fail('Achievement accepts only direct AchievementOption children');
          const option = child as unknown as Element;
          // Plain labels keep the displayed radio text identical to the validated definition.
          const plain = (children: Element['children']): boolean => children.every((item) => item.type === 'text' || item.type === 'paragraph' && plain(item.children ?? []));
          if (!plain(option.children)) fail('AchievementOption requires a plain text label');
          const label = toString(child as Parameters<typeof toString>[0]).replace(/\s+/g, ' ').trim();
          if (!label) fail('AchievementOption requires a nonempty label');
          const value = option.attributes.find((attribute) => attribute.name === 'value')?.value;
          if (typeof value !== 'string' || !stableId.test(value)) fail('AchievementOption requires a stable value');
          if (choices.some((choice) => choice.value === value)) fail(`Duplicate achievement option ${value}`);
          choices.push({ value: value as string, label });
          options.add(child);
        }
        if (choices.length < 2) fail('Achievement requires at least two options');
        if (!choices.some((choice) => choice.value === attributes.answer)) fail('Achievement answer must match an option value');
        achievements.push({ ...Object.fromEntries(achievementFields.map((field) => [field, attributes[field]])), options: choices } as AchievementDefinition);
      }
    }
  });
  for (const id of notes) if (!noteAnchors.has(id)) fail(`Missing JimmyNoteAnchor: ${id}`);
  for (const id of noteAnchors) if (!notes.has(id)) fail(`Missing JimmyNote: ${id}`);
  // JSX inside code fences remains ordinary text and never enters this policy.
  return { headings, links, achievements, hasJimmyNotes: notes.size > 0, plainText: toString(tree) };
}
