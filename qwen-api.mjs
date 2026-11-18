export async function qwenApiJson(page, path, method = 'GET') {
  if (!path.startsWith('/api/v2/')) throw new Error('Unsupported Qwen API path');
  await page.goto('https://chat.qwen.ai/');
  return page.evaluate(async ({ path, method }) => {
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
