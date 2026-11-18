import test from 'node:test';
import assert from 'node:assert/strict';
import { qwenApiJson } from '../qwen-api.mjs';

test('Qwen requests read localStorage token and pass a bearer header in page context', async () => {
  let evaluated;
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  const previousLocation = globalThis.location;
  globalThis.location = { origin: 'https://chat.qwen.ai' };
  globalThis.localStorage = { getItem: (key) => key === 'token' ? 'private-token' : null };
  globalThis.fetch = async (path, options) => {
    assert.equal(path, '/api/v2/chats/');
    assert.equal(options.headers.Authorization, 'Bearer private-token');
    return { ok: true, status: 200, json: async () => ({ success: true }) };
  };
  try {
    const result = await qwenApiJson({
    getCurrentUrl: async () => 'https://chat.qwen.ai/',
    goto: async () => assert.fail('unexpected navigation'),
    evaluate: async (fn, args) => {
      evaluated = args;
      return fn(args);
    },
    }, '/api/v2/chats/');
    assert.deepEqual(result, { success: true });
    assert.deepEqual(evaluated, { path: '/api/v2/chats/', method: 'GET' });
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.localStorage = previousStorage;
    globalThis.location = previousLocation;
  }
});

test('Qwen API requires its localStorage token and restricts requests to observed API paths', async () => {
  const previousStorage = globalThis.localStorage;
  const previousLocation = globalThis.location;
  globalThis.location = { origin: 'https://chat.qwen.ai' };
  globalThis.localStorage = { getItem: () => null };
  try {
    await assert.rejects(() => qwenApiJson({ getCurrentUrl: async () => 'https://chat.qwen.ai/', evaluate: async (fn, args) => fn(args) }, '/api/v2/chats/'), /localStorage token is missing/);
  } finally {
    globalThis.localStorage = previousStorage;
    globalThis.location = previousLocation;
  }
  await assert.rejects(() => qwenApiJson({ goto: async () => {} }, 'https://example.com'), /Unsupported Qwen API path/);
});

test('reuses a Qwen page and refuses to navigate an unrelated page', async () => {
  const page = { getCurrentUrl: async () => 'https://chat.qwen.ai/c/123', goto: async () => { throw new Error('unexpected navigation'); }, evaluate: async () => ({ success: true }) };
  assert.deepEqual(await qwenApiJson(page, '/api/v2/chats/'), { success: true });
  page.getCurrentUrl = async () => 'https://example.com/';
  await assert.rejects(() => qwenApiJson(page, '/api/v2/chats/'), /Qwen tab/);
});

 test('initializes a blank Qwen page once', async () => {
  let url = 'about:blank';
  let navigations = 0;
  const page = { getCurrentUrl: async () => url, goto: async (target) => { navigations++; url = target; }, evaluate: async () => ({ success: true }) };
  await qwenApiJson(page, '/api/v2/chats/');
  await qwenApiJson(page, '/api/v2/chats/');
  assert.equal(navigations, 1);
});
