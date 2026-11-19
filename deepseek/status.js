import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { parseLoginStatus } from './response.mjs';
import { deepseekApiJson } from './deepseek-api.mjs';
cli({
  site: 'deepseek-chat', name: 'status', description: 'Check whether the current DeepSeek session is logged in',
  domain: 'chat.deepseek.com', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent', columns: ['logged_in', 'site'],
  func: async (page) => {
    const payload = await deepseekApiJson(page, '/api/v0/users/current');
    try { return parseLoginStatus(payload); }
    catch (error) { throw new CommandExecutionError(error.message); }
  },
});
