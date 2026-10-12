import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { MemoryRouter, MemoryRouterProps } from 'react-router-dom';
import { ApplicationProvider } from '../application/ApplicationContext';
import { ToastProvider } from '../context/ToastContext';
import { DesignSystemProvider } from '../context/DesignSystemContext';
import type { ApplicationOperations } from '../application/types';
import { createMockApplicationOperations, DeepPartial } from './mocks/mockApplication';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  withRouter?: boolean;
  routerInitialEntries?: MemoryRouterProps['initialEntries'];
  withToast?: boolean;
  withDesignSystem?: boolean;
  app?: ApplicationOperations;
  mockAppOverrides?: DeepPartial<ApplicationOperations>;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult & { app: ApplicationOperations } {
  const {
    withRouter = false,
    routerInitialEntries = ['/'],
    withToast = false,
    withDesignSystem = false,
    app: suppliedApp,
    mockAppOverrides,
    ...renderOptions
  } = options;

  const app = suppliedApp ?? createMockApplicationOperations(mockAppOverrides);

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    let content = children;

    if (withToast) {
      content = <ToastProvider>{content}</ToastProvider>;
    }

    if (withDesignSystem) {
      content = <DesignSystemProvider>{content}</DesignSystemProvider>;
    }

    if (withRouter) {
      content = <MemoryRouter initialEntries={routerInitialEntries}>{content}</MemoryRouter>;
    }

    return <ApplicationProvider app={app}>{content}</ApplicationProvider>;
  };

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...result,
    app,
  };
}

export * from '@testing-library/react';
export { createMockApplicationOperations } from './mocks/mockApplication';
export * from './fixtures';
