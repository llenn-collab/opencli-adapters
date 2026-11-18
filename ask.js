import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';

const modes = { web_dev: 'Web Dev', web_search: 'Web search', deep_research: 'Deep Research' };
const thinkingModes = ['auto', 'thinking', 'fast'];

export function validateAskArgs(args) {
  const thinking = String(args.thinking ?? 'auto').toLowerCase();
  const mode = String(args.mode ?? '');
  if (!thinkingModes.includes(thinking)) throw new CommandExecutionError('thinking must be auto, thinking, or fast');
  if (mode && !Object.hasOwn(modes, mode)) throw new CommandExecutionError('mode must be web_dev, web_search, or deep_research');
  if (typeof args.prompt !== 'string' || !args.prompt.trim()) throw new CommandExecutionError('prompt is required');
  const timeout = Number(args.timeout ?? 1800);
  if (!Number.isInteger(timeout) || timeout < 10 || timeout > 3600) {
    throw new CommandExecutionError('timeout must be an integer between 10 and 3600 seconds');
  }
  return { prompt: args.prompt, thinking, mode, timeout };
}

export function extractChatId(path) {
  return path?.match(/^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i)?.[1];
}

export function parseCompletedMessages(payload, generating) {
  if (payload?.success !== true) throw new CommandExecutionError('Qwen returned an unexpected conversation response');
  const messages = payload?.data?.chat?.history?.messages;
  // A new chat can exist in the URL before its history endpoint is ready.
  if (!messages || typeof messages !== 'object' || Array.isArray(messages)) return null;
  const ordered = Object.values(messages);
  if (ordered.some((message) => typeof message?.id !== 'string' || typeof message.role !== 'string' || typeof message.content !== 'string')) {
    throw new CommandExecutionError('Qwen returned an unexpected message in the conversation response');
  }
  ordered.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  const assistant = ordered.filter((message) => message.role === 'assistant').at(-1);
  if (!assistant || assistant.done !== true || generating) return null;
  if (typeof assistant.content !== 'string' || !assistant.content) {
    throw new CommandExecutionError('Qwen completed the request without a response; check account limits or site errors');
  }
  return ordered.map(({ id, role, content, timestamp }) => ({ id, role, content, timestamp: timestamp ?? null }));
}

export async function pollForResponse(read, wait, deadline, now = Date.now) {
  let lastTransientError;
  while (now() < deadline) {
    const result = await read(deadline - now());
    if (result?.pollError) {
      const { kind, status } = result.pollError;
      const retryable = kind === 'network' || (kind === 'http' && (status === 429 || status >= 500));
      if (!retryable) {
        const reason = kind === 'auth' ? `authentication failed: HTTP ${status}`
          : kind === 'http' ? `conversation read failed: HTTP ${status}`
            : kind === 'invalid_json' ? 'conversation response was not valid JSON'
              : 'conversation request failed';
        throw new CommandExecutionError(`Qwen ${reason}`);
      }
      lastTransientError = kind === 'network' ? 'network errors' : `HTTP ${status}`;
    } else {
      const messages = parseCompletedMessages(result?.data, result?.generating);
      if (messages) return messages;
    }
    const remaining = deadline - now();
    if (remaining > 0) await wait(Math.min(1, remaining / 1000));
  }
  if (lastTransientError) throw new CommandExecutionError(`Timed out waiting for Qwen response after transient ${lastTransientError}`);
  return null;
}

