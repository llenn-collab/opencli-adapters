import test from 'node:test';
import assert from 'node:assert/strict';
import { parseChatDetail } from '../chat-detail.js';

test('parses conversation messages in timestamp order', () => {
  assert.deepEqual(parseChatDetail({ success: true, data: { chat: { history: { messages: {
    later: { id: 'b', role: 'assistant', content: '```js\nconsole.log(1)\n```', timestamp: 2 },
    earlier: { id: 'a', role: 'user', content: 'run', timestamp: 1 },
  } } } } }), [
    { id: 'a', role: 'user', content: 'run', timestamp: 1 },
    { id: 'b', role: 'assistant', content: '```js\nconsole.log(1)\n```', timestamp: 2 },
  ]);
});

test('rejects malformed conversation payloads and IDs without exposing content', () => {
  assert.throws(() => parseChatDetail({ success: true, data: {} }), /unexpected conversation response/);
  assert.throws(() => parseChatDetail({ success: true, data: { chat: { history: { messages: { x: {} } } } } }), /without an ID/);
});
