import { cli, Strategy } from '@jackwener/opencli/registry';
import { CommandExecutionError } from '@jackwener/opencli/errors';
import { modelLabels, selectModel, setFeature } from './model-ui.mjs';
import { formatAskResult, pollForResponse } from './message-content.mjs';
import { resolveAttachment, uploadAttachment } from './upload.mjs';

const COMPOSER = 'textarea[placeholder*="DeepSeek"]';

function parseBool(value) {
  if (typeof value === 'boolean') return value;
  return String(value ?? '').trim().toLowerCase() === 'true';
}

export function validateAskArgs(args) {
  const model = args.model === undefined ? undefined : String(args.model);
  if (model !== undefined && !modelLabels.includes(model)) {
    throw new CommandExecutionError('model must be instant, expert, or vision');
  }
  const think = parseBool(args.think);
  const search = parseBool(args.search);
  if ((model === 'expert' || model === 'vision') && search) {
    throw new CommandExecutionError(`DeepSeek ${model} mode does not support search; use --model instant or drop --search`);
  }
  if (typeof args.prompt !== 'string' || !args.prompt.trim()) {
    throw new CommandExecutionError('prompt is required');
  }
  const timeout = Number(args.timeout ?? 1800);
  if (!Number.isInteger(timeout) || timeout < 10 || timeout > 3600) {
    throw new CommandExecutionError('timeout must be an integer between 10 and 3600 seconds');
  }
  const conversationId = String(args['conversation-id'] ?? '').trim().toLowerCase();
  if (conversationId && extractChatId(`/a/chat/s/${conversationId}`) !== conversationId) {
    throw new CommandExecutionError('conversation_id must be a valid DeepSeek conversation UUID');
  }
  // Resolved here so a bad path fails before the browser is touched at all.
  const attachment = args.attachment === undefined || args.attachment === null || String(args.attachment).trim() === ''
    ? null
    : resolveAttachment(String(args.attachment));
  return { prompt: args.prompt, model, think, search, timeout, conversationId, attachment };
}

export function extractChatId(path) {
  return path?.match(/^\/a\/chat\/s\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1]?.toLowerCase();
}

export async function openConversation(page, conversationId) {
  if (conversationId) return page.goto(`https://chat.deepseek.com/a/chat/s/${encodeURIComponent(conversationId)}`);
  return page.goto('https://chat.deepseek.com/');
}

// Observed read path: visible .ds-message bubbles with the thinking/answer DOM
// split (.ds-markdown--think vs .ds-markdown). Bubble windows are virtualized.
export function readConversation(page) {
  return page.evaluate(() => {
    if (location.origin !== 'https://chat.deepseek.com') return { pollError: { kind: 'origin' } };
    const bubbles = [...document.querySelectorAll('.ds-message')].map((node) => {
      const isUser = node.className.split(/\s+/).length > 2;
      const thinkEl = node.querySelector('.ds-markdown--think') || node.querySelector('[class*="think"]');
      const answers = [...node.querySelectorAll('.ds-markdown')]
        .filter((el) => el !== thinkEl && !(thinkEl && thinkEl.contains(el)) && !el.classList.contains('ds-markdown--think'));
      const answerEl = answers.length ? answers[answers.length - 1] : null;
      return {
        role: isUser ? 'user' : 'assistant',
        text: (node.innerText || '').trim(),
        answer: answerEl ? (answerEl.innerText || '').trim() : null,
        thinking: thinkEl ? (thinkEl.innerText || '').trim() : null,
      };
    }).filter((bubble) => bubble.text);
    return { bubbles };
  });
}

export async function captureConversationBaseline(page) {
  let result;
  try { result = await readConversation(page); }
  catch (error) {
    throw new CommandExecutionError(`Could not establish the existing conversation history before submitting: ${error.message}`);
  }
  if (result?.pollError) {
    throw new CommandExecutionError(`Could not establish the existing conversation history before submitting (${result.pollError.kind})`);
  }
  if (!Array.isArray(result?.bubbles)) throw new CommandExecutionError('Could not establish the existing conversation history before submitting');
  return new Set(result.bubbles.map((bubble) => bubble.text));
}

export async function assertInputVisible(page) {
  let visibility;
  try { visibility = await page.evaluate(() => document.visibilityState); }
  catch { visibility = undefined; }
  if (visibility !== 'visible') {
    throw new CommandExecutionError('DeepSeek browser page is not visible or its visibility could not be checked; prompt was not submitted',
      'Select the DeepSeek tab and restore its browser window, then retry.');
  }
}

export async function assertPageReady(page) {
  const state = await page.evaluate(() => {
    // data-deepseek-readiness: inspect only visible controls and dialogs.
    if (location.origin !== 'https://chat.deepseek.com') return 'wrong_page';
    const visible = (node) => node && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
    const dialogs = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')].filter(visible);
    if (dialogs.some((node) => /birth|age verification|year of birth/i.test(node.innerText))) return 'verification';
    if (dialogs.length) return 'blocked';
    let token = '';
    const raw = localStorage.getItem('userToken');
    if (raw) { try { token = JSON.parse(raw).value || ''; } catch { token = raw; } }
    if (!token) return 'login';
    const input = document.querySelector('textarea[placeholder*="DeepSeek"]');
    return visible(input) && !input.disabled ? 'ready' : 'loading';
  });
  if (state === 'wrong_page') throw new CommandExecutionError('DeepSeek page changed; prompt was not submitted');
  if (state === 'verification') throw new CommandExecutionError('DeepSeek age verification required; complete it manually in the connected browser. Prompt was not submitted');
  if (state === 'blocked') throw new CommandExecutionError('DeepSeek requires action in the connected browser; resolve the dialog manually. Prompt was not submitted');
  if (state === 'login') throw new CommandExecutionError('DeepSeek sign-in required; sign in in the connected browser. Prompt was not submitted');
  return state === 'ready';
}

