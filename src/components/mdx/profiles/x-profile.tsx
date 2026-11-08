import { Children, type ReactNode, useId } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';

type XProfileProps = {
  username: string;
  name: string;
  avatar: string;
  bio: string;
};

export function XProfiles({ children }: { children: ReactNode }) {
  const profiles = Children.toArray(children).filter(child => typeof child !== 'string' || child.trim());
  return <div data-component="x-profiles" className="not-prose @container/x-profiles my-6">
    <ul role="list" className="m-0 grid list-none grid-cols-1 gap-3 p-0 @[36rem]/x-profiles:grid-cols-2">
      {profiles.map((profile, index) => <li key={index} className="min-w-0">{profile}</li>)}
    </ul>
  </div>;
}

export function XProfile({ username, name, avatar, bio }: XProfileProps) {
  const t = useTranslations('Ui');
  const id = useId();
  return <a data-component="x-profile" href={`https://x.com/${username}`} target="_blank" rel="noopener noreferrer"
    aria-labelledby={`${id}-name ${id}-username`} aria-describedby={`${id}-bio ${id}-hint`}
    title={`${t('viewOnX')}${t('opensInNewTab')}`}
    className="not-prose group/profile flex h-full min-w-0 flex-col gap-3 rounded-sm border border-brand/20 bg-background p-4 text-foreground no-underline hover:border-brand/50 hover:bg-brand/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-safe:transition-colors motion-safe:duration-150">
    <span className="flex min-w-0 items-center gap-3">
      <Image src={avatar} alt="" width={48} height={48} sizes="3rem" className="size-12 shrink-0 rounded-full bg-brand-soft object-cover" />
      <span className="min-w-0 flex-1">
        <span id={`${id}-name`} data-slot="profile-name" className="block text-base leading-copy font-semibold wrap-break-word group-hover/profile:text-brand">{name}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-caption leading-copy text-muted-foreground">
          <span aria-hidden className="size-3 shrink-0 bg-current mask-[url(/images/social/x.svg)] mask-contain mask-center mask-no-repeat" />
          <span id={`${id}-username`} className="min-w-0 wrap-anywhere">@{username}</span>
        </span>
      </span>
      <ArrowUpRightIcon size={16} aria-hidden className="shrink-0 self-start text-brand/60 group-hover/profile:text-brand" />
    </span>
    <span id={`${id}-bio`} data-slot="profile-bio" className="block text-sm leading-body text-reading wrap-break-word">{bio}</span>
    <span id={`${id}-hint`} className="sr-only">{t('opensInNewTab')}</span>
  </a>;
}
