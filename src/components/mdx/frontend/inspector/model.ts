export const initialTitle = 'My AI Tools';
export const editedTitle = 'My First Website';
const storyDuration = 11700;
const readingPauses = [
  { at: 2200, duration: 900 },
  { at: 3550, duration: 700 },
  { at: 4700, duration: 1000 },
  { at: 5900, duration: 700 },
  { at: 6400, duration: 800 },
  { at: 8200, duration: 1000 },
  { at: 9300, duration: 600 },
] as const;

function playbackTimeAt(storyTime: number) {
  return storyTime + readingPauses.reduce((total, pause) => total + (pause.at < storyTime ? pause.duration : 0), 0);
}

function storyTimeAt(elapsed: number) {
  let delay = 0;
  for (const pause of readingPauses) {
    const start = pause.at + delay;
    if (elapsed < start) return elapsed - delay;
    if (elapsed < start + pause.duration) return pause.at;
    delay += pause.duration;
  }
  return Math.min(storyDuration, elapsed - delay);
}

export const duration = playbackTimeAt(storyDuration);
export const posterTime = playbackTimeAt(10300);

const captions = [
  { at: 0, text: '右键点击网页标题' },
  { at: 1200, text: '选择「检查」' },
  { at: 2850, text: '点击元素选择器' },
  { at: 3750, text: '移到网页标题上' },
  { at: 4450, text: '点击高亮的标题' },
  { at: 5050, text: '找到对应的文字' },
  { at: 6050, text: '双击文字，开始编辑' },
  { at: 6500, text: '输入新标题' },
  { at: 7900, text: '按 Enter，应用修改' },
  { at: 9500, text: '页面标题已更新' },
] as const;

export const cursorStops = [
  { time: 0, target: 'origin' },
  { time: 850, target: 'title' },
  { time: 1500, target: 'title' },
  { time: 2150, target: 'inspect' },
  { time: 2850, target: 'inspect' },
  { time: 3550, target: 'picker' },
  { time: 3900, target: 'picker' },
  { time: 4450, target: 'title' },
  { time: 5350, target: 'title' },
  { time: 5900, target: 'text' },
  { time: storyDuration, target: 'text' },
] as const;

export function frameAt(elapsed: number) {
  const time = storyTimeAt(elapsed);
  const textCommitted = time >= 9500;
  const step = time < 3300 ? 0 : time < 5500 ? 1 : 2;
  const textTyping = time >= 6500 && time < 9100;
  const typed = (value: string, start: number, end: number) => value.slice(0, Math.max(0, Math.ceil(value.length * Math.min(1, (time - start) / (end - start)))));

  return {
    storyTime: time,
    step,
    caption: captions.findLast((caption) => time >= caption.at)!.text,
    confirming: time >= 7900 && time < 9500,
    title: textCommitted ? editedTitle : initialTitle,
    menu: time >= 1200 && time < 2850,
    inspectHovered: time >= 1900,
    panel: time >= 2850,
    pickerActive: time >= 3750 && time < 5050,
    hoveringTitle: time >= 4450 && time < 5050,
    elementSelected: time >= 5050,
    selectedText: time >= 6050 && time < 6500,
    textTyping,
    codeText: textTyping ? typed(editedTitle, 6500, 7900) : time >= 7900 ? editedTitle : initialTitle,
    enter: time >= 9100 && time < 10000,
    click: [1100, 2600, 3750, 5050, 6050].some((at) => time >= at && time < at + 300),
  };
}
