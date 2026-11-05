import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { remarkMark } from 'remark-mark-highlight';

const BLOCK_COMPONENTS = new Map([
  ['KeyTakeaway', 'takeaway'],
  ['Callout', 'callout'],
  ['JimmyNote', 'authorNote'],
  ['Steps', 'steps'],
  ['Step', 'step'],
  ['Chat', 'chat'],
  ['ChatMessage', 'chatMessage'],
  ['ChatThinking', 'chatThinking'],
  ['ChatToolCall', 'toolCall'],
  ['ChatMessageSequence', 'demo'],
  ['InlineCitation', 'citation'],
  ['Achievement', 'quiz'],
  ['AchievementOption', 'quizOption'],
]);

const INLINE_COMPONENTS = new Set(['JimmyNoteAnchor', 'InlineCitation']);

const INTERACTIVE = new Set([
  'TokenizationDiagram',
  'TokenProbabilityDiagram',
  'LLMGenerationDemo',
  'LLMPretrainingOverview',
  'LLMSingleRoundTrainingDemo',
  'LLMMultiRoundTrainingDemo',
  'MenuComparisonDemo',
  'NewtonSecondLawDemo',
  'AnimationDemo',
  'MermaidDiagram',
]);

const EMBED_COMPONENTS = new Set(['XEmbed', 'YouTube']);

const COMPONENT_LABELS = {
  takeaway: '要点',
  authorNote: 'Jimmy 的批注',
  chatUser: '你',
  chatAssistant: '模型',
  chatThinking: '思考过程',
  toolCall: '工具调用',
  interactive: '互动组件',
  interactiveHint: '在原站中可交互；审阅视图只保留文字。',
  quiz: '成就挑战',
  correct: '参考答案',
  explanation: '解释',
  takeawayShort: '记住',
  internalLink: '站内链接（审阅视图不跳转）',
};

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkMark);

export function renderTutorial(source, options = {}) {
  const lessonId = options.lessonId || '';
  const clean = stripFrontmatter(String(source || ''));
  let tree;
  try {
    tree = processor.parse(clean);
  } catch (error) {
    return {
      html: `<div class="tr-parse-error">正文解析失败：${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`,
      error: true,
    };
  }
  const ctx = { lessonId, options };
  const html = renderNode(tree, ctx);
  return { html, error: false };
}

export function stripFrontmatter(source) {
  const text = source.replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) return text;
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text);
  return match ? text.slice(match[0].length) : text;
}

