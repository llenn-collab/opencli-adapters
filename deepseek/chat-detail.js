import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { parseVisibleMessages } from './response.mjs';

const CONVERSATION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseConversationId(input) {
  const id = String(input ?? '').trim().toLowerCase();
  if (!CONVERSATION_ID_RE.test(id)) {
    throw new CommandExecutionError('Conversation ID must be a DeepSeek conversation UUID');
  }
  return id;
}

// Observed read path: visible .ds-message bubbles on the conversation page.
// DeepSeek virtualizes the message list, so this returns the rendered window.
export async function readVisibleMessages(page, id) {
  await page.goto(`https://chat.deepseek.com/a/chat/s/${encodeURIComponent(id)}`);
  try { await page.wait({ selector: '.ds-message', timeout: 10 }); }
  catch { /* empty or slow conversation; the rows below decide */ }
  const rows = await page.evaluate(() => {
    return [...document.querySelectorAll('.ds-message')].map((node) => ({
      role: node.className.split(/\s+/).length > 2 ? 'user' : 'assistant',
      content: (node.innerText || '').trim(),
    })).filter((row) => row.content);
  });
  try { return parseVisibleMessages(rows); }
  catch (error) { throw new CommandExecutionError(error.message); }
}
cli({
  site: 'deepseek-chat', name: 'chat-detail', description: 'Read visible messages from a DeepSeek conversation',
  domain: 'chat.deepseek.com', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent',
  args: [{ name: 'id', positional: true, required: true, help: 'DeepSeek conversation UUID' }],
  columns: ['role', 'content'],
  func: async (page, args) => {
    return readVisibleMessages(page, parseConversationId(args.id));
  },
});
