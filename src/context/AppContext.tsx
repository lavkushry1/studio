'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  // Define global state properties and setters here
  // Example: theme, setTheme, etc.
  someGlobalValue: string;
  setSomeGlobalValue: (value: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [someGlobalValue, setSomeGlobalValue] = useState('Default');

  // Define other state and functions

  const value = {
    someGlobalValue,
    setSomeGlobalValue,
    // Add other values and functions to the context provider
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
