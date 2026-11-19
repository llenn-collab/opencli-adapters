import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { parseLibrary } from './response.mjs';
import { qwenApiJson } from './qwen-api.mjs';

cli({
  site: 'qwen-studio', name: 'library', description: 'List Qwen library items',
  domain: 'chat.qwen.ai', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent',
  func: async (page) => {
    const payload = await qwenApiJson(page, '/api/v2/library/list?type=all');
    try { return parseLibrary(payload); }
    catch (error) { throw new CommandExecutionError(error.message); }
  },
});
