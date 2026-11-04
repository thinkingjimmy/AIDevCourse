/**
 * Notion-style annotation anchors. The document HTML is owned by React; this
 * module only wraps existing text ranges in <mark> elements after mount.
 */

export function highlightAnnotations(container, annotations) {
  if (!annotations.length) return () => {};
  const stream = collectTextStream(container);
  if (!stream.text) return () => {};
  const matches = [];
  const occupied = [];

  for (const annotation of annotations) {
    const quote = normalizeSpace(annotation.quote || '');
    if (!quote) continue;
    const start = stream.text.indexOf(quote);
    if (start === -1) continue;
    const end = start + quote.length;
    if (occupied.some(([from, to]) => start < to && end > from)) continue;
    const startPoint = stream.points[start];
    const endPoint = stream.points[end - 1];
    if (!startPoint || !endPoint || startPoint.block !== endPoint.block) continue;
    occupied.push([start, end]);
    matches.push({ annotation, start, end, startPoint, endPoint });
  }

  matches.sort((a, b) => b.start - a.start);
  const located = [];

  for (const match of matches) {
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
    mark.className = 'tr-annotation';
    mark.dataset.annId = match.annotation.id;
    mark.tabIndex = 0;
    mark.setAttribute('role', 'button');
    mark.setAttribute('aria-label', `${match.annotation.category || '审阅'}：${match.annotation.comment || ''}`);
    mark.appendChild(fragment);
    const sup = document.createElement('sup');
    sup.className = 'tr-annotation-index';
    sup.textContent = '';
    mark.appendChild(sup);
    range.insertNode(mark);
    located.push({ id: match.annotation.id, start: match.start });
  }

  located.sort((a, b) => a.start - b.start);
  located.forEach((item, index) => {
    item.index = index + 1;
    const mark = container.querySelector(`mark.tr-annotation[data-ann-id="${cssEscape(item.id)}"]`);
    const sup = mark?.querySelector('sup.tr-annotation-index');
    if (sup) sup.textContent = String(index + 1);
  });

  container.dataset.located = JSON.stringify(located.map(({ id, index }) => ({ id, index })));

  return () => {
    for (const mark of container.querySelectorAll('mark.tr-annotation')) {
      const parent = mark.parentNode;
      if (!parent) continue;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    }
    container.normalize();
    delete container.dataset.located;
  };
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
  let lastSpace = false;
  while ((node = walker.nextNode())) {
    const value = node.nodeValue || '';
    if (!value.trim()) {
      if (points.length && !lastSpace) {
        points.push({ ch: ' ', node, offset: Math.max(0, value.length - 1), block: blockOf(node) });
        lastSpace = true;
      }
      continue;
    }
    const block = blockOf(node);
    for (let index = 0; index < value.length; index += 1) {
      const ch = value[index];
      if (/\s/.test(ch)) {
        if (lastSpace) continue;
        points.push({ ch: ' ', node, offset: index, block });
        lastSpace = true;
      } else {
        points.push({ ch, node, offset: index, block });
        lastSpace = false;
      }
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

export function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}
