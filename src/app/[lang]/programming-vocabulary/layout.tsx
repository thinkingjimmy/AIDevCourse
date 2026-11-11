import type { ReactNode } from 'react';
import { VocabularyNavigationProvider } from '@/components/vocabulary/navigation-state';

export default function ProgrammingVocabularyLayout({ children }: { children: ReactNode }) {
  return <VocabularyNavigationProvider>{children}</VocabularyNavigationProvider>;
}
