import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { parseConversationList } from './response.mjs';

// Observed conversation list source: sidebar links a[href*="/a/chat/s/"]. The
// visible list is virtualized, so this returns the currently rendered window.
export async function listConversations(page) {
  let url = await page.getCurrentUrl();
  if (url === 'about:blank') {
    await page.goto('https://chat.deepseek.com/');
    url = await page.getCurrentUrl();
  }
  if (!url?.startsWith('https://chat.deepseek.com/')) throw new CommandExecutionError('Open the signed-in DeepSeek tab first');
  const items = await page.evaluate(() => {
    const pinnedHeader = /^\s*(置\s*顶|Pinned)\s*$/i;
    return [...document.querySelectorAll('a[href*="/a/chat/s/"]')].map((link) => {
      const href = link.getAttribute('href') || '';
      const idMatch = href.match(/\/s\/([a-f0-9-]+)/i);
      const section = link.parentElement;
      const header = section && section.firstElementChild;
      const pinned = header && header !== link
        && pinnedHeader.test((header.innerText || header.textContent || '').trim());
      return {
        id: idMatch ? idMatch[1].toLowerCase() : '',
        title: (link.innerText || '').trim().split('\n')[0].trim() || '(untitled)',
        pinned: Boolean(pinned),
      };
    }).filter((item) => item.id);
  });
  try { return parseConversationList(items); }
  catch (error) { throw new CommandExecutionError(error.message); }
}
cli({
  site: 'deepseek-chat', name: 'chats', description: 'List recent DeepSeek conversations',
  domain: 'chat.deepseek.com', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent',
  columns: ['id', 'title', 'pinned'],
  func: listConversations,
});
