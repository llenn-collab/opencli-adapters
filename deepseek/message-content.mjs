import { CommandExecutionError } from '@jackwener/opencli/errors';

// Bubble rows are extracted in-page: { role, text, answer?, thinking? }. The
// answer/thinking split uses DeepSeek's observed DOM (.ds-markdown--think vs
// .ds-markdown); text is the bubble fallback. A bubble with a thinking section
// must never fall back to `text`: while DeepThink is still running the answer
// element is absent/empty and `text` holds only the thinking output.
export function messageContent(message) {
  if (message.thinking !== null && message.thinking !== undefined) return message.answer ?? '';
  if (message.answer) return message.answer;
  return message.text ?? '';
}

// Returns the fresh turn rows once stable, or null while incomplete. Bubble
// windows are virtualized, so freshness is judged against baseline texts.
export function parseCompletedMessages(bubbles, stable, { baselineTexts = new Set(), prompt, includeMessages = false } = {}) {
  if (!Array.isArray(bubbles) || typeof prompt !== 'string') return null;
  const fresh = bubbles.filter((bubble) => !baselineTexts.has(bubble.text));
  // Substring match: user bubbles can prepend attachment chip text
  // ("upload-test.txt\nTXT 125B\n…") before the prompt (observed).
  const userIndex = fresh.findIndex((bubble) => bubble.role === 'user'
    && bubble.text.trim().includes(prompt.trim()));
  if (userIndex < 0) return null;
  const assistants = fresh.slice(userIndex + 1).filter((bubble) => bubble.role === 'assistant');
  if (!assistants.length || !stable) return null;
  const answer = messageContent(assistants[assistants.length - 1]);
  if (!answer.trim()) {
    throw new CommandExecutionError('DeepSeek completed the request without a response; check account limits or site errors');
  }
  const rows = includeMessages ? fresh : fresh.slice(userIndex, userIndex + 1 + assistants.length);
  return rows.map((bubble) => ({ role: bubble.role, content: messageContent(bubble).trim() }));
}

export function formatAskResult(conversationId, messages, includeMessages = false, { prompt } = {}) {
  const userIndex = messages?.findIndex((message) => message.role === 'user'
    && message.content.trim().includes(prompt.trim()));
  const answer = userIndex >= 0 && messages.slice(userIndex + 1).findLast((message) => message.role === 'assistant' && message.content);
  if (answer?.role !== 'assistant' || !answer.content) {
    throw new CommandExecutionError('DeepSeek completed the request without a response; check account limits or site errors');
  }
  return { answer: answer.content, conversation_id: conversationId, ...(includeMessages ? { messages } : {}) };
}

export async function pollForResponse(read, wait, deadline, now = Date.now, turn = {}) {
  let lastTransientError;
  let lastText = '';
  let stableCount = 0;
  while (now() < deadline) {
    const result = await read(deadline - now());
    if (result?.pollError) {
      const { kind, status } = result.pollError;
      const retryable = kind === 'network' || (kind === 'http' && (status === 429 || status >= 500));
      if (!retryable) {
        const reason = kind === 'auth' ? `authentication failed: HTTP ${status}`
          : kind === 'origin' ? 'page origin changed'
            : kind === 'http' ? `conversation read failed: HTTP ${status}`
              : kind === 'invalid_json' ? 'conversation response was not valid JSON'
                : 'conversation request failed';
        throw new CommandExecutionError(`DeepSeek ${reason}`);
      }
      lastTransientError = kind === 'network' ? 'network errors' : `HTTP ${status}`;
    } else {
      lastTransientError = undefined;
      const bubbles = result?.bubbles;
      const tail = Array.isArray(bubbles) && bubbles.length ? messageContent(bubbles[bubbles.length - 1]) : '';
      stableCount = tail && tail === lastText ? stableCount + 1 : 0;
      lastText = tail;
      const messages = parseCompletedMessages(bubbles, stableCount >= 2, turn);
      if (messages) return messages;
    }
    const remaining = deadline - now();
    if (remaining > 0) await wait(Math.min(1, remaining / 1000));
  }
  if (lastTransientError) throw new CommandExecutionError(`Timed out waiting for DeepSeek response after transient ${lastTransientError}`);
  return null;
}
