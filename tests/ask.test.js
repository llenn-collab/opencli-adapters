import test from 'node:test';
import assert from 'node:assert/strict';
import { askCommand, captureConversationBaseline, extractChatId, formatAskResult, openConversation, parseCompletedMessages, pollForResponse, readConversation, validateAskArgs } from '../ask.js';

const newTurn = { baselineMessageIds: new Set(), prompt: 'hi' };

test('matches completed replies by parent ID when Qwen returns equal timestamps out of order', () => {
  const payload = { success: true, data: { chat: { history: { messages: {
    a: { id: 'a', role: 'assistant', parentId: 'u', content: '', done: true, timestamp: 1, content_list: [{ phase: 'answer', status: 'finished', content: 'OK.' }] },
    b: { id: 'b', role: 'assistant', parentId: 'u', content: '', done: true, timestamp: 1, content_list: [{ phase: 'answer', status: 'finished', content: 'OK.' }] },
    u: { id: 'u', role: 'user', content: 'hi', timestamp: 1 },
  } } } } };
  const messages = parseCompletedMessages(payload, false, newTurn);
  assert.equal(formatAskResult('chat', messages, false, newTurn).answer, 'OK.');
  payload.data.chat.history.messages.a.content_list[0].content = 'different';
  assert.throws(() => parseCompletedMessages(payload, false, newTurn), /multiple.*responses/);
});

test('does not blame an earlier network error after a successful read', async () => {
  let now = 0;
  let count = 0;
  const result = await pollForResponse(async () => ++count === 1 ? { pollError: { kind: 'network' } } : { data: { success: true, data: {} } }, async () => { now += 1; }, 2, () => now, newTurn);
  assert.equal(result, null);
});

test('fails before changing controls or submitting when browser visibility is unavailable', async () => {
  for (const visibility of ['hidden', undefined, new Error('disconnected')]) {
    const calls = [];
    const page = {
      getCurrentUrl: async () => 'https://chat.qwen.ai/',
      evaluate: async () => { calls.push('visibility'); if (visibility instanceof Error) throw visibility; return visibility; },
      click: async () => calls.push('click'), goto: async () => calls.push('goto'),
      wait: async () => calls.push('wait'), fillText: async () => calls.push('fill'), pressKey: async () => calls.push('submit'),
    };
    await assert.rejects(() => askCommand.func(page, { prompt: 'hi', model: 'Model A' }), /visibility could not be checked; prompt was not submitted/);
    assert.deepEqual(calls, ['visibility']);
  }
});

test('validates prompt, thinking and requested modes', () => {
  assert.deepEqual(validateAskArgs({ prompt: 'hi' }), { prompt: 'hi', thinking: 'auto', mode: '', timeout: 1800, conversationId: '' });
  assert.deepEqual(validateAskArgs({ prompt: 'hi', thinking: 'FAST', mode: 'web_search' }), { prompt: 'hi', thinking: 'fast', mode: 'web_search', timeout: 1800, conversationId: '' });
  assert.equal(validateAskArgs({ prompt: 'hi', 'conversation-id': '517655ca-1935-48a1-ad44-49ecaf5e7da4' }).conversationId, '517655ca-1935-48a1-ad44-49ecaf5e7da4');
  assert.throws(() => validateAskArgs({ prompt: 'hi', 'conversation-id': 'not-a-conversation-id' }), /conversation_id must be a valid Qwen conversation UUID/);
  assert.throws(() => validateAskArgs({ prompt: 'hi', thinking: 'slow' }), /thinking must be/);
  assert.throws(() => validateAskArgs({ prompt: 'hi', mode: 'create_image' }), /mode must be/);
  assert.throws(() => validateAskArgs({ prompt: ' ' }), /prompt is required/);
  assert.equal(validateAskArgs({ prompt: 'hi', timeout: 10 }).timeout, 10);
  assert.equal(validateAskArgs({ prompt: 'hi' }).timeout, 1800);
  for (const timeout of [0, 9, 3601, 'bad', 10.5]) {
    assert.throws(() => validateAskArgs({ prompt: 'hi', timeout }), /timeout must be an integer between 10 and 3600/);
  }
});

