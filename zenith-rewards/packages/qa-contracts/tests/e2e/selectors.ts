/**
 * Prefer `data-testid` in zenith-live.spec.ts; this file is optional shorthand.
 */
import type { Page } from '@playwright/test';

export const Sel = {
  navDashboard: (p: Page) => p.getByTestId('nav-dashboard'),
  navPortfolio: (p: Page) => p.getByTestId('nav-portfolio'),
  navOptimization: (p: Page) => p.getByTestId('nav-optimization'),
  navHistory: (p: Page) => p.getByTestId('nav-history'),
  globalSearch: (p: Page) => p.getByTestId('global-search'),
  crawlUrl: (p: Page) => p.getByTestId('crawl-url-input'),
  crawlSubmit: (p: Page) => p.getByTestId('crawl-submit'),
};
