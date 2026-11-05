/**
 * Notion-style annotation anchors. The document HTML is owned by React; this
 * module only wraps existing text ranges in <mark> elements after mount.
 */

export function highlightAnnotations(container, annotations) {
  clearAnnotationMarks(container);
  if (!annotations.length) return () => {};
  const stream = collectTextStream(container);
  if (!stream.text) return () => {};
  const priority = (annotation) =>
    annotation.kind === 'proofread'
      ? 4
      : annotation.kind === 'link'
        ? 3
        : annotation.kind === 'assist'
          ? 2
          : 1;
  const ordered = [...annotations].sort((a, b) => priority(b) - priority(a));
  const markMatches = [];
  const reviewMatches = [];
  const occupied = [];
  const positions = [];

  for (const annotation of ordered) {
    const quote = compactSpace(annotation.quote || '');
    if (!quote) continue;
    const start = stream.text.indexOf(quote);
    if (start === -1) continue;
    const end = start + quote.length;
    const startPoint = stream.points[start];
    const endPoint = stream.points[end - 1];
    if (!startPoint || !endPoint || startPoint.block !== endPoint.block) continue;
    positions.push({ id: annotation.id, start });
    const overlaps = occupied.some(([from, to]) => start < to && end > from);
    if (annotation.kind === 'review') {
      reviewMatches.push({ annotation, start, end, startPoint, endPoint, wrap: !overlaps });
      if (!overlaps) occupied.push([start, end]);
      continue;
    }
    let match = { start, end, startPoint, endPoint };
    if (overlaps) {
      match = findFreeSegment(quote, start, end, stream, occupied);
      if (!match) continue;
    }
    occupied.push([match.start, match.end]);
    markMatches.push({ annotation, ...match });
  }

  reviewMatches.sort((a, b) => a.start - b.start);
  let reviewNumber = 0;
  for (const match of reviewMatches) {
    reviewNumber += 1;
    match.index = reviewNumber;
    match.display = String(reviewNumber);
    match.markClass = '';
    match.kind = 'review';
  }

  for (const match of markMatches) {
    if (match.annotation.kind === 'assist') {
      match.display = '✦';
      match.markClass = ' tr-annotation-assist';
      match.kind = 'assist';
    } else if (match.annotation.kind === 'link') {
      const type = match.annotation.linkType === 'external' ? 'external' : 'internal';
      match.display = type === 'external' ? '外' : '内';
      match.markClass = ` tr-annotation-link tr-annotation-link-${type}`;
      match.kind = `link-${type}`;
    } else {
      const type = match.annotation.issueType === 'typo' ? 'typo' : 'grammar';
      match.display = type === 'typo' ? '错' : '句';
      match.markClass = ` tr-annotation-proof tr-annotation-proof-${type}`;
      match.kind = type === 'typo' ? 'proofread-typo' : 'proofread-grammar';
    }
  }

  const located = reviewMatches.map((match) => ({
    id: match.annotation.id,
    index: match.index,
    start: match.start,
  }));
  located.sort((a, b) => a.start - b.start);

  const wraps = [...markMatches, ...reviewMatches.filter((match) => match.wrap)];
  wraps.sort((a, b) => b.start - a.start);
  for (const match of wraps) {
    const range = document.createRange();
    range.setStart(match.startPoint.node, match.startPoint.offset);
    range.setEnd(match.endPoint.node, match.endPoint.offset + 1);
    let fragment;
    try {
      fragment = range.extractContents();
    } catch {
      continue;
    }
    const mark = document.createElement('mark');
    mark.className = `tr-annotation${match.markClass}`;
    mark.dataset.annId = match.annotation.id;
    mark.dataset.annKind = match.kind;
    mark.tabIndex = 0;
    mark.setAttribute('role', 'button');
    mark.setAttribute('aria-label', `${match.annotation.category || '审阅'}：${match.annotation.comment || ''}`);
    mark.appendChild(fragment);
    const sup = document.createElement('sup');
    sup.className = 'tr-annotation-index';
    sup.textContent = match.display;
    mark.appendChild(sup);
    range.insertNode(mark);
  }

  located.forEach((item, index) => {
    item.index = index + 1;
  });

  container.dataset.located = JSON.stringify(located.map(({ id, index }) => ({ id, index })));
  container.dataset.positions = JSON.stringify(positions);

  return () => clearAnnotationMarks(container);
}

