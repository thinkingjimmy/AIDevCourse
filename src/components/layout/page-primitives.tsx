/**
 * [INPUT]: Native element props, Next.js links, and shared Tailwind theme tokens.
 * [OUTPUT]: Shared page shells, containers, branding, typography, hero parts, and footer with an author link.
 * [POS]: Shared visual structure for public pages, status pages, and the lesson sidebar.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export function SiteShell({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn(
    'relative flex min-h-screen flex-col bg-background text-[15px] leading-[1.6] text-foreground [--zinc-header:56px] max-[721px]:[--zinc-header:88px]',
    '[&_:where(h1,h2,h3,h4,[id])]:scroll-mt-(--zinc-header)',
    'before:pointer-events-none before:absolute before:inset-y-0 before:left-[50vw] before:z-[45] before:w-[min(64rem,100%)] before:-translate-x-1/2 before:border-x before:border-border before:content-[\'\']',
    className,
  )} />;
}

export function PageContainer({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('relative left-[calc((100vw-100%)/2)] mx-auto w-[min(64rem,100%)] px-7 max-[721px]:px-4', className)} />;
}

export function SiteLogo({ className, ...props }: Omit<ComponentProps<typeof Link>, 'children'>) {
  return <Link {...props} className={cn('inline-flex shrink-0 items-center gap-2 font-semibold tracking-[-.02em] text-inherit no-underline', className)}>
    <span aria-hidden className="size-[18px] rounded-[5px] bg-foreground" /><span>aidevcourse</span>
  </Link>;
}

const titleVariants = cva('font-sans font-semibold text-foreground whitespace-pre-line', {
  variants: {
    variant: {
      hero: 'm-0 mb-5 text-[56px] leading-[1.08] tracking-[-.035em] max-[1101px]:text-[40px] max-[1101px]:tracking-[-.03em] max-[841px]:text-[32px]',
      page: 'm-0 mb-[18px] text-[52px] leading-[1.12] tracking-[-.03em] max-[721px]:text-[32px]',
      lesson: 'm-0 mb-3 text-[34px] leading-[1.2] tracking-[-.03em]',
    },
  },
  defaultVariants: { variant: 'page' },
});

export function PageTitle({ variant, className, ...props }: ComponentProps<'h1'> & VariantProps<typeof titleVariants>) {
  return <h1 {...props} className={cn(titleVariants({ variant }), className)} />;
}

export function PageEyebrow({ className, ...props }: ComponentProps<'p'>) {
  return <p {...props} className={cn('m-0 mb-[18px] font-mono text-[12px] font-normal tracking-[.08em] text-muted-foreground', className)} />;
}

export function HeroGrid({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('grid grid-cols-[1.25fr_.75fr] items-center gap-10 max-[1101px]:gap-6 max-[841px]:grid-cols-1 max-[841px]:gap-8', className)} />;
}

export function HeroCopy(props: ComponentProps<'div'>) {
  return <div {...props} className={cn('min-w-0 pl-6', props.className)} />;
}

export function HeroLead({ className, ...props }: ComponentProps<'p'>) {
  return <p {...props} className={cn('m-0 mb-8 max-w-[30rem] text-[18px] leading-[1.7] text-muted-foreground max-[1101px]:text-[16px]', className)} />;
}

export function StatusPage({ className, ...props }: ComponentProps<'main'>) {
  return <main {...props} className={cn('relative left-[calc((100vw-100%)/2)] mx-auto w-[min(64rem,100%)] flex-[1_0_auto] px-7 pt-12 pb-[72px] max-[721px]:px-4', className)} />;
}

export function PageActions({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-wrap items-center gap-2.5', className)} />;
}

export function SiteFooter({ children, meta }: { children: ReactNode; meta: ReactNode }) {
  return <footer className="border-t border-border text-[13px] text-muted-foreground">
    <PageContainer className="flex items-center justify-between gap-4 py-[18px] max-[721px]:flex-col max-[721px]:items-start max-[721px]:gap-1.5">
      <span>{children}</span><a href="https://jimmywong.dev" className="font-mono no-underline underline-offset-4 hover:text-foreground hover:underline">{meta}</a>
    </PageContainer>
  </footer>;
}
