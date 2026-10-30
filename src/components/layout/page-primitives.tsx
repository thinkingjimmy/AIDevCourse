import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { site } from '@/lib/site-config';

export function SiteShell({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn(
    'relative flex min-h-screen flex-col bg-background text-ui leading-copy text-foreground [--zinc-header:56px]',
    '[&_:where(h1,h2,h3,h4,[id])]:scroll-mt-(--zinc-header)',
    'before:pointer-events-none before:absolute before:inset-y-0 before:left-[50vw] before:z-[45] before:w-[min(64rem,100%)] before:-translate-x-1/2 before:border-x before:border-border before:content-[\'\']',
    className,
  )} />;
}

export function PageContainer({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('relative left-[calc((100vw-100%)/2)] mx-auto w-[min(64rem,100%)] px-7 max-[721px]:px-4', className)} />;
}

export function SiteLogo({ className, ...props }: Omit<ComponentProps<typeof Link>, 'children'>) {
  return <Link {...props} className={cn('inline-flex shrink-0 items-center text-inherit no-underline', className)}>
    <Image src={site.logo} width={144} height={19} alt={site.name} className="h-auto w-36 shrink-0 max-[721px]:w-32" loading="eager" unoptimized />
  </Link>;
}

const titleVariants = cva('font-sans font-semibold text-foreground whitespace-pre-line', {
  variants: {
    variant: {
      hero: 'm-0 mb-5 text-hero tracking-heading max-[1101px]:text-display max-[841px]:text-title',
      page: 'm-0 mb-[18px] text-5xl tracking-heading max-[721px]:text-title',
      lesson: 'm-0 mb-3 text-4xl leading-heading tracking-heading',
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

export function SiteFooter({ children, meta }: { children: ReactNode; meta: ReactNode }) {
  return <footer className="border-t border-border text-caption text-muted-foreground">
    <PageContainer className="flex items-center justify-between gap-4 py-[18px] max-[721px]:flex-col max-[721px]:items-start max-[721px]:gap-1.5">
      <span>{children}</span><a href="https://jimmywong.dev" className="font-mono no-underline underline-offset-4 hover:text-foreground hover:underline">{meta}</a>
    </PageContainer>
  </footer>;
}
