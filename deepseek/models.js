import { cli, Strategy } from '@jackwener/opencli/registry';
import { discoverModels } from './model-ui.mjs';
import { deepseekApiJson } from './deepseek-api.mjs';
import { parseLoginStatus } from './response.mjs';
import { CommandExecutionError } from '@jackwener/opencli/errors';
export async function listModels(page) {
  const status = parseLoginStatus(await deepseekApiJson(page, '/api/v0/users/current'));
  if (!status.logged_in) throw new CommandExecutionError('DeepSeek is not signed in; sign in to chat.deepseek.com first');
  return discoverModels(page);
}
cli({
  site: 'deepseek-chat', name: 'models', description: 'List models available in the current DeepSeek account',
  domain: 'chat.deepseek.com', access: 'read', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent', columns: ['label', 'selected', 'disabled'],
  func: listModels,
});
