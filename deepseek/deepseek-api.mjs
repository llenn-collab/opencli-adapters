// Observed DeepSeek transport: Bearer token from localStorage.userToken (JSON
// {value} or raw string). Only /api/v0/ paths are used by this adapter.
export async function deepseekApiJson(page, path, method = 'GET') {
  if (!path.startsWith('/api/v0/')) throw new Error('Unsupported DeepSeek API path');
  let url = await page.getCurrentUrl();
  if (url === 'about:blank') {
    await page.goto('https://chat.deepseek.com/');
    url = await page.getCurrentUrl();
  }
  if (!url?.startsWith('https://chat.deepseek.com/')) throw new Error('Open the signed-in DeepSeek tab first');
  return page.evaluate(async ({ path, method }) => {
    if (location.origin !== 'https://chat.deepseek.com') throw new Error('DeepSeek page changed; open the signed-in DeepSeek tab first');
    let token = '';
    const raw = localStorage.getItem('userToken');
    if (raw) { try { token = JSON.parse(raw).value || ''; } catch { token = raw; } }
    if (!token) throw new Error('DeepSeek userToken is missing; sign in to chat.deepseek.com first');
    const response = await fetch(path, {
      method,
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error(`DeepSeek API authentication failed: HTTP ${response.status}`);
    }
    if (!response.ok) throw new Error(`DeepSeek API failed: HTTP ${response.status}`);
    return response.json();
  }, { path, method });
}
