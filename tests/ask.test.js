import test from 'node:test';
import assert from 'node:assert/strict';
import { extractChatId, parseCompletedMessages, pollForResponse, validateAskArgs } from '../ask.js';

test('validates prompt, thinking and requested modes', () => {
  assert.deepEqual(validateAskArgs({ prompt: 'hi' }), { prompt: 'hi', thinking: 'auto', mode: '', timeout: 1800 });
  assert.deepEqual(validateAskArgs({ prompt: 'hi', thinking: 'FAST', mode: 'web_search' }), { prompt: 'hi', thinking: 'fast', mode: 'web_search', timeout: 1800 });
  assert.throws(() => validateAskArgs({ prompt: 'hi', thinking: 'slow' }), /thinking must be/);
  assert.throws(() => validateAskArgs({ prompt: 'hi', mode: 'create_image' }), /mode must be/);
  assert.throws(() => validateAskArgs({ prompt: ' ' }), /prompt is required/);
  assert.equal(validateAskArgs({ prompt: 'hi', timeout: 10 }).timeout, 10);
  assert.equal(validateAskArgs({ prompt: 'hi' }).timeout, 1800);
  for (const timeout of [0, 9, 3601, 'bad', 10.5]) {
    assert.throws(() => validateAskArgs({ prompt: 'hi', timeout }), /timeout must be an integer between 10 and 3600/);
  }
});

test('retries transient response polling errors without retrying prompt submission', async () => {
  let reads = 0;
  const waits = [];
  const messages = { success: true, data: { chat: { history: { messages: {
    assistant: { id: 'a', role: 'assistant', content: 'done', done: true },
  } } } } };
  const result = await pollForResponse(async () => {
    reads += 1;
    if (reads < 3) return { pollError: { kind: 'network' } };
    return { data: messages, generating: false };
  }, async (seconds) => waits.push(seconds), 10000, () => 0);
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
          assistant: { id: 'a', role: 'assistant', content: 'done', done: true },
        } } } } }, generating: false,
      };
    }, async () => {}, 10000, () => 0);
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
  }, async (seconds) => { current += seconds * 1000; }, 2500, () => current), /Timed out/);
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
  assert.equal(parseCompletedMessages(payload, true), null);
  assert.deepEqual(parseCompletedMessages(payload, false), [
    { id: 'u', role: 'user', content: 'hi', timestamp: 1 },
    { id: 'a', role: 'assistant', content: 'OK', timestamp: 2 },
  ]);
  const responseWith = (assistant) => ({ success: true, data: { chat: { history: { messages: { assistant } } } } });
  assert.equal(parseCompletedMessages(responseWith({ id: 'a', role: 'assistant', content: 'partial', done: false }), false), null);
  assert.throws(() => parseCompletedMessages(responseWith({ id: 'a', role: 'assistant', content: '', done: true }), false), /without a response/);
});

test('preserves long, multiline, Unicode, and structured assistant text verbatim', () => {
  const content = `${'long answer '.repeat(2000)}\n雪と猫 🐈\n{"ok":true,"items":[1,2,3]}`;
  const payload = { success: true, data: { chat: { history: { messages: {
    assistant: { id: 'a', role: 'assistant', content, done: true },
  } } } } };
  assert.equal(parseCompletedMessages(payload, false).at(-1).content, content);
});
