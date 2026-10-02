import React, { createContext, useContext } from 'react';
import type { ApplicationOperations } from './types';

const ApplicationContext = createContext<ApplicationOperations | null>(null);

export interface ApplicationProviderProps {
  app: ApplicationOperations;
  children: React.ReactNode;
}

export const ApplicationProvider: React.FC<ApplicationProviderProps> = ({ app, children }) => {
  return (
    <ApplicationContext.Provider value={app}>
      {children}
    </ApplicationContext.Provider>
  );
};

export function useApplication(): ApplicationOperations {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error('useApplication must be used within an ApplicationProvider');
  }
  return context;
}
