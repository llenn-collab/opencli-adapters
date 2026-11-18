import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChatsPath, parseArrayData, parseLibrary, parseLoginStatus, parseChats } from '../response.mjs';

test('login status validates and returns only login state', () => {
  assert.deepEqual(parseLoginStatus({ success: true, data: true }), { logged_in: true, site: 'chat.qwen.ai' });
  assert.throws(() => parseLoginStatus({ success: false, data: false }));
});

test('chat list preserves observed fields and handles empty results', () => {
  assert.deepEqual(parseChats({ success: true, data: [] }), []);
  assert.deepEqual(parseChats({ success: true, data: [{ id: 'abc', title: 'A', pinned: true }] }), [{
    id: 'abc', title: 'A', created_at: null, updated_at: null, chat_type: null, project_id: null, pinned: true,
  }]);
  assert.throws(() => parseChats({ success: true, data: [{}] }));
});

test('chat pagination uses the observed page query and validates page numbers', () => {
  assert.equal(buildChatsPath(), '/api/v2/chats/?page=1&exclude_project=true');
  assert.equal(buildChatsPath(3), '/api/v2/chats/?page=3&exclude_project=true');
  assert.throws(() => buildChatsPath(0), /positive integer/);
  assert.throws(() => buildChatsPath(1.5), /positive integer/);
});

test('project and folder reads require successful array responses', () => {
  assert.deepEqual(parseArrayData({ success: true, data: [] }, 'project list'), []);
  assert.throws(() => parseArrayData({ success: false, data: [] }, 'folder list'), /folder list/);
});

test('library read validates observed pagination fields and preserves items', () => {
  const data = { items: [{ id: 'item-1', url: 'https://chat.qwen.ai/artifact?view=full&key=signed-token#code' }], has_more: true, cursor: 'next' };
  assert.deepEqual(parseLibrary({ success: true, data }), {
    ...data,
    items: [{ id: 'item-1', url: 'https://chat.qwen.ai/artifact?view=full&key=[redacted]#code' }],
  });
  assert.throws(() => parseLibrary({ success: true, data: { items: [], has_more: 'no' } }), /library response/);
});
