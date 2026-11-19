import test from 'node:test';
import assert from 'node:assert/strict';
import { deepseekApiJson } from '../deepseek-api.mjs';

async function withPageContext(run) {
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  const previousLocation = globalThis.location;
  globalThis.location = { origin: 'https://chat.deepseek.com' };
  try {
    await run();
  } finally {
    globalThis.fetch = previousFetch;
    globalThis.localStorage = previousStorage;
    globalThis.location = previousLocation;
  }
}

test('DeepSeek requests read localStorage userToken and pass a bearer header in page context', async () => {
  await withPageContext(async () => {
    globalThis.localStorage = { getItem: (key) => key === 'userToken' ? JSON.stringify({ value: 'private-token' }) : null };
    globalThis.fetch = async (path, options) => {
      assert.equal(path, '/api/v0/users/current');
      assert.equal(options.headers.Authorization, 'Bearer private-token');
      return { ok: true, status: 200, json: async () => ({ code: 0 }) };
    };
    const result = await deepseekApiJson({
      getCurrentUrl: async () => 'https://chat.deepseek.com/',
      goto: async () => assert.fail('unexpected navigation'),
      evaluate: async (fn, args) => fn(args),
    }, '/api/v0/users/current');
    assert.deepEqual(result, { code: 0 });
  });
});

test('DeepSeek requests also accept a raw userToken string', async () => {
  await withPageContext(async () => {
    globalThis.localStorage = { getItem: (key) => key === 'userToken' ? 'raw-token' : null };
    globalThis.fetch = async (_path, options) => {
      assert.equal(options.headers.Authorization, 'Bearer raw-token');
      return { ok: true, status: 200, json: async () => ({ code: 40002 }) };
    };
    const result = await deepseekApiJson({
      getCurrentUrl: async () => 'https://chat.deepseek.com/',
      evaluate: async (fn, args) => fn(args),
    }, '/api/v0/users/current');
    assert.deepEqual(result, { code: 40002 });
  });
});

test('DeepSeek API requires its userToken and restricts requests to observed API paths', async () => {
  await withPageContext(async () => {
    globalThis.localStorage = { getItem: () => null };
    await assert.rejects(() => deepseekApiJson({ getCurrentUrl: async () => 'https://chat.deepseek.com/', evaluate: async (fn, args) => fn(args) }, '/api/v0/users/current'), /userToken is missing/);
  });
  await assert.rejects(() => deepseekApiJson({ goto: async () => {} }, 'https://example.com'), /Unsupported DeepSeek API path/);
});

test('reuses a DeepSeek page and refuses to navigate an unrelated page', async () => {
  const page = { getCurrentUrl: async () => 'https://chat.deepseek.com/a/chat/s/123', goto: async () => { throw new Error('unexpected navigation'); }, evaluate: async () => ({ code: 0 }) };
  assert.deepEqual(await deepseekApiJson(page, '/api/v0/users/current'), { code: 0 });
  page.getCurrentUrl = async () => 'https://example.com/';
  await assert.rejects(() => deepseekApiJson(page, '/api/v0/users/current'), /DeepSeek tab/);
});

test('initializes a blank DeepSeek page once', async () => {
  let url = 'about:blank';
  let navigations = 0;
  const page = { getCurrentUrl: async () => url, goto: async (target) => { navigations++; url = target; }, evaluate: async () => ({ code: 0 }) };
  await deepseekApiJson(page, '/api/v0/users/current');
  await deepseekApiJson(page, '/api/v0/users/current');
  assert.equal(navigations, 1);
});
