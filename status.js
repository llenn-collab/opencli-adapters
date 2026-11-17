import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { parseLoginStatus } from './response.mjs';
import { qwenApiJson } from './qwen-api.mjs';

cli({
  site: 'qwen-studio', name: 'status', description: 'Check whether the current Qwen session is logged in',
  domain: 'chat.qwen.ai', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent', columns: ['logged_in', 'site'],
  func: async (page) => {
    const payload = await qwenApiJson(page, '/api/v2/users/status', 'POST');
    try { return parseLoginStatus(payload); }
    catch (error) { throw new CommandExecutionError(error.message); }
  },
});
