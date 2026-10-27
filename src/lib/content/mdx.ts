/**
 * [INPUT]: Markdown/MDX AST, a local image root, and component allowlist.
 * [OUTPUT]: Supported components, static question-only achievement definitions and option validation, safe headings, references, and authoring errors.
 * [POS]: Syntax validation before trusted local content reaches the compiler.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import type { Root } from 'mdast';
import type { AchievementDefinition, ContentDocument } from './model';
export const supportedComponents = ['Callout', 'JimmyNote', 'Chat', 'ChatMessage', 'Steps', 'Step', 'LLMGenerationDemo', 'MenuComparisonDemo', 'Achievement', 'AchievementOption'] as const;
type Element = {
  name: string; attributes: { type: string; name: string; value: unknown }[];
  children: { type: string; value?: string; name?: string; children?: Element['children'] }[];
};
const achievementFields = ['id', 'title', 'question', 'answer', 'explanation', 'takeaway'] as const;
const stableId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function inspectMarkdown(body: string, file: string) {
  const tree = unified().use(remarkParse).use(remarkGfm).use(remarkMdx).parse(body) as Root;
  const slugger = new GithubSlugger();
  const headings: ContentDocument['headings'] = [];
  const links: ContentDocument['links'] = [];
  const achievements: AchievementDefinition[] = [];
  const options = new Set<unknown>();
  const definitions = new Map<string, string>();
  visit(tree, 'definition', (node) => { definitions.set(node.identifier, node.url); });
  const fail = (message: string) => { throw new Error(`${file}: ${message}`); };
  visit(tree, (node) => {
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
      if (element.name === 'Chat' && element.attributes.length) fail('Chat does not accept attributes');
      if (element.name === 'ChatMessage') {
        const sender = element.attributes.find((attribute) => attribute.name === 'from');
        if (!sender || !['user', 'assistant'].includes(sender.value as string)) fail('ChatMessage requires from="user" or from="assistant"');
        const state = element.attributes.find((attribute) => attribute.name === 'state');
        if (state && !['complete', 'thinking'].includes(state.value as string)) fail('ChatMessage state must be "complete" or "thinking"');
        if (state?.value === 'thinking' && sender?.value !== 'assistant') fail('Only assistant messages support state="thinking"');
      }
      const allowed: readonly string[] = element.name === 'Achievement' ? achievementFields : element.name === 'AchievementOption' ? ['value'] : element.name === 'ChatMessage' ? ['from', 'state'] : ['title', 'type'];
      const attributes: Record<string, string> = {};
      for (const attribute of element.attributes) {
        if (attribute.type !== 'mdxJsxAttribute' || !allowed.includes(attribute.name) || typeof attribute.value !== 'string') {
          fail(`Unsupported attribute on ${element.name}; use static ${allowed.join('/')} strings`);
        }
        if (Object.hasOwn(attributes, attribute.name)) fail(`Duplicate attribute ${attribute.name} on ${element.name}`);
        attributes[attribute.name] = attribute.value as string;
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
  // JSX inside code fences remains ordinary text and never enters this policy.
  return { headings, links, achievements, plainText: toString(tree) };
}
