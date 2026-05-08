/**
 * Zenith Rewards — live integration tests (no Playwright network mocks).
 * Validates FastAPI + worker crawler + React UI against real services.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';

const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:5173';
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:8000';
const WORKER_URL = process.env.WORKER_URL ?? 'http://127.0.0.1:8001';

type ServiceFlags = { app: boolean; api: boolean; worker: boolean };

async function probeServices(request: APIRequestContext): Promise<ServiceFlags> {
  let app = false;
  let api = false;
  let worker = false;
  try {
    const a = await request.get(`${API_URL}/health`);
    api = a.ok();
  } catch {
    api = false;
  }
  try {
    const w = await request.get(`${WORKER_URL}/health`);
    worker = w.ok();
  } catch {
    worker = false;
  }
  try {
    const p = await request.get(APP_URL);
    app = p.ok();
  } catch {
    app = false;
  }
  return { app, api, worker };
}

test.describe('Live services', () => {
  test('API /health responds', async ({ request }) => {
    const r = await request.get(`${API_URL}/health`);
    expect(r.ok(), await r.text()).toBeTruthy();
    const j = await r.json();
    expect(j.status).toBe('ok');
  });

  test('Worker /health responds', async ({ request }) => {
    const r = await request.get(`${WORKER_URL}/health`);
    expect(r.ok(), await r.text()).toBeTruthy();
  });

  test('API portfolio summary is real DB-backed JSON', async ({ request }) => {
    const r = await request.get(`${API_URL}/api/v1/portfolio/summary`);
    expect(r.ok(), await r.text()).toBeTruthy();
    const j = await r.json();
    expect(j).toHaveProperty('total_points_equivalent_usd');
    expect(j).toHaveProperty('total_points_display');
    expect(typeof j.total_points_display).toBe('number');
    expect(Array.isArray(j.cards)).toBeTruthy();
    expect(Array.isArray(j.loyalty_accounts)).toBeTruthy();
    expect(Array.isArray(j.category_breakdown)).toBeTruthy();
  });

  test('API activity endpoint returns array', async ({ request }) => {
    const r = await request.get(`${API_URL}/api/v1/activity?limit=5`);
    expect(r.ok(), await r.text()).toBeTruthy();
    const rows = await r.json();
    expect(Array.isArray(rows)).toBeTruthy();
  });

  test('API recommendations returns array', async ({ request }) => {
    const r = await request.get(`${API_URL}/api/v1/recommendations`);
    expect(r.ok(), await r.text()).toBeTruthy();
    const rows = await r.json();
    expect(Array.isArray(rows)).toBeTruthy();
    expect(rows.length).toBeGreaterThan(0);
  });

  test('API points-by-month returns array', async ({ request }) => {
    const r = await request.get(`${API_URL}/api/v1/insights/points-by-month?months=6`);
    expect(r.ok(), await r.text()).toBeTruthy();
    const rows = await r.json();
    expect(Array.isArray(rows)).toBeTruthy();
  });

  test('API /cards/user and /loyalty/accounts mirror portfolio', async ({ request }) => {
    const [cardsRes, loyaltyRes, sumRes] = await Promise.all([
      request.get(`${API_URL}/api/v1/cards/user`),
      request.get(`${API_URL}/api/v1/loyalty/accounts`),
      request.get(`${API_URL}/api/v1/portfolio/summary`),
    ]);
    expect(cardsRes.ok()).toBeTruthy();
    expect(loyaltyRes.ok()).toBeTruthy();
    expect(sumRes.ok()).toBeTruthy();
    const cards = await cardsRes.json();
    const loyalty = await loyaltyRes.json();
    const summary = await sumRes.json();
    expect(cards.length).toBe(summary.cards.length);
    expect(loyalty.length).toBe(summary.loyalty_accounts.length);
  });

  test('API activity stats aggregates ledger', async ({ request }) => {
    const r = await request.get(`${API_URL}/api/v1/activity/stats`);
    expect(r.ok(), await r.text()).toBeTruthy();
    const s = await r.json();
    expect(s).toHaveProperty('points_earned');
    expect(s).toHaveProperty('points_redeemed');
    expect(s).toHaveProperty('net_points');
  });

  test('Worker POST /crawl fetches real URL (user-controlled URL body)', async ({ request }) => {
    const target = 'https://example.com';
    const r = await request.post(`${WORKER_URL}/crawl`, {
      data: { url: target },
    });
    expect(r.ok(), await r.text()).toBeTruthy();
    const j = await r.json();
    expect(j.title).toMatch(/example/i);
    expect(j.url).toContain('example.com');
  });

  test('API records crawl snapshot (integration: worker output → API)', async ({ request }) => {
    const crawl = await request.post(`${WORKER_URL}/crawl`, {
      data: { url: 'https://example.com' },
    });
    expect(crawl.ok()).toBeTruthy();
    const cj = await crawl.json();
    const rec = await request.post(`${API_URL}/api/v1/integrations/crawl-snapshot`, {
      data: {
        url: cj.url,
        title: cj.title,
        excerpt: cj.excerpt,
      },
    });
    expect(rec.ok(), await rec.text()).toBeTruthy();
    const act = await request.get(`${API_URL}/api/v1/activity?limit=50`);
    const rows = await act.json();
    const hit = rows.some(
      (row: { merchant_label?: string; source?: string }) =>
        row.source === 'crawler' && /example/i.test(row.merchant_label ?? ''),
    );
    expect(hit, 'crawler activity row should exist after snapshot').toBeTruthy();
  });

  test('Worker POST /shopping/compare returns five retailer rows (live HTML)', async ({ request }) => {
    const r = await request.post(`${WORKER_URL}/shopping/compare`, {
      data: { query: 'desk lamp' },
      timeout: 120_000,
    });
    expect(r.ok(), await r.text()).toBeTruthy();
    const j = await r.json();
    expect(Array.isArray(j.retailers)).toBeTruthy();
    expect(j.retailers).toHaveLength(5);
    const ids = j.retailers.map((x: { retailer_id: string }) => x.retailer_id).sort();
    expect(ids).toEqual(['amazon', 'bestbuy', 'ebay', 'target', 'walmart']);
  });

  test('API POST /shopping/compare proxies worker', async ({ request }) => {
    const r = await request.post(`${API_URL}/api/v1/shopping/compare`, {
      data: { query: 'usb hub' },
      timeout: 120_000,
    });
    expect(r.ok(), await r.text()).toBeTruthy();
    const j = await r.json();
    expect(j.retailers).toHaveLength(5);
    expect(Array.isArray(j.tips)).toBeTruthy();
    expect(Array.isArray(j.stacking_notes)).toBeTruthy();
    expect(Array.isArray(j.rewards_by_retailer)).toBeTruthy();
    expect(j.rewards_by_retailer).toHaveLength(5);
    expect(j.user_rewards_context).toBeTruthy();
    expect(Array.isArray(j.user_rewards_context.personalized_tips)).toBeTruthy();
    const issuers = j.user_rewards_context.detected_issuers as string[];
    expect(issuers).toContain('chase');
    expect(issuers).toContain('amex');
    expect(issuers).toContain('discover');
    expect(issuers).toContain('wells_fargo');
  });
});

test.describe('UI — Dashboard', () => {
  test.beforeEach(async ({ page, request }) => {
    const s = await probeServices(request);
    test.skip(!s.app || !s.api, `Need app (${s.app}) and api (${s.api})`);
  });

  test('loads portfolio from real API (network)', async ({ page }) => {
    const res = page.waitForResponse(
      (r) => r.url().includes('/api/v1/portfolio/summary') && r.request().method() === 'GET' && r.ok(),
    );
    await page.goto('/');
    await res;
    await expect(page.getByRole('heading', { name: 'Total Liquid Value' })).toBeVisible();
    await expect(page.locator('text=Could not load data')).toHaveCount(0);
    await expect(page.getByText(/pts/).first()).toBeVisible();
  });

  test('shows dashboard sections from live data', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse((r) => r.url().includes('/api/v1/portfolio/summary') && r.ok());
    await expect(page.getByText('Top Opportunity')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Category Allocation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Point Growth Velocity' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Transaction Stream' })).toBeVisible();
  });

  test('user types in global search (real input, no API mock)', async ({ page }) => {
    await page.goto('/');
    const search = page.getByTestId('global-search');
    await expect(search).toBeVisible();
    await search.fill('United MileagePlus');
    await expect(search).toHaveValue('United MileagePlus');
  });

  test('sidebar & header controls render', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('sidebar-optimize-cta')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(page.getByTestId('dashboard-execute-transfer')).toBeVisible();
  });

  test('View All navigates to history', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /View All/i }).click();
    await expect(page).toHaveURL(/\/history$/);
  });

  test('recent stream lists live activity rows (API order: newest first)', async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse((r) => r.url().includes('/api/v1/activity') && r.ok());
    await expect(page.getByRole('heading', { name: 'Recent Transaction Stream' })).toBeVisible();
    const ledgerBody = page.locator('main').getByRole('table').locator('tbody');
    await expect(ledgerBody).not.toContainText('No activity rows yet');
    // After e2e crawls, newest rows may be crawler titles; seed data includes Marriott / Delta / Le Bernardin.
    await expect(ledgerBody).toContainText(/Marriott|Delta|Bernardin|Example Domain/, { timeout: 30_000 });
  });

  test('Help Center and Sign Out links exist in sidebar', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Help Center/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign Out/i })).toBeVisible();
  });
});

test.describe('UI — Navigation', () => {
  test.beforeEach(async ({ request }) => {
    const s = await probeServices(request);
    test.skip(!s.app || !s.api, 'Need app and api');
  });

  test('Portfolio page shows cards heading and API-driven list', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForResponse((r) => r.url().includes('/api/v1/portfolio/summary') && r.ok());
    await expect(page.getByRole('heading', { name: 'Portfolio', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Cards/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Loyalty/i })).toBeVisible();
  });

  test('Optimization page shows crawl form and recommendations', async ({ page }) => {
    await page.goto('/optimization');
    await page.waitForResponse((r) => r.url().includes('/api/v1/recommendations') && r.ok());
    await expect(page.getByRole('heading', { name: 'Optimization', exact: true })).toBeVisible();
    await expect(page.getByTestId('crawl-url-input')).toBeVisible();
    await expect(page.getByTestId('crawl-submit')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Transfer & bonus opportunities' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review' }).first()).toBeVisible();
  });

  test('History page loads ledger via API', async ({ page }) => {
    await page.goto('/history');
    await page.waitForResponse((r) => r.url().includes('/api/v1/activity') && r.ok());
    await expect(page.getByRole('heading', { name: 'Transaction History' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
  });

  test('sidebar links switch routes', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-portfolio').click();
    await expect(page).toHaveURL(/\/portfolio$/);
    await page.getByTestId('nav-optimization').click();
    await expect(page).toHaveURL(/\/optimization$/);
    await page.getByTestId('nav-history').click();
    await expect(page).toHaveURL(/\/history$/);
    await page.getByTestId('nav-shopping').click();
    await expect(page).toHaveURL(/\/shopping$/);
    await page.getByTestId('nav-dashboard').click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('Shopping page shows compare form', async ({ page }) => {
    await page.goto('/shopping');
    await expect(page.getByRole('heading', { name: 'Shop smarter' })).toBeVisible();
    await expect(page.getByTestId('shop-compare-query')).toBeVisible();
    await expect(page.getByTestId('shop-compare-submit')).toBeVisible();
  });
});

test.describe('UI — User-driven crawl → visible result', () => {
  test.beforeEach(async ({ request }) => {
    const s = await probeServices(request);
    test.skip(!s.app || !s.api || !s.worker, 'Need app, api, and worker for crawl');
  });

  test('user enters URL and triggers real worker + API persist', async ({ page }) => {
    const userUrl = 'https://example.com';
    await page.goto('/optimization');

    const workerWait = page.waitForResponse(
      (r) => r.url().includes('/crawl') && r.request().method() === 'POST' && r.ok(),
    );
    const apiWait = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/integrations/crawl-snapshot') &&
        r.request().method() === 'POST' &&
        r.ok(),
    );

    await page.getByTestId('crawl-url-input').clear();
    await page.getByTestId('crawl-url-input').fill(userUrl);
    await expect(page.getByTestId('crawl-url-input')).toHaveValue(userUrl);

    await page.getByTestId('crawl-submit').click();
    await workerWait;
    await apiWait;

    await expect(page.locator('text=Example Domain').first()).toBeVisible({ timeout: 30_000 });
  });

  test('history refresh refetches activity from API', async ({ page }) => {
    await page.goto('/history');
    const refetch = page.waitForResponse(
      (r) => r.url().includes('/api/v1/activity') && r.request().method() === 'GET' && r.ok(),
    );
    await page.getByTestId('history-refresh').click();
    await refetch;
    await expect(page.getByRole('heading', { name: 'Transaction History' })).toBeVisible();
  });

  test('user runs multi-retailer compare (API → worker, no route mocks)', async ({ page }) => {
    await page.goto('/shopping');
    const res = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/shopping/compare') &&
        r.request().method() === 'POST' &&
        r.ok(),
      { timeout: 120_000 },
    );
    await page.getByTestId('shop-compare-query').clear();
    await page.getByTestId('shop-compare-query').fill('webcam');
    await page.getByTestId('shop-compare-submit').click();
    await res;
    await expect(page.getByTestId('shop-retailer-row-amazon')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('shop-retailer-row-ebay')).toBeVisible();
    await expect(page.getByTestId('shop-rewards-wallet')).toBeVisible();
    await expect(page.getByTestId('shop-rewards-retailer-amazon')).toBeVisible();
  });
});

test.describe('UI — edge', () => {
  test.beforeEach(async ({ request }) => {
    const s = await probeServices(request);
    test.skip(!s.app, 'Need app');
  });

  test('unknown path still shows shell and not-found content', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText('Zenith', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
