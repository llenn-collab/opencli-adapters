import { cli, Strategy } from '@jackwener/opencli/registry';
import { discoverModels } from './model-ui.mjs';
import { qwenApiJson } from './qwen-api.mjs';
import { parseLoginStatus } from './response.mjs';
import { CommandExecutionError } from '@jackwener/opencli/errors';

export async function listModels(page) {
  const status = parseLoginStatus(await qwenApiJson(page, '/api/v2/users/status', 'POST'));
  if (!status.logged_in) throw new CommandExecutionError('Qwen is not signed in; sign in to chat.qwen.ai first');
  const models = await discoverModels(page);
  await page.click('[aria-label="Select Model"]');
  return models;
}

cli({
  site: 'qwen-studio', name: 'models', description: 'List models available in the current Qwen account',
  domain: 'chat.qwen.ai', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent', columns: ['label', 'selected', 'disabled'],
  func: listModels,
});
