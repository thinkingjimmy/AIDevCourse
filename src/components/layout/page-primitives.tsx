import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { cva, type VariantProps } from 'class-variance-authority';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { site } from '@/lib/site-config';

export function SiteShell({ variant = 'framed', className, ...props }: ComponentProps<'div'> & { variant?: 'framed' | 'open' | 'course' | 'reading' }) {
  return <div {...props} data-slot="site-window" data-variant={variant} className={cn(
    'group/site relative flex min-h-screen flex-col bg-background text-ui leading-copy text-foreground',
    '[--page-scroll-margin:var(--zinc-header)] [&_:where(h1,h2,h3,h4,[id])]:scroll-mt-(--page-scroll-margin)',
    variant === 'framed' ? '[--zinc-header:56px] before:pointer-events-none before:absolute before:inset-y-0 before:left-[50vw] before:z-[45] before:w-[min(64rem,100%)] before:-translate-x-1/2 before:border-x before:border-border before:content-[\'\']' : '[--zinc-header:67.2px]',
    variant === 'reading' && '[--page-scroll-margin:1rem]',
    className,
  )} />;
}

export function PageContainer({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('relative left-[calc((100vw-100%)/2)] mx-auto w-[min(64rem,100%)] px-7 max-[721px]:px-4', className)} />;
}

export function SiteLogo({ className, ...props }: Omit<ComponentProps<typeof Link>, 'children'>) {
  return <Link {...props} className={cn('inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2.5 text-inherit no-underline', className)}>
    <Image data-slot="brand-mark" src={site.logo} width={44} height={44} alt={site.name} className="size-11 shrink-0" loading="eager" unoptimized />
    <Image data-slot="brand-wordmark" src={site.wordmark} width={1058.1} height={139.5} alt="" aria-hidden="true" className="h-[33px] w-auto shrink-0 translate-y-[1.5px] max-[721px]:hidden" loading="eager" unoptimized />
  </Link>;
}

const titleVariants = cva('font-sans font-semibold text-foreground whitespace-pre-line', {
  variants: {
    variant: {
      hero: 'm-0 mb-5 text-hero tracking-heading max-[1101px]:text-display max-[841px]:text-title',
      page: 'm-0 mb-[18px] text-5xl tracking-heading max-[721px]:text-title',
      lesson: 'm-0 mb-3 text-4xl leading-heading tracking-heading text-brand',
    },
  },
  defaultVariants: { variant: 'page' },
});

export function PageTitle({ variant, className, ...props }: ComponentProps<'h1'> & VariantProps<typeof titleVariants>) {
  return <h1 {...props} className={cn(titleVariants({ variant }), className)} />;
}

export function PageEyebrow({ className, ...props }: ComponentProps<'p'>) {
  return <p {...props} className={cn('m-0 mb-[18px] font-mono text-xs font-normal tracking-label text-muted-foreground', className)} />;
}

export function HeroGrid({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('grid grid-cols-[1.25fr_.75fr] items-center gap-10 max-[1101px]:gap-6 max-[841px]:grid-cols-1 max-[841px]:gap-8', className)} />;
}

export function HeroCopy(props: ComponentProps<'div'>) {
  return <div {...props} className={cn('min-w-0', props.className)} />;
}

export function HeroLead({ className, ...props }: ComponentProps<'p'>) {
  return <p {...props} className={cn('m-0 mb-8 max-w-[30rem] text-lg leading-body text-muted-foreground max-[1101px]:text-base', className)} />;
}

export function StatusPage({ className, ...props }: ComponentProps<'main'>) {
  return <main {...props} className={cn('relative left-[calc((100vw-100%)/2)] mx-auto w-[min(64rem,100%)] flex-[1_0_auto] px-7 pt-12 pb-[72px] max-[721px]:px-4', className)} />;
}

export function PageActions({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-wrap items-center gap-2.5', className)} />;
}

export function HeroPrimaryAction({ children, arrow = true, className, ...props }: ComponentProps<typeof Link> & { arrow?: boolean }) {
  return <Button asChild variant="plain" size="reset" className={cn('group/hero-action relative min-h-11 max-w-full rounded-(--radius) text-ui leading-none font-medium text-white max-[721px]:w-full', className)}>
    <Link {...props} data-slot="hero-primary-action">
      <span data-slot="hero-primary-face" className="relative inline-flex h-11 min-w-0 items-center justify-center gap-3 overflow-hidden rounded-(--radius) bg-brand px-5 shadow-sm motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-safe:group-[:active:hover]/hero-action:scale-[0.96] max-[721px]:h-auto max-[721px]:min-h-12 max-[721px]:w-full max-[721px]:justify-between max-[721px]:px-4 max-[721px]:py-3 max-[721px]:leading-snug max-[721px]:whitespace-normal">
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-white/8 opacity-0 group-hover/hero-action:opacity-100 motion-safe:transition-opacity motion-safe:duration-150 motion-safe:ease-out" />
        <span className="relative">{children}</span>
        {arrow && <ArrowRightIcon data-slot="hero-primary-arrow" size={16} aria-hidden className="relative motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-safe:group-hover/hero-action:translate-x-1 motion-safe:group-[:active:hover]/hero-action:translate-x-0" />}
      </span>
    </Link>
  </Button>;
}

export function SiteFooter({ children, meta, tools }: { children: ReactNode; meta: ReactNode; tools?: ReactNode }) {
  return <footer className="border-t border-border text-caption text-muted-foreground group-data-[variant=open]/site:border-t-0">
    <PageContainer className="flex items-center justify-between gap-4 py-[18px] max-[721px]:flex-col max-[721px]:items-start max-[721px]:gap-1.5">
      <span>{children}</span>
      <div className="flex items-center gap-3 max-[721px]:w-full max-[721px]:justify-between">
        <a href="https://jimmywong.dev" className="font-mono no-underline underline-offset-4 hover:text-foreground hover:underline">{meta}</a>
        {tools}
      </div>
    </PageContainer>
  </footer>;
}
