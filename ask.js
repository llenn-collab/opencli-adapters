import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { selectModel } from './model-ui.mjs';
import { messageContent, orderReplies } from './message-content.mjs';

const modes = { web_dev: 'Web Dev', web_search: 'Web search', deep_research: 'Deep Research' };
const thinkingModes = ['auto', 'thinking', 'fast'];

export function validateAskArgs(args) {
  const thinking = String(args.thinking ?? 'auto').toLowerCase();
  const mode = String(args.mode ?? '');
  if (!thinkingModes.includes(thinking)) throw new CommandExecutionError('thinking must be auto, thinking, or fast');
  if (mode && !Object.hasOwn(modes, mode)) throw new CommandExecutionError('mode must be web_dev, web_search, or deep_research');
  if (typeof args.prompt !== 'string' || !args.prompt.trim()) throw new CommandExecutionError('prompt is required');
  if (args.model !== undefined && (typeof args.model !== 'string' || !args.model.trim())) {
    throw new CommandExecutionError('model must be a nonempty model label');
  }
  const timeout = Number(args.timeout ?? 1800);
  if (!Number.isInteger(timeout) || timeout < 10 || timeout > 3600) {
    throw new CommandExecutionError('timeout must be an integer between 10 and 3600 seconds');
  }
  const conversationId = String(args['conversation-id'] ?? '');
  if (conversationId && extractChatId(`/c/${conversationId}`) !== conversationId) {
    throw new CommandExecutionError('conversation_id must be a valid Qwen conversation UUID');
  }
  return { prompt: args.prompt, thinking, mode, timeout, conversationId };
}

export function extractChatId(path) {
  return path?.match(/^\/c\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i)?.[1];
}

export async function openConversation(page, conversationId) {
  if (conversationId) return page.goto(`https://chat.qwen.ai/c/${encodeURIComponent(conversationId)}`);
  return page.click('[aria-label="New Chat"]');
}

export async function readConversation(page, id, timeoutMs) {
  return page.evaluate(async ({ id, timeoutMs }) => {
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
  }, { id, timeoutMs });
}

function parseConversationMessages(payload) {
  if (payload?.success !== true) throw new CommandExecutionError('Qwen returned an unexpected conversation response');
  const messages = payload?.data?.chat?.history?.messages;
  if (!messages || typeof messages !== 'object' || Array.isArray(messages)) return null;
  const ordered = Object.values(messages);
  if (ordered.some((message) => typeof message?.id !== 'string' || typeof message.role !== 'string' || typeof message.content !== 'string')) {
    throw new CommandExecutionError('Qwen returned an unexpected message in the conversation response');
  }
  ordered.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  return ordered;
}

export function conversationMessageIds(payload) {
  const messages = parseConversationMessages(payload);
  return messages ? new Set(messages.map((message) => message.id)) : null;
}

export async function captureConversationBaseline(page, conversationId, timeoutMs) {
  let result;
  try { result = await readConversation(page, conversationId, timeoutMs); }
  catch (error) {
    throw new CommandExecutionError(`Could not establish the existing conversation history before submitting: ${error.message}`);
  }
  if (result?.pollError) {
    throw new CommandExecutionError(`Could not establish the existing conversation history before submitting (${result.pollError.kind})`);
  }
  const messageIds = conversationMessageIds(result?.data);
  if (!messageIds) throw new CommandExecutionError('Could not establish the existing conversation history before submitting');
  return messageIds;
}

