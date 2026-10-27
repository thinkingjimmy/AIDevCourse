/**
 * [INPUT]: Generation tracks with content-sized panels, the local timeline, browser lifecycle APIs, and motion preference.
 * [OUTPUT]: animateGeneration mount/cleanup lifecycle with automatic generation and embedded playback actions.
 * [POS]: Animation driver for LLMGenerationDemo; React owns mounting while this module owns animated descendants.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import { answer, answerParts, generationFrame, pendingClass, placeholderClass, question, symbol, totalDuration, wordClass, type GenerationFrame } from './model';

export function animateGeneration(root: HTMLElement) {
  const find = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const paper = find('[data-paper]');
  const sheet = find('[data-sheet]');
  const current = find('[data-current]');
  const previous = find('[data-previous]');
  const draft = find('[data-draft]');
  const currentPrefix = find('[data-current-prefix]');
  const draftPrefix = find('[data-generation-output]');
  const questionTail = find('[data-question-tail]');
  const landing = find('[data-landing]');
  const candidates = [...root.querySelectorAll<HTMLElement>('[data-candidate]')];
  const candidateGroup = find('[data-candidates]');
  const calculation = find('[data-calculation]');
  const flight = find('[data-flight]');
  const pause = find<HTMLButtonElement>('[data-action="pause"]');
  const replay = find<HTMLButtonElement>('[data-action="replay"]');
  const announcement = find('[data-announcement]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed = reduced.matches ? totalDuration : 0;
  let playing = !reduced.matches;
  let visible = false;
  let disposed = false;
  let lastTime: number | null = null;
  let request = 0;
  let lastKey = '';
  let dirty = true;
  let rowHeight = 96;
  let gap = 14;
  let shift = 0;
  let drop = { x: 0, y: 0, targetX: 0, targetY: 0 };

  function writePrefix(element: HTMLElement, text: string, pending = false) {
    const key = `${pending}:${text}`;
    if (element.dataset.content === key) return;
    element.dataset.content = key;
    element.replaceChildren();
    if (pending) {
      questionTail.textContent = question.slice(-3);
      questionTail.className = wordClass;
    }
    let remaining = text.length;
    for (const part of answerParts) {
      const chunk = part.slice(0, remaining);
      if (!chunk) break;
      const word = document.createElement('span');
      word.className = wordClass;
      word.textContent = chunk;
      element.append(word);
      remaining -= chunk.length;
    }
    if (pending) {
      const tail = element.lastElementChild ?? questionTail;
      tail.className = pendingClass;
      const placeholder = document.createElement('span');
      placeholder.className = placeholderClass;
      placeholder.dataset.placeholder = '';
      placeholder.setAttribute('aria-hidden', 'true');
      tail.append(placeholder);
    }
    if (element === draftPrefix) (element.lastElementChild ?? element).append(landing);
  }

  function measure() {
    const panel = find('[data-current] [data-row-content]');
    const style = getComputedStyle(panel);
    const padding = parseFloat(style.paddingTop);
    const stacked = style.gridTemplateColumns.split(' ').length === 1;
    const inputHeight = find('[data-current] [data-input-row]').getBoundingClientRect().height;
    const candidateHeight = parseFloat(getComputedStyle(candidates[0]).minHeight);
    const draftHeight = find('[data-draft] [data-input-row]').getBoundingClientRect().height;
    const activeHeight = stacked ? inputHeight + candidateHeight + parseFloat(style.rowGap) : Math.max(inputHeight, candidateHeight);
    rowHeight = Math.ceil(Math.max(activeHeight, draftHeight) + padding * 2);
    paper.style.setProperty('--row-height', `${rowHeight}px`);
    gap = parseFloat(getComputedStyle(sheet).rowGap);
    const historyShift = (height: number) => Math.max(0, Math.min(rowHeight / 4, (rowHeight - height) / 2));
    shift = historyShift(panel.getBoundingClientRect().height);
    const previousShift = historyShift(find('[data-previous] [data-row-content]').getBoundingClientRect().height);
    for (const child of previous.children) (child as HTMLElement).style.transform = `translateY(${previousShift}px)`;
    dirty = false;
  }

  function render(frame: GenerationFrame) {
    if (frame.complete) playing = false;
    if (root.dataset.playing !== String(playing)) root.dataset.playing = String(playing);
    if (pause.hidden !== frame.complete) pause.hidden = frame.complete;
    const pauseLabel = playing ? '暂停' : '继续播放';
    if (pause.textContent !== pauseLabel) pause.textContent = pauseLabel;
    const key = `${frame.index}:${frame.phase}:${frame.copied}`;
    if (key !== lastKey) {
      lastKey = key;
      root.dataset.complete = String(frame.complete);
      root.dataset.round = String(frame.index + 1);
      root.dataset.phase = frame.phase;
      root.dataset.generated = String(frame.index + (frame.dropped ? 1 : 0));
      previous.style.visibility = frame.index > 0 ? 'visible' : 'hidden';
      writePrefix(find('[data-previous-prefix]'), answer.slice(0, Math.max(0, frame.index - 1)).join(''));
      find('[data-previous-round]').textContent = `第 ${frame.index} 轮`;
      find('[data-previous-short]').textContent = String(frame.index).padStart(2, '0');
      writePrefix(currentPrefix, frame.prefix, true);
      find('[data-current-round]').textContent = `第 ${frame.index + 1} 轮`;
      find('[data-current-short]').textContent = String(frame.index + 1).padStart(2, '0');
      writePrefix(draftPrefix, frame.nextPrefix);
      draft.style.visibility = frame.copied ? 'visible' : 'hidden';
      find('[data-draft-round]').textContent = frame.complete ? '回答' : `第 ${frame.index + 2} 轮`;
      find('[data-draft-short]').textContent = frame.complete ? '答' : String(frame.index + 2).padStart(2, '0');
      candidates.forEach((element, index) => {
        const candidate = frame.candidates[index];
        const letter = element.querySelector<HTMLElement>('[data-letter]')!;
        letter.textContent = symbol(candidate.letter);
        letter.dataset.space = String(candidate.letter === ' ');
        element.querySelector('[data-probability-label]')!.textContent = frame.ready ? `${candidate.probability}%` : '—';
        element.dataset.probability = String(candidate.probability);
        element.dataset.selected = String(frame.selected && candidate === frame.winner);
        element.dataset.muted = String(frame.selected && candidate !== frame.winner);
      });
      candidateGroup.hidden = frame.dropped;
      calculation.hidden = frame.dropped;
      announcement.textContent = frame.complete ? `演示完成。回答：${answer.join('')}` : '';
      dirty = true;
    }
    if (dirty) measure();
    const progress = frame.feeding ? Math.min(1, (frame.progress - .86) / .12) : 0;
    const eased = progress * progress * (3 - 2 * progress);
    sheet.style.transform = `translateY(${-rowHeight / 2 - (rowHeight + gap) * eased}px)`;
    for (const child of current.children) (child as HTMLElement).style.transform = `translateY(${shift * eased}px)`;
    if (!reduced.matches && frame.phase === 'dropping') {
      if (flight.dataset.round !== String(frame.index)) {
        const source = find('[data-selected="true"] [data-letter]').getBoundingClientRect();
        const target = landing.getBoundingClientRect();
        const bounds = root.getBoundingClientRect();
        drop = { x: source.left + source.width / 2 - bounds.left, y: source.top + source.height / 2 - bounds.top, targetX: target.left + 8 - bounds.left, targetY: target.top + 9 - bounds.top };
        flight.dataset.round = String(frame.index);
      }
      const amount = (frame.progress - .64) / .09;
      const easedDrop = amount * amount * (3 - 2 * amount);
      const scale = 1 - .15 * easedDrop;
      const size = flight.offsetWidth;
      flight.textContent = symbol(frame.winner.letter);
      flight.style.transform = `translate(${drop.x + (drop.targetX - drop.x) * easedDrop - size * scale / 2}px, ${drop.y + (drop.targetY - drop.y) * easedDrop - size * scale / 2}px) scale(${scale})`;
      flight.style.opacity = String(amount > .9 ? (1 - amount) * 10 : 1);
    } else flight.style.opacity = '0';
  }

  function stop() {
    cancelAnimationFrame(request);
    request = 0;
    lastTime = null;
  }
  function start() {
    if (!request && playing && visible && !document.hidden && !reduced.matches) request = requestAnimationFrame(tick);
  }
  function tick(time: number) {
    request = 0;
    if (lastTime !== null) elapsed = Math.min(totalDuration, elapsed + Math.min(100, time - lastTime) / 1000);
    lastTime = time;
    render(generationFrame(elapsed));
    start();
  }
  function toggle() {
    stop();
    playing = !playing;
    render(generationFrame(elapsed));
    start();
  }
  function reset() {
    stop();
    elapsed = reduced.matches ? totalDuration : 0;
    playing = !reduced.matches;
    lastKey = '';
    delete flight.dataset.round;
    render(generationFrame(elapsed));
    start();
  }
  function refresh() {
    if (disposed) return;
    dirty = true;
    delete flight.dataset.round;
    render(generationFrame(elapsed));
  }
  function visibility() {
    stop();
    start();
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    stop();
    start();
  });
  const resize = new ResizeObserver(refresh);
  pause.addEventListener('click', toggle);
  replay.addEventListener('click', reset);
  reduced.addEventListener('change', reset);
  document.addEventListener('visibilitychange', visibility);
  render(generationFrame(elapsed));
  root.dataset.ready = 'true';
  observer.observe(root);
  resize.observe(root);
  void document.fonts.ready.then(refresh);
  return () => {
    disposed = true;
    stop();
    observer.disconnect();
    resize.disconnect();
    pause.removeEventListener('click', toggle);
    replay.removeEventListener('click', reset);
    reduced.removeEventListener('change', reset);
    document.removeEventListener('visibilitychange', visibility);
  };
}
