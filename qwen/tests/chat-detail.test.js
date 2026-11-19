import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatDetail } from '../chat-detail.js';

test('reads a finished answer component when top-level content is empty', () => {
  const payload = { success: true, data: { chat: { history: { messages: {
    a: { id: 'a', role: 'assistant', content: '', content_list: [{ phase: 'answer', status: 'finished', content: 'OK.' }] },
  } } } } };
  assert.equal(parseChatDetail(payload)[0].content, 'OK.');
});

test('parses conversation messages in timestamp order', () => {
  assert.deepEqual(parseChatDetail({ success: true, data: { chat: { history: { messages: {
    later: { id: 'b', role: 'assistant', content: '```js\nconsole.log(1)\n```', timestamp: 2 },
    earlier: { id: 'a', role: 'user', content: 'run', timestamp: 1 },
  } } } } }), [
    { id: 'a', role: 'user', content: 'run', timestamp: 1 },
    { id: 'b', role: 'assistant', content: '```js\nconsole.log(1)\n```', timestamp: 2 },
  ]);
});

test('places replies after their known parent while preserving unrelated message order', () => {
  const payload = { success: true, data: { chat: { history: { messages: {
    reply: { id: 'a', role: 'assistant', parentId: 'u', content: 'READY', timestamp: 1 },
    unrelated: { id: 'x', role: 'user', content: 'other', timestamp: 1 },
    parent: { id: 'u', role: 'user', content: 'first', timestamp: 1 },
    next: { id: 'n', role: 'user', content: 'next', timestamp: 2 },
  } } } } };
  assert.deepEqual(parseChatDetail(payload).map(({ id }) => id), ['x', 'u', 'a', 'n']);
});

test('rejects malformed conversation payloads and IDs without exposing content', () => {
  assert.throws(() => parseChatDetail({ success: true, data: {} }), /unexpected conversation response/);
  assert.throws(() => parseChatDetail({ success: true, data: { chat: { history: { messages: { x: {} } } } } }), /without an ID/);
});
