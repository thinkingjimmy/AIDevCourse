import { useTranslations } from 'next-intl';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import type { AnimationTermId } from '@/lib/vocabulary/animation';

export function EntranceScene({ id }: { id: AnimationTermId }) {
  const t = useTranslations('AnimationVocabulary.demo');
  if (id === 'pop-in') return <div className="entrance-success" data-animation-sample>
    <span><CheckIcon size={32} weight="bold" /></span><strong>{t('complete')}</strong>
  </div>;
  if (id === 'reveal') return <div className="entrance-artwork" data-animation-sample>
    <svg viewBox="0 0 240 144" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden>
      <path fill="#e7e9db" d="M0 0h240v144H0z" />
      <circle cx="178" cy="43" r="24" fill="#d7a661" />
      <path d="M0 144V88L66 35l112 109H0Z" fill="#8b9b85" />
      <path d="m75 144 91-80 74 56v24H75Z" fill="#31564b" />
      <path d="M0 144h240" stroke="#31564b" />
    </svg>
    <strong>{t('newPerspective')}</strong>
  </div>;
  if (id === 'scale-in') return <div className="entrance-panel" data-animation-sample>
    <SparkleIcon size={25} weight="duotone" /><strong>{t('newIdea')}</strong>
    <span className="entrance-placeholder-line" /><span className="entrance-placeholder-line" />
  </div>;
  const Icon = id === 'slide-in' ? BellIcon : CheckIcon;
  return <div className="entrance-toast" data-animation-sample>
    <span className="entrance-toast-icon"><Icon size={20} weight="bold" /></span>
    <div><strong>{t(id === 'slide-in' ? 'newMessage' : 'saved')}</strong><span>{t('justNow')}</span></div>
  </div>;
}