test('opens the requested conversation or starts a new one by default', async () => {
  const calls = [];
  const page = {
    goto: async (url) => calls.push(['goto', url]),
    click: async (selector) => calls.push(['click', selector]),
  };
  await openConversation(page, '517655ca-1935-48a1-ad44-49ecaf5e7da4');
  await openConversation(page, '');
  assert.deepEqual(calls, [
    ['goto', 'https://chat.qwen.ai/c/517655ca-1935-48a1-ad44-49ecaf5e7da4'],
    ['click', '[aria-label="New Chat"]'],
  ]);
});

test('formats compact ask output and includes fetched messages only when requested', () => {
  const messages = [
    { id: 'old-user', role: 'user', content: 'hi' },
    { id: 'old-answer', role: 'assistant', content: 'earlier answer' },
    { id: 'new-user', role: 'user', content: 'hi' },
    { id: 'new-answer', role: 'assistant', content: 'current answer' },
  ];
  const turn = { prompt: 'hi', baselineMessageIds: new Set(['old-user', 'old-answer']) };
  assert.deepEqual(formatAskResult('chat-id', messages, false, turn), { answer: 'current answer', conversation_id: 'chat-id' });
  assert.deepEqual(formatAskResult('chat-id', messages, true, turn), {
    answer: 'current answer', conversation_id: 'chat-id', messages,
  });
  assert.throws(() => formatAskResult('chat-id', [{ role: 'user', content: 'question' }], false, { prompt: 'question' }), /without a response/);
});

test('passes the response polling timeout to the page evaluation', async () => {
  const page = { evaluate: async (_callback, args) => args };
  assert.deepEqual(await readConversation(page, 'chat-id', 2750), { id: 'chat-id', timeoutMs: 2750 });
});

test('captures existing message IDs and fails closed when history is unavailable', async () => {
  const payload = { success: true, data: { chat: { history: { messages: {
    user: { id: 'old-user', role: 'user', content: 'old question' },
    assistant: { id: 'old-assistant', role: 'assistant', content: 'old answer' },
  } } } } };
  const page = { evaluate: async () => ({ data: payload }) };
  assert.deepEqual([...await captureConversationBaseline(page, 'chat-id', 3000)], ['old-user', 'old-assistant']);
  await assert.rejects(() => captureConversationBaseline({ evaluate: async () => ({ pollError: { kind: 'http' } }) }, 'chat-id', 3000), /Could not establish the existing conversation history/);
});

test('retries transient response polling errors without retrying prompt submission', async () => {
  let reads = 0;
  const waits = [];
  const messages = { success: true, data: { chat: { history: { messages: {
    user: { id: 'u', role: 'user', content: 'hi', timestamp: 1 },
    assistant: { id: 'a', role: 'assistant', content: 'done', timestamp: 2, done: true },
  } } } } };
  const result = await pollForResponse(async () => {
    reads += 1;
    if (reads < 3) return { pollError: { kind: 'network' } };
    return { data: messages, generating: false };
  }, async (seconds) => waits.push(seconds), 10000, () => 0, newTurn);
  assert.equal(reads, 3);
  assert.deepEqual(waits, [1, 1]);
  assert.equal(result.at(-1).content, 'done');
});

test('retries HTTP rate limits and server errors during response polling', async () => {
  for (const status of [429, 500, 503]) {
    let reads = 0;
    const result = await pollForResponse(async () => {
      reads += 1;
      return reads === 1 ? { pollError: { kind: 'http', status } } : {
        data: { success: true, data: { chat: { history: { messages: {
          user: { id: 'u', role: 'user', content: 'hi', timestamp: 1 },
          assistant: { id: 'a', role: 'assistant', content: 'done', timestamp: 2, done: true },
        } } } } }, generating: false,
      };
    }, async () => {}, 10000, () => 0, newTurn);
    assert.equal(reads, 2);
    assert.equal(result.at(-1).content, 'done');
  }
});

