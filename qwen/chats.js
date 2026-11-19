import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { buildChatsPath, parseChats } from './response.mjs';
import { qwenApiJson } from './qwen-api.mjs';

cli({
  site: 'qwen-studio', name: 'chats', description: 'List recent Qwen conversations',
  domain: 'chat.qwen.ai', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent',
  args: [{ name: 'page', type: 'int', default: 1, help: 'One-based result page' }],
  columns: ['id', 'title', 'updated_at', 'pinned'],
  func: async (page, args) => {
    let path;
    try { path = buildChatsPath(Number(args.page ?? 1)); }
    catch (error) { throw new CommandExecutionError(error.message); }
    const payload = await qwenApiJson(page, path);
    try { return parseChats(payload); }
    catch (error) { throw new CommandExecutionError(error.message); }
  },
});