function renderNode(node, ctx) {
  if (!node) return '';
  switch (node.type) {
    case 'root':
      return renderChildren(node, ctx);
    case 'paragraph':
      return `<p>${renderChildren(node, ctx)}</p>`;
    case 'heading': {
      const depth = Math.min(6, Math.max(1, node.depth || 2));
      const id = headingId(node);
      return `<h${depth} id="${escapeAttr(id)}">${renderChildren(node, ctx)}</h${depth}>`;
    }
    case 'text':
      return escapeHtml(node.value || '');
    case 'strong':
      return `<strong>${renderChildren(node, ctx)}</strong>`;
    case 'emphasis':
      return `<em>${renderChildren(node, ctx)}</em>`;
    case 'delete':
      return `<del>${renderChildren(node, ctx)}</del>`;
    case 'mark':
      return `<mark class="tr-source-mark">${renderChildren(node, ctx)}</mark>`;
    case 'inlineCode':
      return `<code class="tr-inline-code">${escapeHtml(node.value || '')}</code>`;
    case 'code':
      return renderCode(node);
    case 'blockquote':
      return `<blockquote>${renderChildren(node, ctx)}</blockquote>`;
    case 'thematicBreak':
      return '<hr>';
    case 'break':
      return '<br>';
    case 'list': {
      const tag = node.ordered ? 'ol' : 'ul';
      const start = node.ordered && Number(node.start) > 1 ? ` start="${Number(node.start)}"` : '';
      return `<${tag}${start}>${renderChildren(node, ctx)}</${tag}>`;
    }
    case 'listItem': {
      const checkbox =
        node.checked === true
          ? '<span class="tr-task tr-task-checked" aria-hidden="true" data-no-annotate="1">✓</span>'
          : node.checked === false
            ? '<span class="tr-task" aria-hidden="true" data-no-annotate="1"></span>'
            : '';
      return `<li${node.spread ? ' class="tr-loose-item"' : ''}>${checkbox}${renderChildren(node, ctx)}</li>`;
    }
    case 'link':
      return renderLink(node, ctx);
    case 'image':
      return renderImage(node, ctx);
    case 'table': {
      const rows = node.children || [];
      const head = rows[0] ? renderNode(rows[0], { ...ctx, header: true }) : '';
      const body = rows.slice(1).map((row) => renderNode(row, ctx)).join('');
      return `<div class="tr-table-wrap"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
    }
    case 'tableRow':
      return `<tr>${renderChildren(node, ctx)}</tr>`;
    case 'tableCell': {
      const tag = ctx.header ? 'th' : 'td';
      return `<${tag}>${renderChildren(node, ctx)}</${tag}>`;
    }
    case 'inlineMath':
      return `<code class="tr-math">${escapeHtml(node.value || '')}</code>`;
    case 'math':
      return `<div class="tr-math-block"><code>${escapeHtml(node.value || '')}</code></div>`;
    case 'html':
      return `<code class="tr-raw-html">${escapeHtml(node.value || '')}</code>`;
    case 'mdxJsxFlowElement':
      return renderJsx(node, ctx, true);
    case 'mdxJsxTextElement':
      return renderJsx(node, ctx, false);
    case 'mdxjsEsm':
    case 'definition':
    case 'footnoteDefinition':
      return '';
    case 'mdxFlowExpression':
    case 'mdxTextExpression':
      return '';
    default:
      if (Array.isArray(node.children)) return renderChildren(node, ctx);
      if (typeof node.value === 'string') return escapeHtml(node.value);
      return '';
  }
}

function renderChildren(node, ctx) {
  return (node.children || []).map((child) => renderNode(child, ctx)).join('');
}

function renderCode(node) {
  const lang = node.lang ? String(node.lang).trim() : '';
  const label = lang ? `<span class="tr-code-lang">${escapeHtml(lang)}</span>` : '';
  return `<pre class="tr-code" tabindex="0" role="region" aria-label="${escapeAttr(lang || 'code')}">${label}<code>${escapeHtml(node.value || '')}</code></pre>`;
}

function renderLink(node, ctx) {
  const url = String(node.url || '');
  const children = renderChildren(node, ctx);
  if (/^\/(?!\/)/.test(url)) {
    return `<a href="#" class="tr-internal-link" data-internal-link="${escapeAttr(url)}" title="${escapeAttr(COMPONENT_LABELS.internalLink)}">${children}</a>`;
  }
  if (!/^(https?:|mailto:|#)/i.test(url)) return children;
  return `<a href="${escapeAttr(url)}" target="_blank" rel="noreferrer noopener">${children}</a>`;
}

function renderImage(node, ctx) {
  const raw = String(node.url || '');
  const src = imageSource(raw, ctx.lessonId);
  const alt = String(node.alt || '');
  const title = node.title ? ` title="${escapeAttr(node.title)}"` : '';
  return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${title} loading="lazy" decoding="async">`;
}

function imageSource(raw, lessonId) {
  if (!raw) return '';
  if (/^(https?:|data:)/i.test(raw)) return raw;
  if (raw.startsWith('/api/tutorial-review/asset')) return raw;
  const params = new URLSearchParams();
  params.set('p', raw);
  if (lessonId) params.set('base', lessonId);
  return `/api/tutorial-review/asset?${params.toString()}`;
}

function renderJsx(node, ctx, flow) {
  const name = String(node.name || '');
  if (!name) return renderChildren(node, ctx);

  if (INTERACTIVE.has(name)) {
    return `<div class="tr-embed" data-no-annotate="1"><span class="tr-embed-kicker">${COMPONENT_LABELS.interactive}</span><span class="tr-embed-name">${escapeHtml(name)}</span><span class="tr-embed-hint">${COMPONENT_LABELS.interactiveHint}</span></div>`;
  }

  if (EMBED_COMPONENTS.has(name)) {
    const url = attr(node, 'url') || attr(node, 'href') || attr(node, 'id');
    const label = name === 'YouTube' ? 'YouTube' : '嵌入内容';
    if (url && /^https?:/i.test(url)) {
      return `<a class="tr-embed-link" href="${escapeAttr(url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(label)} ↗</a>`;
    }
    return `<div class="tr-embed" data-no-annotate="1"><span class="tr-embed-kicker">${escapeHtml(label)}</span><span class="tr-embed-hint">原站中可查看嵌入内容。</span></div>`;
  }

  const kind = BLOCK_COMPONENTS.get(name);
  if (kind) return renderComponent(node, ctx, name, kind, flow);

  if (INLINE_COMPONENTS.has(name)) return renderInlineComponent(node, ctx, name);

  const children = renderChildren(node, ctx);
  if (!children) return '';
  return flow ? `<div class="tr-component" data-component="${escapeAttr(name)}">${children}</div>` : children;
}

function renderInlineComponent(node, ctx, name) {
  const children = renderChildren(node, ctx);
  if (name === 'JimmyNoteAnchor') {
    const variant = attr(node, 'variant');
    return `<span class="tr-author-anchor" title="${escapeAttr(COMPONENT_LABELS.authorNote)}" data-author-anchor="1">${children}<span class="tr-author-anchor-mark" aria-hidden="true" data-no-annotate="1">✎</span></span>`;
  }
  if (name === 'InlineCitation') {
    return `<cite class="tr-citation">${children}</cite>`;
  }
  return children;
}

function renderComponent(node, ctx, name, kind, flow) {
  switch (kind) {
    case 'takeaway':
      return `<aside class="tr-takeaway"><div class="tr-component-label">${COMPONENT_LABELS.takeaway}</div>${renderChildren(node, ctx)}</aside>`;
    case 'callout': {
      const title = attr(node, 'title');
      return `<aside class="tr-callout">${title ? `<div class="tr-component-label">${escapeHtml(title)}</div>` : ''}${renderChildren(node, ctx)}</aside>`;
    }
    case 'authorNote':
      return `<aside class="tr-author-note"><div class="tr-component-label">${COMPONENT_LABELS.authorNote}</div>${renderChildren(node, ctx)}</aside>`;
    case 'steps':
      return `<ol class="tr-steps">${renderChildren(node, ctx)}</ol>`;
    case 'step':
      return `<li class="tr-step">${renderChildren(node, ctx)}</li>`;
    case 'chat':
      return `<div class="tr-chat">${renderChildren(node, ctx)}</div>`;
    case 'chatMessage': {
      const from = attr(node, 'from') === 'assistant' ? 'assistant' : 'user';
      const state = attr(node, 'state');
      const who = from === 'assistant' ? COMPONENT_LABELS.chatAssistant : COMPONENT_LABELS.chatUser;
      const body = state === 'thinking'
        ? `<span class="tr-thinking">${COMPONENT_LABELS.chatThinking}…</span>`
        : renderChildren(node, ctx);
      return `<div class="tr-chat-message tr-from-${from}"><span class="tr-chat-who">${who}</span><div class="tr-chat-body">${body}</div></div>`;
    }
    case 'chatThinking':
      return `<details class="tr-thinking-block"><summary>${COMPONENT_LABELS.chatThinking}</summary><div>${renderChildren(node, ctx)}</div></details>`;
    case 'toolCall':
      return `<details class="tr-tool-call"><summary>${COMPONENT_LABELS.toolCall}</summary><div>${renderChildren(node, ctx)}</div></details>`;
    case 'citation':
      return `<cite class="tr-citation">${renderChildren(node, ctx)}</cite>`;
    case 'demo':
      return `<div class="tr-embed" data-no-annotate="1"><span class="tr-embed-kicker">${COMPONENT_LABELS.interactive}</span><span class="tr-embed-name">${escapeHtml(name)}</span><span class="tr-embed-hint">${COMPONENT_LABELS.interactiveHint}</span></div>`;
    case 'quiz':
      return renderQuiz(node, ctx);
    case 'quizOption':
      return '';
    default:
      return renderChildren(node, ctx);
  }
}

function renderQuiz(node, ctx) {
  const title = attr(node, 'title');
  const question = attr(node, 'question');
  const answer = attr(node, 'answer');
  const explanation = attr(node, 'explanation');
  const takeaway = attr(node, 'takeaway');
  const options = (node.children || [])
    .filter((child) => child && child.type === 'mdxJsxFlowElement' && child.name === 'AchievementOption')
    .map((child) => ({
      value: attr(child, 'value') || '',
      html: renderChildren(child, ctx),
    }));
  const optionHtml = options
    .map((option) => {
      const correct = answer && option.value === answer;
      return `<li class="tr-quiz-option${correct ? ' tr-quiz-correct' : ''}"${correct ? ' data-correct="1"' : ''}>${option.html}${correct ? '<span class="tr-quiz-check" aria-hidden="true" data-no-annotate="1">✓</span>' : ''}</li>`;
    })
    .join('');
  return `<section class="tr-quiz"><div class="tr-component-label">${COMPONENT_LABELS.quiz}</div>${title ? `<h4>${escapeHtml(title)}</h4>` : ''}${question ? `<p class="tr-quiz-question">${escapeHtml(question)}</p>` : ''}${optionHtml ? `<ul class="tr-quiz-options">${optionHtml}</ul>` : ''}${explanation ? `<div class="tr-quiz-explain"><span class="tr-quiz-explain-label">${COMPONENT_LABELS.explanation}</span><p>${escapeHtml(explanation)}</p></div>` : ''}${takeaway ? `<div class="tr-quiz-takeaway"><span class="tr-quiz-explain-label">${COMPONENT_LABELS.takeawayShort}</span><p>${escapeHtml(takeaway)}</p></div>` : ''}</section>`;
}

function attr(node, name) {
  const found = (node.attributes || []).find((attribute) => attribute && attribute.name === name);
  if (!found) return '';
  if (typeof found.value === 'string') return found.value;
  if (found.value && typeof found.value.value === 'string') return found.value.value;
  return '';
}

function headingId(node) {
  const text = plainText(node).trim();
  return `tr-h-${slug(text)}`;
}

function plainText(node) {
  if (!node) return '';
  if (typeof node.value === 'string') return node.value;
  return (node.children || []).map(plainText).join('');
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\u3400-\u9fff-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}

export const labels = COMPONENT_LABELS;
