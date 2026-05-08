const APP_URL = process.env.APP_URL ?? 'http://127.0.0.1:5173';
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:8000';
const WORKER_URL = process.env.WORKER_URL ?? 'http://127.0.0.1:8001';

export default async function globalSetup() {
  const checks: string[] = [];

  for (const [name, url] of [
    ['APP (Vite)', APP_URL],
    ['API', `${API_URL}/health`],
    ['Worker', `${WORKER_URL}/health`],
  ] as const) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      checks.push(`${name}: ${r.ok ? 'OK' : `HTTP ${r.status}`} (${url})`);
    } catch (e) {
      checks.push(`${name}: UNREACHABLE (${url}) — ${e}`);
    }
  }

  console.log('[playwright global-setup]', checks.join('\n'));
}