export function parseCompletedMessages(payload, generating, { baselineMessageIds = new Set(), prompt, includeMessages = false } = {}) {
  const ordered = parseConversationMessages(payload);
  if (!ordered || typeof prompt !== 'string') return null;
  const userIndex = ordered.findIndex((message) => !baselineMessageIds.has(message.id)
    && message.role === 'user' && message.content === prompt);
  if (userIndex < 0) return null;
  const user = ordered[userIndex];
  const linked = ordered.filter((message) => !baselineMessageIds.has(message.id)
    && message.role === 'assistant' && message.parentId === user.id);
  const assistants = linked.length ? linked : ordered.slice(userIndex + 1).filter((message) => !baselineMessageIds.has(message.id)
    && message.role === 'assistant' && message.parentId == null).slice(-1);
  if (!assistants.length || assistants.some((message) => message.done !== true) || generating) return null;
  const answers = assistants.map(messageContent);
  if (new Set(answers).size > 1) throw new CommandExecutionError('Qwen returned multiple different responses for this turn; cannot verify the intended response');
  const answer = answers[0];
  if (!answer) {
    throw new CommandExecutionError('Qwen completed the request without a response; check account limits or site errors');
  }
  const assistantIds = new Set(assistants.map((message) => message.id));
  let inTurnOrder = linked.length
    ? [...ordered.filter((message) => message.id !== user.id && !assistantIds.has(message.id)), user, ...assistants]
    : ordered;
  if (includeMessages) {
    inTurnOrder = orderReplies(inTurnOrder);
  }
  return inTurnOrder.map((message) => ({ id: message.id, role: message.role,
    content: assistantIds.has(message.id) ? answer : includeMessages ? messageContent(message) : message.content,
    timestamp: message.timestamp ?? null }));
}

export function formatAskResult(conversationId, messages, includeMessages = false, { prompt, baselineMessageIds = new Set() } = {}) {
  const userIndex = messages?.findIndex((message) => !baselineMessageIds.has(message.id)
    && message.role === 'user' && message.content === prompt);
  const answer = userIndex >= 0 && messages.slice(userIndex + 1).findLast((message) => !baselineMessageIds.has(message.id)
    && message.role === 'assistant');
  if (answer?.role !== 'assistant' || !answer.content) {
    throw new CommandExecutionError('Qwen completed the request without a response; check account limits or site errors');
  }
  return { answer: answer.content, conversation_id: conversationId, ...(includeMessages ? { messages } : {}) };
}

export async function pollForResponse(read, wait, deadline, now = Date.now, turn = {}) {
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
      lastTransientError = undefined;
      const messages = parseCompletedMessages(result?.data, result?.generating, turn);
      if (messages) return messages;
    }
    const remaining = deadline - now();
    if (remaining > 0) await wait(Math.min(1, remaining / 1000));
  }
  if (lastTransientError) throw new CommandExecutionError(`Timed out waiting for Qwen response after transient ${lastTransientError}`);
  return null;
}

export async function assertInputVisible(page) {
  let visibility;
  try { visibility = await page.evaluate(() => document.visibilityState); }
  catch { visibility = undefined; }
  if (visibility !== 'visible') {
    throw new CommandExecutionError('Qwen browser page is not visible or its visibility could not be checked; prompt was not submitted',
      'Select the Qwen tab and restore its browser window, then retry.');
  }
}

export async function assertPageReady(page) {
  const state = await page.evaluate(() => {
    // data-qwen-readiness: inspect only visible controls and dialogs.
    if (location.origin !== 'https://chat.qwen.ai') return 'wrong_page';
    const visible = (node) => node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
    const dialogs = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].filter(visible);
    if (dialogs.some((node) => /birth|age verification|year of birth/i.test(node.innerText))) return 'verification';
    if (dialogs.length) return 'blocked';
    if (!localStorage.getItem('token')) return 'login';
    const input = document.querySelector('textarea');
    return visible(input) && !input.disabled ? 'ready' : 'loading';
  });
  if (state === 'wrong_page') throw new CommandExecutionError('Qwen page changed; prompt was not submitted');
  if (state === 'verification') throw new CommandExecutionError('Qwen age verification required; complete it manually in the connected browser. Prompt was not submitted');
  if (state === 'blocked') throw new CommandExecutionError('Qwen requires action in the connected browser; resolve the dialog manually. Prompt was not submitted');
  if (state === 'login') throw new CommandExecutionError('Qwen sign-in required; sign in in the connected browser. Prompt was not submitted');
  return state === 'ready';
}

async function waitForPageReady(page) {
  for (let i = 0; i < 30; i++) {
    if (await assertPageReady(page)) return;
    await page.wait(1);
  }
  throw new CommandExecutionError('Qwen composer was not ready within 30 seconds; prompt was not submitted');
}

