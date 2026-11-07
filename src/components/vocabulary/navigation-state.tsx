'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { SidebarProvider } from '@/components/navigation/sidebar';

type NavigationState = { query: string; onQueryChange: (query: string) => void };
const NavigationContext = createContext<NavigationState | null>(null);

export function VocabularyNavigationProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [query, onQueryChange] = useState('');
  return <NavigationContext.Provider value={{ query, onQueryChange }}>
    <SidebarProvider open={open} onOpenChange={setOpen} className="vocabulary-shell">{children}</SidebarProvider>
  </NavigationContext.Provider>;
}

export function useVocabularyNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('Dictionary navigation requires VocabularyNavigationProvider');
  return context;
}