cli({
  site: 'qwen-studio', name: 'ask', description: 'Start a new Qwen conversation and return its response',
  access: 'write', strategy: Strategy.COOKIE, browser: true, domain: 'chat.qwen.ai',
  navigateBefore: false, siteSession: 'persistent',
  args: [
    { name: 'prompt', positional: true, required: true, help: 'Prompt to send' },
    { name: 'thinking', type: 'str', default: 'auto', choices: thinkingModes, help: 'Thinking mode' },
    { name: 'mode', type: 'str', help: 'Optional mode: web_dev, web_search, deep_research' },
    { name: 'attachment', type: 'str', help: 'Optional local file to attach' },
    { name: 'timeout', type: 'int', default: 1800, help: 'Maximum seconds to wait for the assistant (10–3600)' },
  ],
  columns: ['role', 'content'],
  func: async (page, args) => {
    const { prompt, thinking, mode, timeout } = validateAskArgs(args);
    const currentUrl = await page.getCurrentUrl();
    if (!currentUrl?.startsWith('https://chat.qwen.ai/')) {
      throw new CommandExecutionError('Open the signed-in Qwen tab before using ask');
    }
    await page.wait({ selector: '[aria-label="New Chat"]', timeout: 30 });
    const clickText = async (selector, text) => page.evaluate(({ selector, text }) => {
      const node = [...document.querySelectorAll(selector)].find((element) => element.textContent.replace(/\s+/g, ' ').trim().startsWith(text));
      if (!node) throw new Error(`Qwen control not found: ${text}`);
      node.click();
    }, { selector, text });
    await page.click('[aria-label="New Chat"]');
    const chooseMode = async (label) => {
      await page.click('[aria-label="Select Mode"]');
      await page.wait({ selector: '[role="menuitem"]', timeout: 10 });
      await clickText('[role="menuitem"]', label);
    };
    await page.evaluate(() => {
      const control = [...document.querySelectorAll('span')].find((element) => ['Auto', 'Thinking', 'Fast'].includes(element.textContent.trim()));
      if (!control) throw new Error('Qwen thinking selector not found');
      control.click();
    });
    await page.wait({ selector: '[role="menuitem"]', timeout: 10 });
    await clickText('[role="menuitem"]', thinking === 'auto' ? 'Auto' : thinking === 'thinking' ? 'Thinking' : 'Fast');
    if (args.attachment) await chooseMode('Upload attachment');
    if (args.attachment) {
      if (!page.setFileInput) throw new CommandExecutionError('This OpenCLI browser runtime does not support file uploads');
      try {
        await page.setFileInput([String(args.attachment)], '#filesUpload');
      } catch (error) {
        throw new CommandExecutionError(`Qwen attachment upload failed in the current browser session: ${error.message}`);
      }
    }
    if (mode) await chooseMode(modes[mode]);
    await page.fillText('textarea', prompt);
    await page.pressKey('Enter');
    const deadline = Date.now() + timeout * 1000;
    let chatId;
    while (Date.now() < deadline) {
      const path = await page.evaluate(() => location.pathname);
      chatId = extractChatId(path);
      if (chatId) break;
      await page.wait(0.5);
    }
    if (!chatId) throw new CommandExecutionError('Qwen did not open a conversation after sending the prompt');
    const result = await pollForResponse(async () => {
      try { return await page.evaluate(async ({ id, timeoutMs }) => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Qwen localStorage token is missing; sign in to chat.qwen.ai first');
        let response;
        try {
          response = await fetch(`/api/v2/chats/${encodeURIComponent(id)}?direction=up&limit=10`, {
            credentials: 'include', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            signal: AbortSignal.timeout(Math.max(1, timeoutMs)),
          });
        } catch { return { pollError: { kind: 'network' } }; }
        if (response.status === 401 || response.status === 403) return { pollError: { kind: 'auth', status: response.status } };
        if (!response.ok) return { pollError: { kind: 'http', status: response.status } };
        let data;
        try { data = await response.json(); }
        catch { return { pollError: { kind: 'invalid_json' } }; }
        const generating = Boolean(document.querySelector('[aria-label*="Stop generating"], [aria-label*="Stop response"], [data-testid*="stop-generating"]'));
        return { data, generating };
      }, { id: chatId, timeoutMs }); }
      catch (error) {
        throw new CommandExecutionError(`Could not read the Qwen response in the current browser session: ${error.message}`);
      }
    }, (seconds) => page.wait(seconds), deadline);
    if (result) return result;
    throw new CommandExecutionError(`Timed out waiting for Qwen response in conversation ${chatId}`);
  },
});
