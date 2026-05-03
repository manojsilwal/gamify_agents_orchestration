export default async function globalSetup() {
  const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';
  const API_URL = process.env.API_URL ?? 'http://localhost:8000';

  try {
    const appResponse = await fetch(APP_URL);
    if (!appResponse.ok) console.warn(`APP_URL reachable but returned ${appResponse.status}`);
  } catch (e) {
    console.warn(`WARNING: APP_URL not reachable: ${e}`);
  }

  try {
    const healthResponse = await fetch(`${API_URL}/health`);
    if (!healthResponse.ok) {
      console.warn('WARNING: API health endpoint not reachable. API-level tests may fail.');
    }
  } catch (e) {
    console.warn('WARNING: API health endpoint not reachable. API-level tests may fail.');
  }

  console.log('✅ Global setup complete');
}