export async function waitForPageReady(page) {
  for (let i = 0; i < 30; i++) {
    if (await assertPageReady(page)) return;
    await page.wait(1);
  }
  throw new CommandExecutionError('DeepSeek composer was not ready within 30 seconds; prompt was not submitted');
}

// A new chat is the root route with no rendered history. Stale route or stale
// bubbles would silently continue an old conversation instead.
export async function assertFreshChat(page, context) {
  const state = await page.evaluate(() => {
    // data-deepseek-fresh-chat
    return { pathname: location.pathname, messages: document.querySelectorAll('.ds-message').length };
  });
  if (state?.pathname?.includes('/a/chat/s/')) {
    throw new CommandExecutionError(`DeepSeek did not open a new chat; ${context}`);
  }
  if (!state || typeof state.messages !== 'number') {
    throw new CommandExecutionError(`DeepSeek new-chat state could not be read; ${context}`);
  }
  if (state.messages > 0) {
    throw new CommandExecutionError(`DeepSeek new chat still shows ${state.messages} existing message(s); ${context}`);
  }
}

export const askCommand = cli({
  site: 'deepseek-chat', name: 'ask', description: 'Start or continue a DeepSeek conversation and return its response',
  access: 'write', strategy: Strategy.COOKIE, browser: true, domain: 'chat.deepseek.com',
  navigateBefore: false, siteSession: 'persistent',
  args: [
    { name: 'prompt', positional: true, required: true, help: 'Prompt to send' },
    { name: 'model', type: 'str', help: 'Model label: instant, expert, or vision (from deepseek-chat models)' },
    { name: 'think', type: 'bool', default: false, help: 'Enable DeepThink before sending' },
    { name: 'search', type: 'bool', default: false, help: 'Enable web search before sending (instant model only)' },
    { name: 'conversation-id', type: 'str', help: 'Existing conversation UUID to continue' },
    { name: 'attachment', type: 'str', help: 'Optional local file to attach before sending' },
    { name: 'include-messages', type: 'bool', default: false, help: 'Include the visible conversation messages returned by DeepSeek' },
    { name: 'timeout', type: 'int', default: 1800, help: 'Maximum seconds to wait for the assistant (10–3600)' },
  ],
  columns: ['answer', 'conversation_id'],
  func: async (page, args) => {
    const { prompt, model, think, search, timeout, conversationId, attachment } = validateAskArgs(args);
    let currentUrl = await page.getCurrentUrl();
    if (currentUrl === 'about:blank') {
      await page.goto('https://chat.deepseek.com/');
      currentUrl = await page.getCurrentUrl();
    }
    if (!currentUrl?.startsWith('https://chat.deepseek.com/')) {
      throw new CommandExecutionError('Open the signed-in DeepSeek tab before using ask');
    }
    await assertInputVisible(page);
    await waitForPageReady(page);
    await openConversation(page, conversationId);
    await waitForPageReady(page);
    if (conversationId && extractChatId(await page.evaluate(() => location.pathname)) !== conversationId) {
      throw new CommandExecutionError(`DeepSeek did not open conversation ${conversationId}`);
    }
    if (!conversationId) await assertFreshChat(page, 'prompt was not submitted');
    const baselineTexts = conversationId ? await captureConversationBaseline(page) : new Set();
    if (model !== undefined) await selectModel(page, model);
    const thinkResult = await setFeature(page, 'DeepThink', think);
    if (!thinkResult?.ok || thinkResult.active !== think) {
      throw new CommandExecutionError(`Could not set DeepSeek DeepThink to ${think ? 'on' : 'off'}; prompt was not submitted`);
    }
    if (model !== 'expert' && model !== 'vision') {
      const searchResult = await setFeature(page, 'Search', search);
      if (!searchResult?.ok || searchResult.active !== search) {
        throw new CommandExecutionError(`Could not set DeepSeek Search to ${search ? 'on' : 'off'}; prompt was not submitted`);
      }
    }
    await waitForPageReady(page);
    if (attachment) {
      const upload = await uploadAttachment(page, attachment.path, attachment.name);
      if (!upload.ok) throw new CommandExecutionError(`DeepSeek attachment upload failed: ${upload.reason}; prompt was not submitted`);
    }
    await page.fillText(COMPOSER, prompt);
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
      if (!openedId) throw new CommandExecutionError('DeepSeek did not open a conversation after sending the prompt');
      if (conversationId && openedId !== conversationId) {
        throw new CommandExecutionError(`DeepSeek changed conversation from ${conversationId} to ${openedId}`);
      }
      chatId = openedId;
      const result = await pollForResponse(async () => {
        try { return await readConversation(page); }
        catch (error) {
          throw new CommandExecutionError(`Could not read the DeepSeek response in the current browser session: ${error.message}`);
        }
      }, (seconds) => page.wait(seconds), deadline, Date.now,
        { baselineTexts, prompt, includeMessages: args['include-messages'] });
      if (result) return formatAskResult(chatId, result, args['include-messages'], { prompt });
      throw new CommandExecutionError('Timed out waiting for DeepSeek response');
    } catch (error) {
      const recovery = chatId ? `inspect conversation ${chatId} with deepseek-chat chat-detail` : 'inspect deepseek-chat chats';
      throw new CommandExecutionError(`${error.message}. Submission may have occurred; ${recovery} before retrying.`);
    }
  },
});
