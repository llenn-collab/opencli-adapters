export async function qwenApiJson(page, path, method = 'GET') {
  if (!path.startsWith('/api/v2/')) throw new Error('Unsupported Qwen API path');
  let url = await page.getCurrentUrl();
  if (url === 'about:blank') {
    await page.goto('https://chat.qwen.ai/');
    url = await page.getCurrentUrl();
  }
  if (!url?.startsWith('https://chat.qwen.ai/')) throw new Error('Open the signed-in Qwen tab first');
  return page.evaluate(async ({ path, method }) => {
    if (location.origin !== 'https://chat.qwen.ai') throw new Error('Qwen page changed; open the signed-in Qwen tab first');
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Qwen localStorage token is missing; sign in to chat.qwen.ai first');
    const response = await fetch(path, {
      method,
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Qwen API authentication failed: HTTP ${response.status}`);
    }
    if (!response.ok) throw new Error(`Qwen API failed: HTTP ${response.status}`);
    return response.json();
  }, { path, method });
}
