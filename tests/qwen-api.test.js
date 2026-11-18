import test from 'node:test';
import assert from 'node:assert/strict';
import { qwenApiJson } from '../qwen-api.mjs';

test('Qwen requests read localStorage token and pass a bearer header in page context', async () => {
  let evaluated;
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => key === 'token' ? 'private-token' : null };
  globalThis.fetch = async (path, options) => {
    assert.equal(path, '/api/v2/chats/');
    assert.equal(options.headers.Authorization, 'Bearer private-token');
    return { ok: true, status: 200, json: async () => ({ success: true }) };
  };
  try {
    const result = await qwenApiJson({
    goto: async (url) => assert.equal(url, 'https://chat.qwen.ai/'),
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
  }
});

test('Qwen API requires its localStorage token and restricts requests to observed API paths', async () => {
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: () => null };
  try {
    await assert.rejects(() => qwenApiJson({ goto: async () => {}, evaluate: async (fn, args) => fn(args) }, '/api/v2/chats/'), /localStorage token is missing/);
  } finally {
    globalThis.localStorage = previousStorage;
  }
  await assert.rejects(() => qwenApiJson({ goto: async () => {} }, 'https://example.com'), /Unsupported Qwen API path/);
});