test('passes the remaining deadline to each response read', async () => {
  let current = 0;
  const remaining = [];
  await assert.rejects(() => pollForResponse(async (timeoutMs) => {
    remaining.push(timeoutMs);
    return { pollError: { kind: 'network' } };
  }, async (seconds) => { current += seconds * 1000; }, 2500, () => current, newTurn), /Timed out/);
  assert.deepEqual(remaining, [2500, 1500, 500]);
});

test('does not retry authentication, server contract, or malformed response errors', async () => {
  for (const pollError of [
    { kind: 'auth', status: 401 },
    { kind: 'http', status: 400 },
    { kind: 'invalid_json' },
  ]) {
    let reads = 0;
    await assert.rejects(() => pollForResponse(async () => {
      reads += 1;
      return { pollError };
    }, async () => {}, 10000, () => 0));
    assert.equal(reads, 1);
  }
});

test('rejects malformed API envelopes instead of timing them out as incomplete history', () => {
  assert.throws(() => parseCompletedMessages({ success: false }, false), /unexpected conversation response/);
  const malformed = {
    success: true,
    data: { chat: { history: { messages: { assistant: { role: 'assistant', done: true, content: 'answer' } } } } },
  };
  assert.throws(() => parseCompletedMessages(malformed, false), /unexpected message/);
});

test('waits for a real conversation ID instead of treating the new-chat route as one', () => {
  assert.equal(extractChatId('/c/new-chat'), undefined);
  assert.equal(extractChatId('/c/517655ca-1935-48a1-ad44-49ecaf5e7da4'), '517655ca-1935-48a1-ad44-49ecaf5e7da4');
});

test('keeps polling while the newly-created conversation history is not ready', () => {
  assert.equal(parseCompletedMessages({ success: true, data: { chat: { history: { messages: null } } } }, false), null);
});

test('returns only after Qwen marks the assistant message done and the UI is not generating', () => {
  const payload = {
    success: true,
    data: { chat: { history: { messages: {
      user: { id: 'u', role: 'user', content: 'hi', timestamp: 1 },
      assistant: { id: 'a', role: 'assistant', content: 'OK', timestamp: 2, done: true },
    } } } },
  };
  assert.equal(parseCompletedMessages(payload, true, newTurn), null);
  assert.deepEqual(parseCompletedMessages(payload, false, newTurn), [
    { id: 'u', role: 'user', content: 'hi', timestamp: 1 },
    { id: 'a', role: 'assistant', content: 'OK', timestamp: 2 },
  ]);
  const responseWith = (assistant) => ({ success: true, data: { chat: { history: { messages: {
    user: { id: 'u', role: 'user', content: 'hi' }, assistant,
  } } } } });
  assert.equal(parseCompletedMessages(responseWith({ id: 'a', role: 'assistant', content: 'partial', done: false }), false, newTurn), null);
  assert.throws(() => parseCompletedMessages(responseWith({ id: 'a', role: 'assistant', content: '', done: true }), false, newTurn), /without a response/);
});

test('does not accept a prior completed answer beside the just-submitted user turn', () => {
  const payload = { success: true, data: { chat: { history: { messages: {
    oldUser: { id: 'old-user', role: 'user', content: 'old question', timestamp: 1 },
    oldAssistant: { id: 'old-assistant', role: 'assistant', content: 'old answer', timestamp: 2, done: true },
    newUser: { id: 'new-user', role: 'user', content: 'new question', timestamp: 3 },
  } } } } };
  assert.equal(parseCompletedMessages(payload, false, {
    baselineMessageIds: new Set(['old-user', 'old-assistant']), prompt: 'new question',
  }), null);
});

