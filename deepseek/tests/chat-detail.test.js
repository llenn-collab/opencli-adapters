import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVisibleMessages } from '../response.mjs';
import { parseConversationId, readVisibleMessages } from '../chat-detail.js';

test('validates conversation IDs without navigating', () => {
  assert.equal(parseConversationId('749e6bbd-6a45-4440-beaa-ae5238bf06d8'), '749e6bbd-6a45-4440-beaa-ae5238bf06d8');
  assert.equal(parseConversationId(' 749E6BBD-6A45-4440-BEAA-AE5238BF06D8 '), '749e6bbd-6a45-4440-beaa-ae5238bf06d8');
  for (const id of ['', 'not-a-uuid', '749e6bbd', '../../../etc/passwd']) {
    assert.throws(() => parseConversationId(id), /DeepSeek conversation UUID/);
  }
});

test('reads visible messages in DOM order and validates roles and text', async () => {
  const calls = [];
  const page = {
    goto: async (url) => calls.push(['goto', url]),
    wait: async (arg) => calls.push(['wait', arg]),
    evaluate: async () => [
      { role: 'user', content: 'run' },
      { role: 'assistant', content: '```js\nconsole.log(1)\n```' },
    ],
  };
  assert.deepEqual(await readVisibleMessages(page, '749e6bbd-6a45-4440-beaa-ae5238bf06d8'), [
    { role: 'user', content: 'run' },
    { role: 'assistant', content: '```js\nconsole.log(1)\n```' },
  ]);
  assert.deepEqual(calls[0], ['goto', 'https://chat.deepseek.com/a/chat/s/749e6bbd-6a45-4440-beaa-ae5238bf06d8']);
});

test('visible messages reject malformed rows without exposing content', () => {
  assert.deepEqual(parseVisibleMessages([]), []);
  assert.deepEqual(parseVisibleMessages([{ role: 'user', content: 'hi' }]), [{ role: 'user', content: 'hi' }]);
  assert.throws(() => parseVisibleMessages({}), /unexpected conversation response/);
  assert.throws(() => parseVisibleMessages([{ role: 'assistant', content: 3 }]), /without a role or text/);
});
