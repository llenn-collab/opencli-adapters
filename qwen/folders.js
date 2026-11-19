import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { parseArrayData } from './response.mjs';
import { qwenApiJson } from './qwen-api.mjs';

cli({
  site: 'qwen-studio', name: 'folders', description: 'List Qwen folders outside projects',
  domain: 'chat.qwen.ai', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent',
  func: async (page) => {
    const payload = await qwenApiJson(page, '/api/v2/folders/?exclude_project=true');
    try { return parseArrayData(payload, 'folder list'); }
    catch (error) { throw new CommandExecutionError(error.message); }
  },
});
