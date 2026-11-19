import test from 'node:test';
import assert from 'node:assert/strict';
import { newCommand } from '../new.js';

function newPage({ route = '/', messages = 0, readiness = 'ready', url = 'https://chat.deepseek.com/' } = {}) {
  const calls = [];
  const page = {
    calls,
    getCurrentUrl: async () => url,
    goto: async (target) => { calls.push(['goto', target]); url = target; },
    wait: async (arg) => calls.push(['wait', arg]),
    evaluate: async (fn) => {
      const source = String(fn);
      if (source.includes('data-deepseek-readiness')) return readiness;
      if (source.includes('data-deepseek-fresh-chat')) return { pathname: route, messages };
      return undefined;
    },
  };
  return page;
}

test('starts a fresh chat on the root route with an empty composer', async () => {
  const page = newPage();
  assert.deepEqual(await newCommand.func(page), [{ status: 'new chat started' }]);
  assert.deepEqual(page.calls.filter(([name]) => name === 'goto'), [['goto', 'https://chat.deepseek.com/']]);
});

test('starts a fresh chat from a blank lease', async () => {
  const page = newPage({ url: 'about:blank' });
  assert.deepEqual(await newCommand.func(page), [{ status: 'new chat started' }]);
  assert.deepEqual(page.calls.filter(([name]) => name === 'goto'), [
    ['goto', 'https://chat.deepseek.com/'], ['goto', 'https://chat.deepseek.com/'],
  ]);
});

test('rejects a stale conversation route instead of claiming a new chat', async () => {
  const page = newPage({ route: '/a/chat/s/749e6bbd-6a45-4440-beaa-ae5238bf06d8' });
  await assert.rejects(() => newCommand.func(page), /did not open a new chat; new chat was not started/);
});

test('rejects stale messages left in the composer history', async () => {
  const page = newPage({ messages: 2 });
  await assert.rejects(() => newCommand.func(page), /still shows 2 existing message\(s\); new chat was not started/);
});

test('keeps waiting for the composer and fails when it never becomes ready', async () => {
  const page = newPage({ readiness: 'loading' });
  await assert.rejects(() => newCommand.func(page), /composer was not ready within 30 seconds/);
  assert.equal(page.calls.filter(([name]) => name === 'wait').length, 30);
});

test('fails closed on sign-in and blocking-dialog readiness states', async () => {
  await assert.rejects(() => newCommand.func(newPage({ readiness: 'login' })), /sign-in required/);
  await assert.rejects(() => newCommand.func(newPage({ readiness: 'blocked' })), /requires action.*manually/i);
  await assert.rejects(() => newCommand.func(newPage({ readiness: 'verification' })), /verification.*manually/i);
});

test('does not navigate away from an unrelated page', async () => {
  const page = newPage({ url: 'https://example.com/' });
  await assert.rejects(() => newCommand.func(page), /Open the signed-in DeepSeek tab/);
  assert.deepEqual(page.calls.filter(([name]) => name === 'goto'), []);
});
