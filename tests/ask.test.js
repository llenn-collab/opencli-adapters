import test from 'node:test';
import assert from 'node:assert/strict';
import { extractChatId, parseCompletedMessages, validateAskArgs } from '../ask.js';

test('validates prompt, thinking and requested modes', () => {
  assert.deepEqual(validateAskArgs({ prompt: 'hi' }), { prompt: 'hi', thinking: 'auto', mode: '' });
  assert.deepEqual(validateAskArgs({ prompt: 'hi', thinking: 'FAST', mode: 'web_search' }), { prompt: 'hi', thinking: 'fast', mode: 'web_search' });
  assert.throws(() => validateAskArgs({ prompt: 'hi', thinking: 'slow' }), /thinking must be/);
  assert.throws(() => validateAskArgs({ prompt: 'hi', mode: 'create_image' }), /mode must be/);
  assert.throws(() => validateAskArgs({ prompt: ' ' }), /prompt is required/);
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
