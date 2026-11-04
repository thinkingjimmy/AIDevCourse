import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { countTarget, typewriterText, type AnimationType } from './model';
import styles from './motion.module.css';

const tasks = ['写下想法', '生成页面', '调整细节'];
const brands = ['NOVA', 'orbit', 'Form', 'MONO'];

export function MotionScene({ type }: { type: AnimationType }) {
  if (type === 'stagger') return <ol className="m-0 grid w-full max-w-64 list-none gap-2 p-0">
    {tasks.map((task, index) => <li key={task} data-motion-item className={`${styles.staggerItem} flex items-center gap-3 rounded-sm border border-border bg-background px-4 py-2.5 text-sm`} style={{ animationDelay: `${index * 80}ms` }}>
      <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span><span>{task}</span><CheckIcon size={16} aria-hidden className="ml-auto text-muted-foreground" />
    </li>)}
  </ol>;

  if (type === 'spring') return <div data-motion-item className={`${styles.springButton} inline-flex h-12 items-center gap-2 rounded-sm bg-foreground px-6 text-base font-medium text-background`}>
    <CheckIcon size={18} aria-hidden />保存成功
  </div>;

  if (type === 'skeleton') return <div className="w-full max-w-64 rounded-sm border border-border bg-background p-5" role="img" aria-label="加载占位：头像、标题和两行正文">
    <div aria-hidden className="flex items-center gap-3">
      <div className={`${styles.skeletonBlock} size-10 shrink-0 rounded-sm bg-border`} />
      <div className={`${styles.skeletonBlock} h-3 w-24 rounded-sm bg-border`} />
    </div>
    <div aria-hidden className={`${styles.skeletonBlock} mt-4 h-2.5 w-full rounded-sm bg-border`} />
    <div aria-hidden className={`${styles.skeletonBlock} mt-2.5 h-2.5 w-3/4 rounded-sm bg-border`} />
  </div>;

  if (type === 'count-up') return <div className="text-center">
    <span className="sr-only">{countTarget.toLocaleString('en-US')} 位学习者</span>
    <span aria-hidden data-motion-value className="block font-mono text-5xl leading-none font-medium tracking-tight tabular-nums sm:text-6xl">{countTarget.toLocaleString('en-US')}</span>
    <span aria-hidden className="mt-4 block text-sm text-muted-foreground">位学习者</span>
  </div>;

  if (type === 'typewriter') return <p className="relative m-0 max-w-full text-center text-2xl leading-body font-semibold tracking-tight sm:text-3xl">
    <span className="sr-only">{typewriterText}</span>
    <span aria-hidden className="invisible">{typewriterText}</span>
    <span aria-hidden data-motion-value className="absolute inset-0">{typewriterText}</span>
  </p>;

  return <div className={styles.marqueeViewport}>
    <div className={styles.marqueeTrack} data-motion-track>
      {[0, 1].map((copy) => <ul key={copy} aria-hidden={copy === 1 ? true : undefined} className={`${styles.logoGroup} m-0 list-none p-0`}>
        {brands.map((brand, index) => <li key={brand} className="flex shrink-0 items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span aria-hidden className="text-2xl">{['✳', '◉', '◇', '▥'][index]}</span>{brand}
        </li>)}
      </ul>)}
    </div>
  </div>;
}
