import Image from 'next/image';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/overlays/dialog';
import { tokenizationText, tokenizationTokens } from '../tokenization/model';
import cleaningImage from '../../../../public/images/courses/how-language-models-are-trained/01-data-cleaning.webp';
import tokenizationImage from '../../../../public/images/courses/how-language-models-are-trained/02-tokenization.webp';
import predictionImage from '../../../../public/images/courses/how-language-models-are-trained/03-prediction-training.webp';

export const pretrainingSteps = [
  {
    value: 'cleaning', label: '筛选和清洗', image: cleaningImage,
    description: '从 GitHub 等代码库、书籍、技术文档和 Stack Overflow 问答中收集数据，去重、过滤低质量及不适合训练的内容，得到训练文本。',
  },
  {
    value: 'tokens', label: '转为 Token', image: tokenizationImage,
    description: `将「${tokenizationText}」通过 Tokenizer 切分为 Token，并映射为 Token ID：${tokenizationTokens.map((token) => `${token.text} → ${token.id}`).join('；')}。`,
  },
  {
    value: 'prediction', label: '预测训练', image: predictionImage,
    description: '预测下一个 Token → 对照原文 → 调整参数 → 再次预测，反复进行训练。对照时使用原文中的下一个 Token，调整后的参数用于下一次预测。',
  },
] as const;

export function PretrainingIllustration({ step, interactive = true }: { step: (typeof pretrainingSteps)[number]; interactive?: boolean }) {
  const image = <Image src={step.image} alt={step.description} loading="eager" sizes="(min-width: 768px) 640px, 100vw" className="block aspect-video h-auto w-full object-contain" />;

  return <div data-pretraining-illustration={step.value} className="aspect-video w-full rounded-sm bg-white">
    {interactive ? <Dialog>
      <DialogTrigger asChild>
        <Button variant="plain" size="reset" aria-label={`放大${step.label}图解`} className="block w-full cursor-zoom-in touch-manipulation rounded-sm">{image}</Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="top-1/2 w-[calc(100vw-2rem)] max-w-6xl -translate-y-1/2 rounded-sm border-foreground bg-white p-2 pt-12 shadow-none max-sm:top-1/2">
        <DialogTitle className="sr-only">{step.label}图解</DialogTitle>
        <DialogClose asChild>
          <Button variant="plain" size="icon-touch" aria-label="关闭图解" className="absolute top-2 right-2 rounded-sm text-black"><XIcon size={20} aria-hidden /></Button>
        </DialogClose>
        <Image src={step.image} alt={step.description} sizes="(min-width: 1200px) 1120px, 100vw" className="min-h-0 w-full object-contain" />
      </DialogContent>
    </Dialog> : image}
  </div>;
}