test('does not complete a new user turn until its assistant message arrives', () => {
  const payload = { success: true, data: { chat: { history: { messages: {
    oldUser: { id: 'old-user', role: 'user', content: 'old question', timestamp: 1 },
    oldAssistant: { id: 'old-assistant', role: 'assistant', content: 'old answer', timestamp: 2, done: true },
    newUser: { id: 'new-user', role: 'user', content: 'new question', timestamp: 3 },
  } } } } };
  assert.equal(parseCompletedMessages(payload, false, {
    baselineMessageIds: new Set(['old-user', 'old-assistant']), prompt: 'new question',
  }), null);
});

test('accepts a completed assistant message after the matching new user turn', () => {
  const payload = { success: true, data: { chat: { history: { messages: {
    oldUser: { id: 'old-user', role: 'user', content: 'old question', timestamp: 1 },
    oldAssistant: { id: 'old-assistant', role: 'assistant', content: 'old answer', timestamp: 2, done: true },
    newUser: { id: 'new-user', role: 'user', content: 'new question', timestamp: 3 },
    newAssistant: { id: 'new-assistant', role: 'assistant', content: 'new answer', timestamp: 4, done: true },
  } } } } };
  assert.equal(parseCompletedMessages(payload, false, {
    baselineMessageIds: new Set(['old-user', 'old-assistant']), prompt: 'new question',
  }).at(-1).content, 'new answer');
});

test('does not accept a completed historical chat without a new user turn', () => {
  const payload = { success: true, data: { chat: { history: { messages: {
    oldUser: { id: 'old-user', role: 'user', content: 'old question', timestamp: 1 },
    oldAssistant: { id: 'old-assistant', role: 'assistant', content: 'old answer', timestamp: 2, done: true },
  } } } } };
  assert.equal(parseCompletedMessages(payload, false, {
    baselineMessageIds: new Set(['old-user', 'old-assistant']), prompt: 'new question',
  }), null);
});

test('preserves long, multiline, Unicode, and structured assistant text verbatim', () => {
  const content = `${'long answer '.repeat(2000)}\n雪と猫 🐈\n{"ok":true,"items":[1,2,3]}`;
  const payload = { success: true, data: { chat: { history: { messages: {
    user: { id: 'u', role: 'user', content: 'hi' },
    assistant: { id: 'a', role: 'assistant', content, done: true },
  } } } } };
  assert.equal(parseCompletedMessages(payload, false, newTurn).at(-1).content, content);
});

test('uses a finished answer component when top-level content is empty', () => {
  const payload = { success: true, data: { chat: { history: { messages: {
    user: { id: 'u', role: 'user', content: 'hi' },
    assistant: { id: 'a', role: 'assistant', content: '', done: true, content_list: [
      { phase: 'thinking_summary', status: 'finished', content: 'private reasoning' },
      { phase: 'answer', status: 'finished', content: 'hello' },
    ] },
  } } } } };
  const messages = parseCompletedMessages(payload, false, newTurn);
  assert.equal(messages.at(-1).content, 'hello');
  assert.equal(formatAskResult('chat-id', messages, false, newTurn).answer, 'hello');
  payload.data.chat.history.messages.assistant.content_list.push({ phase: 'answer', status: 'finished', content: 'other' });
  assert.throws(() => parseCompletedMessages(payload, false, newTurn), /multiple answer components/);
  payload.data.chat.history.messages.assistant.content_list.pop();
  payload.data.chat.history.messages.assistant.content_list[1].status = 'running';
  assert.throws(() => parseCompletedMessages(payload, false, newTurn), /without a response/);
});

test('rejects invalid model arguments without affecting thinking validation', () => {
  for (const model of ['', '  ', 3]) assert.throws(() => validateAskArgs({ prompt: 'hi', model }), /model must be/);
  assert.equal(validateAskArgs({ prompt: 'hi', model: 'Model A', thinking: 'thinking' }).thinking, 'thinking');
});