export const askCommand = cli({
  site: 'qwen-studio', name: 'ask', description: 'Start or continue a Qwen conversation and return its response',
  access: 'write', strategy: Strategy.COOKIE, browser: true, domain: 'chat.qwen.ai',
  navigateBefore: false, siteSession: 'persistent',
  args: [
    { name: 'prompt', positional: true, required: true, help: 'Prompt to send' },
    { name: 'thinking', type: 'str', default: 'auto', choices: thinkingModes, help: 'Thinking mode' },
    { name: 'model', type: 'str', help: 'Available model label from qwen-studio models' },
    { name: 'mode', type: 'str', help: 'Optional mode: web_dev, web_search, deep_research' },
    { name: 'attachment', type: 'str', help: 'Optional local file to attach' },
    { name: 'conversation-id', type: 'str', help: 'Existing conversation ID to continue' },
    { name: 'include-messages', type: 'bool', default: false, help: 'Include messages returned by Qwen (up to 10)' },
    { name: 'timeout', type: 'int', default: 1800, help: 'Maximum seconds to wait for the assistant (10–3600)' },
  ],
  columns: ['answer', 'conversation_id'],
  func: async (page, args) => {
    const { prompt, thinking, mode, timeout, conversationId } = validateAskArgs(args);
    let currentUrl = await page.getCurrentUrl();
    if (currentUrl === 'about:blank') {
      await page.goto('https://chat.qwen.ai/');
      currentUrl = await page.getCurrentUrl();
    }
    if (!currentUrl?.startsWith('https://chat.qwen.ai/')) {
      throw new CommandExecutionError('Open the signed-in Qwen tab before using ask');
    }
    await assertInputVisible(page);
    await waitForPageReady(page);
    await page.wait({ selector: '[aria-label="New Chat"]', timeout: 30 });
    const clickText = async (selector, text) => page.evaluate(({ selector, text }) => {
      const node = [...document.querySelectorAll(selector)].find((element) => element.textContent.replace(/\s+/g, ' ').trim().startsWith(text));
      if (!node) throw new Error(`Qwen control not found: ${text}`);
      node.click();
    }, { selector, text });
    await openConversation(page, conversationId);
    await waitForPageReady(page);
    if (conversationId && extractChatId(await page.evaluate(() => location.pathname)) !== conversationId) {
      throw new CommandExecutionError(`Qwen did not open conversation ${conversationId}`);
    }
    const baselineMessageIds = conversationId
      ? await captureConversationBaseline(page, conversationId, Math.min(timeout * 1000, 10000))
      : new Set();
    if (args.model !== undefined) await selectModel(page, args.model);
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
    await waitForPageReady(page);
    await page.fillText('textarea', prompt);
    let chatId = conversationId || undefined;
    try {
      await page.pressKey('Enter');
      const deadline = Date.now() + timeout * 1000;
      let openedId;
      while (Date.now() < deadline) {
        const path = await page.evaluate(() => location.pathname);
        openedId = extractChatId(path);
        if (openedId) break;
        await page.wait(0.5);
      }
      if (!openedId) throw new CommandExecutionError('Qwen did not open a conversation after sending the prompt');
      if (conversationId && openedId !== conversationId) {
        throw new CommandExecutionError(`Qwen changed conversation from ${conversationId} to ${openedId}`);
      }
      chatId = openedId;
      const result = await pollForResponse(async (timeoutMs) => {
        try { return await readConversation(page, chatId, timeoutMs); }
        catch (error) {
          throw new CommandExecutionError(`Could not read the Qwen response in the current browser session: ${error.message}`);
        }
      }, (seconds) => page.wait(seconds), deadline, Date.now, { baselineMessageIds, prompt, includeMessages: args['include-messages'] });
      if (result) return formatAskResult(chatId, result, args['include-messages'], { prompt, baselineMessageIds });
      throw new CommandExecutionError('Timed out waiting for Qwen response');
    } catch (error) {
      const recovery = chatId ? `inspect conversation ${chatId} with qwen-studio chat-detail` : 'inspect qwen-studio chats';
      throw new CommandExecutionError(`${error.message}. Submission may have occurred; ${recovery} before retrying.`);
    }
  },
});
