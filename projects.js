import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { parseArrayData } from './response.mjs';
import { qwenApiJson } from './qwen-api.mjs';

cli({
  site: 'qwen-studio', name: 'projects', description: 'List Qwen projects',
  domain: 'chat.qwen.ai', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent',
  func: async (page) => {
    const payload = await qwenApiJson(page, '/api/v2/projects/');
    try { return parseArrayData(payload, 'project list'); }
    catch (error) { throw new CommandExecutionError(error.message); }
  },
});
