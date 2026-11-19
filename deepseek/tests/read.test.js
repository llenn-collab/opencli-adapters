import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConversationList, parseLoginStatus } from '../response.mjs';
test('login status validates the observed code envelope and returns only login state', () => {
  assert.deepEqual(parseLoginStatus({ code: 0, data: { id: 'u' } }), { logged_in: true, site: 'chat.deepseek.com' });
  assert.deepEqual(parseLoginStatus({ code: 40002 }), { logged_in: false, site: 'chat.deepseek.com' });
  assert.throws(() => parseLoginStatus({}), /unexpected login status response/);
  assert.throws(() => parseLoginStatus({ code: 500 }), /unexpected login status response/);
});
test('conversation list preserves observed fields and handles empty results', () => {
  assert.deepEqual(parseConversationList([]), []);
  assert.deepEqual(parseConversationList([{ id: 'abc', title: 'A', pinned: true }]), [
    { id: 'abc', title: 'A', pinned: true },
  ]);
  assert.deepEqual(parseConversationList([{ id: 'abc', title: 'A' }]), [{ id: 'abc', title: 'A', pinned: false }]);
  assert.throws(() => parseConversationList({}), /unexpected conversation list/);
  assert.throws(() => parseConversationList([{}]), /without an ID or title/);
});