function clearAnnotationMarks(container) {
  for (const mark of container.querySelectorAll('mark.tr-annotation')) {
    const parent = mark.parentNode;
    if (!parent) continue;
    for (const badge of mark.querySelectorAll('sup.tr-annotation-index')) badge.remove();
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  }
  container.normalize();
  delete container.dataset.located;
  delete container.dataset.positions;
}

export function readAnnotationPositions(container) {
  const raw = container.dataset.positions;
  if (!raw) return [];
  try {
    const items = JSON.parse(raw);
    return items.filter((item) => item && typeof item.id === 'string' && Number.isFinite(item.start));
  } catch {
    return [];
  }
}

export function readLocatedAnnotations(container, annotations) {
  const raw = container.dataset.located;
  if (!raw) return [];
  try {
    const items = JSON.parse(raw);
    const known = new Set(annotations.map((item) => item.id));
    return items.filter((item) => item && known.has(item.id) && Number.isInteger(item.index));
  } catch {
    return [];
  }
}

function findFreeSegment(quote, start, end, stream, occupied) {
  const candidates = [];
  let cursor = 0;
  for (const segment of quote.split(/(?<=[。！？；，、：:,.!?;])\s*/)) {
    if (segment.length < 6) continue;
    const at = quote.indexOf(segment, cursor);
    if (at < 0) continue;
    cursor = at + segment.length;
    candidates.push([start + at, start + at + segment.length]);
  }
  for (let length = Math.min(36, quote.length); length >= 8; length -= 4) {
    for (let offset = 0; offset + length <= quote.length; offset += 4) {
      candidates.push([start + offset, start + offset + length]);
    }
  }
  for (const [from, to] of candidates) {
    if (from < start || to > end) continue;
    if (occupied.some(([left, right]) => from < right && to > left)) continue;
    const startPoint = stream.points[from];
    const endPoint = stream.points[to - 1];
    if (!startPoint || !endPoint || startPoint.block !== endPoint.block) continue;
    return { start: from, end: to, startPoint, endPoint };
  }
  return null;
}

export function collectTextStream(root) {
  const view = root.ownerDocument?.defaultView || globalThis;
  const filter = view.NodeFilter || (typeof NodeFilter !== 'undefined' ? NodeFilter : null);
  const showText = filter?.SHOW_TEXT ?? 4;
  const accept = filter?.FILTER_ACCEPT ?? 1;
  const reject = filter?.FILTER_REJECT ?? 2;
  const walker = (root.ownerDocument || document).createTreeWalker(root, showText, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return reject;
      if (parent.closest('pre, code, script, style, [data-no-annotate], mark.tr-annotation')) {
        return reject;
      }
      return accept;
    },
  });
  const points = [];
  let node;
  while ((node = walker.nextNode())) {
    const value = node.nodeValue || '';
    if (!value) continue;
    const block = blockOf(node);
    for (let index = 0; index < value.length; index += 1) {
      const ch = value[index];
      if (/\s/.test(ch)) continue;
      points.push({ ch, node, offset: index, block });
    }
  }
  return { text: points.map((point) => point.ch).join(''), points };
}

function blockOf(node) {
  const element = node.parentElement;
  if (!element) return null;
  return element.closest('p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, figcaption, .tr-quiz-question') || element;
}

export function normalizeSpace(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

export function compactSpace(value) {
  return String(value == null ? '' : value).replace(/\s+/g, '');
}

export function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}
