import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { assertFreshChat, openConversation, waitForPageReady } from './ask.js';

export const newCommand = cli({
  site: 'deepseek-chat', name: 'new', description: 'Start a new DeepSeek chat and verify the composer is empty',
  domain: 'chat.deepseek.com', access: 'write', strategy: Strategy.COOKIE, browser: true,
  navigateBefore: false, siteSession: 'persistent',
  columns: ['status'],
  func: async (page) => {
    let url = await page.getCurrentUrl();
    if (url === 'about:blank') {
      await page.goto('https://chat.deepseek.com/');
      url = await page.getCurrentUrl();
    }
    if (!url?.startsWith('https://chat.deepseek.com/')) {
      throw new CommandExecutionError('Open the signed-in DeepSeek tab before using new');
    }
    await openConversation(page, '');
    await waitForPageReady(page);
    await assertFreshChat(page, 'new chat was not started');
    return [{ status: 'new chat started' }];
  },
});
