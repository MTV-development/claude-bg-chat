'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@/lib/contexts';
import { TodoSyncProvider } from '@/app/providers/TodoSyncProvider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <TodoSyncProvider>
        {children}
      </TodoSyncProvider>
    </ThemeProvider>
  );
}
