import type { MDXComponents } from 'mdx/types';
import type { AchievementDefinition } from '@/lib/content/model';
import { Achievement } from './achievement';

export function getAchievementComponents(definitions: readonly AchievementDefinition[], anchorPrefix = ''): MDXComponents {
  return {
    Achievement: ({ id }: { id: string }) => {
      const definition = definitions.find((item) => item.id === id);
      if (!definition) throw new Error(`Missing validated achievement: ${id}`);
      return <Achievement definition={definition} anchorPrefix={anchorPrefix} />;
    },
    // Options are parsed during content validation, so only the parent renders them.
    AchievementOption: () => null,
  };
}
