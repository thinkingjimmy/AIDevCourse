/**
 * [INPUT]: Validated article achievement definitions and the generic client challenge.
 * [OUTPUT]: getAchievementComponents binds authored MDX declarations to serializable challenge data.
 * [POS]: Server MDX adapter; the same parsed declarations drive rendering and course statistics.
 * [PROTOCOL]: Update this header when making changes, then check README.md.
 */
import type { MDXComponents } from 'mdx/types';
import type { AchievementDefinition } from '@/lib/content/model';
import { Achievement } from './achievement';

export function getAchievementComponents(definitions: readonly AchievementDefinition[]): MDXComponents {
  return {
    Achievement: ({ id }: { id: string }) => {
      const definition = definitions.find((item) => item.id === id);
      if (!definition) throw new Error(`Missing validated achievement: ${id}`);
      return <Achievement definition={definition} />;
    },
    // Options are parsed during content validation, so only the parent renders them.
    AchievementOption: () => null,
  };
}
