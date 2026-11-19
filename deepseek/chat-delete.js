import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { parseConversationId } from './chat-detail.js';

// Exact sidebar lookup: the href must contain this conversation UUID.
function countConversationLinks(page, id) {
  return page.evaluate((conversationId) => {
    // data-deepseek-delete-find
    return [...document.querySelectorAll('a[href*="/a/chat/s/"]')].filter((link) => {
      const match = (link.getAttribute('href') || '')
        .match(/\/a\/chat\/s\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      return match && match[1].toLowerCase() === conversationId;
    }).length;
  }, id);
}

// The per-item "…" menu only renders while the item is hovered. The bridge page
// exposes a real hover; the in-page fallback exists for pages that do not.
async function hoverConversation(page, id) {
  const selector = `a[href*="/a/chat/s/${id}"]`;
  if (typeof page.hover === 'function') {
    await page.hover(selector);
    return;
  }
  await page.evaluate((conversationId) => {
    const link = [...document.querySelectorAll('a[href*="/a/chat/s/"]')].find((node) => {
      const match = (node.getAttribute('href') || '')
        .match(/\/a\/chat\/s\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      return match && match[1].toLowerCase() === conversationId;
    });
    if (!link) return;
    const rect = link.getBoundingClientRect();
    const init = {
      bubbles: true, cancelable: true, view: window,
      clientX: Math.round(rect.left + rect.width / 2),
      clientY: Math.round(rect.top + rect.height / 2),
    };
    link.dispatchEvent(new MouseEvent('mouseover', init));
    link.dispatchEvent(new MouseEvent('mouseenter', init));
    link.dispatchEvent(new MouseEvent('mousemove', init));
  }, id);
}

export async function deleteConversation(page, id) {
  let url = await page.getCurrentUrl();
  if (url === 'about:blank') {
    await page.goto('https://chat.deepseek.com/');
    url = await page.getCurrentUrl();
  }
  if (!url?.startsWith('https://chat.deepseek.com/')) {
    throw new CommandExecutionError('Open the signed-in DeepSeek tab before using chat-delete');
  }

  const present = await countConversationLinks(page, id);
  if (present === 0) {
    throw new CommandExecutionError(`conversation ${id} is not visible in the sidebar; it may be virtualized away or already deleted — verify with deepseek-chat chats`);
  }
  if (present > 1) {
    throw new CommandExecutionError(`conversation ${id} appears ${present} times in the sidebar; refusing to guess which entry to delete`);
  }

  await hoverConversation(page, id);

  let menuOpened = false;
  for (let attempt = 0; attempt < 5 && !menuOpened; attempt++) {
    if (attempt) await page.wait(0.3);
    menuOpened = await page.evaluate((conversationId) => {
      // data-deepseek-delete-menu
      const link = [...document.querySelectorAll('a[href*="/a/chat/s/"]')].find((node) => {
        const match = (node.getAttribute('href') || '')
          .match(/\/a\/chat\/s\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        return match && match[1].toLowerCase() === conversationId;
      });
      if (!link || !link.parentElement) return false;
      // Observed: a ~28px ds-button--icon control inside the item container.
      const button = [...link.parentElement.querySelectorAll('[class*="ds-button--icon"]')].find((node) => {
        const rect = node.getBoundingClientRect();
        return node.getClientRects().length > 0 && rect.width <= 40 && rect.height <= 40;
      });
      if (!button) return false;
      button.click();
      return true;
    }, id);
  }
  if (!menuOpened) {
    throw new CommandExecutionError(`the conversation menu for ${id} did not open; nothing was deleted`);
  }

  // The dropdown can render a beat after the menu button click; poll before
  // giving up. The menu action is not destructive, so a lost click is retried
  // only within these bounded probes; the destructive click below is not.
  let picked = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt) await page.wait(0.5);
    picked = await page.evaluate(() => {
      // data-deepseek-delete-item
      const selector = '[class*="ds-dropdown-menu-option"]';
      const items = [...document.querySelectorAll(selector)]
        .filter((node) => !node.querySelector(selector) && node.getClientRects().length > 0);
      const matches = items.filter((node) => (node.textContent || '').trim() === 'Delete');
      if (!matches.length) return 'missing';
      if (matches.length > 1) return 'ambiguous';
      matches[0].click();
      return 'clicked';
    });
    if (picked !== 'missing') break;
  }
  if (picked !== 'clicked') {
    throw new CommandExecutionError(`the Delete item for conversation ${id} was ${picked} in the conversation menu; nothing was deleted`);
  }

  const findConfirm = (click) => page.evaluate((doClick) => {
    // data-deepseek-delete-confirm
    const dialogs = [...document.querySelectorAll('[role="dialog"].ds-modal-content')]
      .filter((node) => node.getClientRects().length > 0 && (node.innerText || '').includes('cannot be recovered'));
    if (!dialogs.length) return 'missing';
    if (dialogs.length > 1) return 'ambiguous';
    const controls = [...dialogs[0].querySelectorAll('[class*="ds-button--error"]')]
      .filter((node) => node.getClientRects().length > 0 && (node.textContent || '').trim() === 'Delete chat');
    if (!controls.length) return 'no_confirm';
    if (controls.length > 1) return 'ambiguous';
    if (!doClick) return 'seen';
    controls[0].click();
    return 'clicked';
  }, click);

  // The confirmation modal renders asynchronously after the menu action.
  let confirmed = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt) await page.wait(0.5);
    confirmed = await findConfirm(true);
    if (confirmed !== 'missing') break;
  }
  if (confirmed !== 'clicked') {
    throw new CommandExecutionError(`the delete confirmation for conversation ${id} was ${confirmed}; nothing was deleted`);
  }

  // The single destructive click has happened; never repeat it. Trust it only
  // once the dialog closes — a dialog that stays open means the click did not
  // take, and re-clicking is not allowed.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (await findConfirm(false) === 'missing') break;
    if (attempt === 5) {
      throw new CommandExecutionError(`the delete confirmation click for conversation ${id} did not close the dialog; refusing to retry — inspect deepseek-chat chats`);
    }
    await page.wait(0.5);
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await countConversationLinks(page, id) === 0) return { deleted: true, id };
    await page.wait(0.5);
  }
  throw new CommandExecutionError(`deletion could not be verified; conversation ${id} still visible — inspect deepseek-chat chats`);
}

export const chatDeleteCommand = cli({
  site: 'deepseek-chat', name: 'chat-delete', description: 'Delete a DeepSeek conversation after confirming it in the sidebar',
  domain: 'chat.deepseek.com', access: 'write', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent',
  args: [{ name: 'id', positional: true, required: true, help: 'DeepSeek conversation UUID' }],
  columns: ['deleted', 'id'],
  func: async (page, args) => {
    const id = parseConversationId(args.id);
    return [await deleteConversation(page, id)];
  },
});
