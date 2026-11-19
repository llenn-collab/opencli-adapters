import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { askCommand, captureConversationBaseline, extractChatId, openConversation, readConversation, validateAskArgs } from '../ask.js';
import { formatAskResult, messageContent, parseCompletedMessages, pollForResponse } from '../message-content.mjs';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'upload-test.txt');

const newTurn = { baselineTexts: new Set(), prompt: 'hi' };

test('keeps only fresh bubbles and matches the submitted prompt', () => {
  const bubbles = [
    { role: 'user', text: 'old question' },
    { role: 'assistant', text: 'old answer' },
    { role: 'user', text: 'hi' },
    { role: 'assistant', text: 'OK', answer: 'OK' },
  ];
  const turn = { baselineTexts: new Set(['old question', 'old answer']), prompt: 'hi', includeMessages: true };
  assert.deepEqual(parseCompletedMessages(bubbles, true, turn).map(({ role, content }) => [role, content]), [
    ['user', 'hi'], ['assistant', 'OK'],
  ]);
  assert.equal(formatAskResult('chat-id', parseCompletedMessages(bubbles, true, turn), false, turn).answer, 'OK');
  assert.deepEqual(parseCompletedMessages(bubbles, true, { ...turn, includeMessages: false }), [
    { role: 'user', content: 'hi' }, { role: 'assistant', content: 'OK' },
  ]);
  assert.equal(parseCompletedMessages(bubbles, true, { ...turn, prompt: 'other' }), null);
});

test('returns null until the answer text is stable', () => {
  const growing = [{ role: 'user', text: 'hi' }, { role: 'assistant', text: 'partial' }];
  assert.equal(parseCompletedMessages(growing, false, newTurn), null);
  assert.deepEqual(parseCompletedMessages(growing, true, newTurn), [
    { role: 'user', content: 'hi' }, { role: 'assistant', content: 'partial' },
  ]);
});

test('matches the prompt inside a bubble that carries attachment chip text', () => {
  const bubbles = [
    { role: 'user', text: 'upload-test.txt\nTXT 125B\nReply with the marker.' },
    { role: 'assistant', text: 'MARKER', answer: 'MARKER' },
  ];
  const turn = { baselineTexts: new Set(), prompt: 'Reply with the marker.', includeMessages: true };
  const messages = parseCompletedMessages(bubbles, true, turn);
  assert.equal(messages.at(-1).content, 'MARKER');
  assert.equal(formatAskResult('chat-id', messages, false, turn).answer, 'MARKER');
});

test('returns null until the assistant bubble arrives and rejects an empty answer', () => {
  assert.equal(parseCompletedMessages([{ role: 'user', text: 'hi' }], true, newTurn), null);
  assert.throws(() => parseCompletedMessages([
    { role: 'user', text: 'hi' }, { role: 'assistant', text: '', answer: '' },
  ], true, newTurn), /without a response/);
});

test('prefers the DOM answer over full bubble text and preserves long Unicode text', () => {
  const content = `${'long answer '.repeat(2000)}\n雪と猫 🐈\n{"ok":true,"items":[1,2,3]}`;
  const bubbles = [
    { role: 'user', text: 'hi' },
    { role: 'assistant', text: `Thought for 3 seconds\nreasoning\n${content}`, answer: content },
  ];
  assert.equal(parseCompletedMessages(bubbles, true, newTurn).at(-1).content, content);
  assert.deepEqual(parseCompletedMessages([
    { role: 'user', text: 'hi' }, { role: 'assistant', text: 'plain' },
  ], true, newTurn).at(-1), { role: 'assistant', content: 'plain' });
});

test('never reports the thinking section as the answer', () => {
  const thinking = { role: 'assistant', text: 'Thought for 4 seconds\nstill reasoning', answer: '', thinking: 'still reasoning' };
  assert.equal(messageContent(thinking), '');
  assert.equal(messageContent({ ...thinking, answer: null }), '');
  assert.equal(messageContent({ ...thinking, thinking: '' }), '');
  assert.equal(messageContent({ ...thinking, answer: 'final answer' }), 'final answer');
  assert.equal(messageContent({ role: 'assistant', text: 'plain' }), 'plain');
});

test('keeps polling while only the DeepThink section has rendered', async () => {
  let now = 0;
  let reads = 0;
  const result = await pollForResponse(async () => {
    reads += 1;
    return { bubbles: [
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'Thought for 4 seconds\nstill reasoning', answer: '', thinking: 'still reasoning' },
    ] };
  }, async () => { now += 1000; }, 4000, () => now, newTurn);
  assert.equal(reads, 4);
  assert.equal(result, null);
});

test('keeps polling when the answer element pauses before it renders', async () => {
  let now = 0;
  let reads = 0;
  const result = await pollForResponse(async () => {
    reads += 1;
    return { bubbles: [
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'Thought for 2 seconds\nstill reasoning', answer: reads <= 3 ? null : 'the answer', thinking: 'still reasoning' },
    ] };
  }, async () => { now += 1000; }, 9000, () => now, newTurn);
  assert.ok(reads >= 4, `expected continued polling, got ${reads} reads`);
  assert.equal(result.at(-1).content, 'the answer');
});

test('formats compact ask output and includes fetched messages only when requested', () => {
  const messages = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'earlier answer' },
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'current answer' },
  ];
  assert.deepEqual(formatAskResult('chat-id', messages, false, { prompt: 'hi' }), { answer: 'current answer', conversation_id: 'chat-id' });
  assert.deepEqual(formatAskResult('chat-id', messages, true, { prompt: 'hi' }), {
    answer: 'current answer', conversation_id: 'chat-id', messages,
  });
  assert.throws(() => formatAskResult('chat-id', [{ role: 'user', content: 'question' }], false, { prompt: 'question' }), /without a response/);
});

test('waits for a real conversation ID instead of treating a new-chat route as one', () => {
  assert.equal(extractChatId('/a/chat/new'), undefined);
  assert.equal(extractChatId('/a/chat/s/new'), undefined);
  assert.equal(extractChatId('/a/chat/s/749e6bbd-6a45-4440-beaa-ae5238bf06d8'), '749e6bbd-6a45-4440-beaa-ae5238bf06d8');
  assert.equal(extractChatId('/a/chat/s/749E6BBD-6A45-4440-BEAA-AE5238BF06D8/edit'), '749e6bbd-6a45-4440-beaa-ae5238bf06d8');
});

test('validates prompt, model, features, conversation ID and timeout', () => {
  assert.deepEqual(validateAskArgs({ prompt: 'hi' }), {
    prompt: 'hi', model: undefined, think: false, search: false, timeout: 1800, conversationId: '', attachment: null,
  });
  assert.deepEqual(validateAskArgs({ prompt: 'hi', model: 'expert', think: 'true', 'conversation-id': '749e6bbd-6a45-4440-beaa-ae5238bf06d8' }), {
    prompt: 'hi', model: 'expert', think: true, search: false, timeout: 1800, conversationId: '749e6bbd-6a45-4440-beaa-ae5238bf06d8', attachment: null,
  });
  assert.throws(() => validateAskArgs({ prompt: 'hi', 'conversation-id': 'not-a-conversation-id' }), /conversation_id must be a valid DeepSeek conversation UUID/);
  assert.throws(() => validateAskArgs({ prompt: 'hi', model: 'deepseek-v3' }), /model must be instant, expert, or vision/);
  assert.throws(() => validateAskArgs({ prompt: 'hi', model: 'expert', search: true }), /does not support search/);
  assert.throws(() => validateAskArgs({ prompt: 'hi', model: 'vision', search: true }), /does not support search/);
  const explicitFalse = validateAskArgs({ prompt: 'hi', think: 'false', search: 'false' });
  assert.equal(explicitFalse.think, false);
  assert.equal(explicitFalse.search, false);
  assert.throws(() => validateAskArgs({ prompt: ' ' }), /prompt is required/);
  assert.equal(validateAskArgs({ prompt: 'hi', timeout: 10 }).timeout, 10);
  for (const timeout of [0, 9, 3601, 'bad', 10.5]) {
    assert.throws(() => validateAskArgs({ prompt: 'hi', timeout }), /timeout must be an integer between 10 and 3600/);
  }
});

test('opens the requested conversation or starts a new one by default', async () => {
  const calls = [];
  const page = { goto: async (url) => calls.push(['goto', url]) };
  await openConversation(page, '749e6bbd-6a45-4440-beaa-ae5238bf06d8');
  await openConversation(page, '');
  assert.deepEqual(calls, [
    ['goto', 'https://chat.deepseek.com/a/chat/s/749e6bbd-6a45-4440-beaa-ae5238bf06d8'],
    ['goto', 'https://chat.deepseek.com/'],
  ]);
});

test('captures existing bubble texts and fails closed when history is unavailable', async () => {
  const page = { evaluate: async () => ({ bubbles: [{ role: 'user', text: 'old question' }, { role: 'assistant', text: 'old answer' }] }) };
  assert.deepEqual([...await captureConversationBaseline(page)], ['old question', 'old answer']);
  await assert.rejects(() => captureConversationBaseline({ evaluate: async () => ({ pollError: { kind: 'http' } }) }), /Could not establish the existing conversation history/);
  await assert.rejects(() => captureConversationBaseline({ evaluate: async () => { throw new Error('Target closed'); } }), /Target closed/);
});

test('readConversation fails fast when the page origin has changed', async () => {
  const previousLocation = globalThis.location;
  globalThis.location = { origin: 'https://evil.example.com' };
  try {
    const result = await readConversation({ evaluate: async (fn, args) => fn(args) });
    assert.deepEqual(result, { pollError: { kind: 'origin' } });
  } finally {
    globalThis.location = previousLocation;
  }
});

test('returns only after the assistant answer is stable across polls', async () => {
  let now = 0;
  let reads = 0;
  const waits = [];
  const result = await pollForResponse(async () => {
    reads += 1;
    return { bubbles: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: reads === 1 ? 'partial' : 'done' }] };
  }, async (seconds) => { waits.push(seconds); now += seconds * 1000; }, 10000, () => now, newTurn);
  assert.equal(reads, 4);
  assert.equal(result.at(-1).content, 'done');
});

test('retries transient response polling errors without retrying prompt submission', async () => {
  let reads = 0;
  const waits = [];
  const result = await pollForResponse(async () => {
    reads += 1;
    if (reads < 3) return { pollError: { kind: 'network' } };
    return { bubbles: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: 'done' }] };
  }, async (seconds) => waits.push(seconds), 10000, () => 0, newTurn);
  assert.equal(reads, 5);
  assert.deepEqual(waits, [1, 1, 1, 1]);
  assert.equal(result.at(-1).content, 'done');
});

test('retries HTTP rate limits and server errors during response polling', async () => {
  for (const status of [429, 500, 503]) {
    let reads = 0;
    const result = await pollForResponse(async () => {
      reads += 1;
      return reads === 1 ? { pollError: { kind: 'http', status } } : {
        bubbles: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: 'done' }],
      };
    }, async () => {}, 10000, () => 0, newTurn);
    assert.equal(reads, 4);
    assert.equal(result.at(-1).content, 'done');
  }
});

test('does not retry authentication, server contract, or origin errors', async () => {
  for (const pollError of [
    { kind: 'auth', status: 401 },
    { kind: 'http', status: 400 },
    { kind: 'origin' },
    { kind: 'invalid_json' },
  ]) {
    let reads = 0;
    await assert.rejects(() => pollForResponse(async () => {
      reads += 1;
      return { pollError };
    }, async () => {}, 10000, () => 0));
    assert.equal(reads, 1);
  }
});

test('does not blame an earlier network error after a successful read', async () => {
  let now = 0;
  let count = 0;
  const result = await pollForResponse(async () => ++count === 1 ? { pollError: { kind: 'network' } } : { bubbles: [] }, async () => { now += 1; }, 2, () => now, newTurn);
  assert.equal(result, null);
});

test('passes the remaining deadline to each response read', async () => {
  let current = 0;
  const remaining = [];
  await assert.rejects(() => pollForResponse(async (timeoutMs) => {
    remaining.push(timeoutMs);
    return { pollError: { kind: 'network' } };
  }, async (seconds) => { current += seconds * 1000; }, 2500, () => current, newTurn), /Timed out waiting for DeepSeek response after transient network errors/);
  assert.deepEqual(remaining, [2500, 1500, 500]);
});

function submissionPage({ conversationId = '', openedId, pollError, pressError, bubbles, toggles = [false, false], upload, freshRoute = '/', freshMessages = 0 } = {}) {
  let paths = 0;
  let submissions = 0;
  let fileInputs = 0;
  return {
    get submissions() { return submissions; },
    get fileInputs() { return fileInputs; },
    getCurrentUrl: async () => 'https://chat.deepseek.com/',
    goto: async () => {}, click: async () => {}, wait: async () => {}, fillText: async () => {},
    pressKey: async () => { submissions += 1; if (pressError) throw new Error(pressError); },
    setFileInput: async () => {
      fileInputs += 1;
      if (upload?.setFileInputError) throw new Error(upload.setFileInputError);
    },
    evaluate: async (fn, args) => {
      const source = String(fn);
      if (source.includes('visibilityState')) return 'visible';
      if (source.includes('data-deepseek-readiness')) return 'ready';
      if (source.includes('data-deepseek-fresh-chat')) return { pathname: freshRoute, messages: freshMessages };
      if (source.includes('data-deepseek-upload-fallback')) return upload?.fallback ?? { ok: true };
      if (source.includes('data-deepseek-upload-preview')) return upload?.preview ?? true;
      if (source.includes('data-deepseek-upload-send-ready')) return upload?.sendReady ?? true;
      if (source.includes('location.pathname')) return `/a/chat/s/${paths++ === 0 && conversationId ? conversationId : openedId}`;
      if (source.includes('.ds-message')) return pollError ? { pollError } : { bubbles: bubbles ?? [] };
      if (source.includes('button.click()')) return true;
      if (source.includes('ds-toggle-button--selected')) return toggles[args];
      return undefined;
    },
  };
}

test('opens DeepSeek from a blank lease and checks visibility before controls', async () => {
  const calls = [];
  let url = 'about:blank';
  const page = {
    getCurrentUrl: async () => url,
    goto: async (target) => { calls.push(['goto', target]); url = target; },
    evaluate: async () => { calls.push(['visibility']); return 'hidden'; },
  };
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi' }), /prompt was not submitted/);
  assert.deepEqual(calls, [['goto', 'https://chat.deepseek.com/'], ['visibility']]);
});

test('does not navigate away from an unrelated page', async () => {
  const calls = [];
  const page = { getCurrentUrl: async () => 'https://example.com/', goto: async () => calls.push('goto') };
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi' }), /Open the signed-in DeepSeek tab/);
  assert.deepEqual(calls, []);
});

test('fails before changing controls or submitting when browser visibility is unavailable', async () => {
  for (const visibility of ['hidden', undefined, new Error('disconnected')]) {
    const calls = [];
    const page = {
      getCurrentUrl: async () => 'https://chat.deepseek.com/',
      evaluate: async () => { calls.push('visibility'); if (visibility instanceof Error) throw visibility; return visibility; },
      goto: async () => calls.push('goto'), wait: async () => calls.push('wait'),
      fillText: async () => calls.push('fill'), pressKey: async () => calls.push('submit'),
    };
    await assert.rejects(() => askCommand.func(page, { prompt: 'hi', model: 'instant' }), /visibility could not be checked; prompt was not submitted/);
    assert.deepEqual(calls, ['visibility']);
  }
});

test('stops before submission when DeepSeek requires verification', async () => {
  const page = submissionPage();
  const evaluate = page.evaluate;
  page.evaluate = async (fn, args) => String(fn).includes('data-deepseek-readiness') ? 'verification' : evaluate(fn, args);
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi' }), /verification.*manually/i);
  assert.equal(page.submissions, 0);
});

test('stops before submission when another blocking dialog appears', async () => {
  const page = submissionPage();
  const evaluate = page.evaluate;
  page.evaluate = async (fn, args) => String(fn).includes('data-deepseek-readiness') ? 'blocked' : evaluate(fn, args);
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi' }), /requires action.*manually/i);
  assert.equal(page.submissions, 0);
});

test('stops before submission when the composer is disabled or still loading', async () => {
  const page = submissionPage();
  const evaluate = page.evaluate;
  page.evaluate = async (fn, args) => String(fn).includes('data-deepseek-readiness') ? 'loading' : evaluate(fn, args);
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi' }), /composer was not ready/i);
  assert.equal(page.submissions, 0);
});

test('stops before submission when not signed in', async () => {
  const page = submissionPage();
  const evaluate = page.evaluate;
  page.evaluate = async (fn, args) => String(fn).includes('data-deepseek-readiness') ? 'login' : evaluate(fn, args);
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi' }), /sign-in required/i);
  assert.equal(page.submissions, 0);
});

test('fails before submission when a toggle cannot reach the requested state', async () => {
  const cases = [
    { args: { prompt: 'hi', think: true }, toggles: [false, false] },
    { args: { prompt: 'hi', think: false }, toggles: [true, false] },
    { args: { prompt: 'hi', search: true }, toggles: [false, false] },
    { args: { prompt: 'hi', search: false }, toggles: [false, true] },
  ];
  for (const { args, toggles } of cases) {
    const page = submissionPage({ toggles });
    await assert.rejects(() => askCommand.func(page, args), /prompt was not submitted/);
    assert.equal(page.submissions, 0);
  }
});

test('attaches a file before the single submission', async () => {
  const id = '749e6bbd-6a45-4440-beaa-ae5238bf06d8';
  const page = submissionPage({
    openedId: id,
    bubbles: [{ role: 'user', text: 'hi' }, { role: 'assistant', text: 'done', answer: 'done' }],
  });
  const result = await askCommand.func(page, { prompt: 'hi', attachment: FIXTURE });
  assert.equal(result.conversation_id, id);
  assert.equal(page.fileInputs, 1);
  assert.equal(page.submissions, 1);
});

test('fails with zero submissions when the attachment upload fails', async () => {
  const page = submissionPage({ upload: { preview: false } });
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi', attachment: FIXTURE }),
    /file preview did not appear.*prompt was not submitted/);
  assert.equal(page.submissions, 0);
});

test('rejects an unreadable attachment before touching the page', async () => {
  const calls = [];
  const page = {
    getCurrentUrl: async () => calls.push('getCurrentUrl'),
    goto: async () => calls.push('goto'),
    evaluate: async () => calls.push('evaluate'),
    wait: async () => calls.push('wait'),
    fillText: async () => calls.push('fillText'),
    pressKey: async () => calls.push('pressKey'),
    setFileInput: async () => calls.push('setFileInput'),
  };
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi', attachment: '/no/such/deepseek-file.txt' }), /not readable/);
  assert.deepEqual(calls, []);
});

test('fails closed on a stale route or stale history when starting a new chat', async () => {
  const staleRoute = submissionPage({ freshRoute: '/a/chat/s/749e6bbd-6a45-4440-beaa-ae5238bf06d8' });
  await assert.rejects(() => askCommand.func(staleRoute, { prompt: 'hi' }), /did not open a new chat.*prompt was not submitted/);
  assert.equal(staleRoute.submissions, 0);

  const staleBubbles = submissionPage({ freshMessages: 2 });
  await assert.rejects(() => askCommand.func(staleBubbles, { prompt: 'hi' }), /still shows 2 existing message.*prompt was not submitted/);
  assert.equal(staleBubbles.submissions, 0);
});

test('reports the known conversation and read-first recovery on polling failure', async () => {
  const id = '749e6bbd-6a45-4440-beaa-ae5238bf06d8';
  const page = submissionPage({ openedId: id, pollError: { kind: 'auth', status: 401 } });
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi' }), new RegExp(`authentication failed: HTTP 401.*inspect conversation ${id}.*before retrying`));
  assert.equal(page.submissions, 1);
});

test('rejects a changed continuation ID and provides the original for recovery', async () => {
  const id = '749e6bbd-6a45-4440-beaa-ae5238bf06d8';
  const other = 'a3f1c2d4-5b6e-4a7f-8c9d-0e1f2a3b4c5d';
  const page = submissionPage({ conversationId: id, openedId: other });
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi', 'conversation-id': id }), new RegExp(`changed conversation from ${id} to ${other}.*inspect conversation ${id}.*before retrying`));
  assert.equal(page.submissions, 1);
});

test('reports uncertain dispatch without suggesting a blind retry', async () => {
  const page = submissionPage({ pressError: 'dispatch failed' });
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi' }), /dispatch failed.*Submission may have occurred; inspect deepseek-chat chats before retrying/);
  assert.equal(page.submissions, 1);
});

test('reports disconnection during response polling as a recoverable inspection message', async () => {
  const id = '749e6bbd-6a45-4440-beaa-ae5238bf06d8';
  const page = submissionPage({ openedId: id });
  const evaluate = page.evaluate;
  page.evaluate = async (fn, args) => {
    const source = String(fn);
    if (source.includes('data-deepseek-readiness')) return 'ready';
    if (source.includes('data-deepseek-fresh-chat')) return { pathname: '/', messages: 0 };
    if (source.includes('visibilityState')) return 'visible';
    if (source.includes('.ds-message')) throw new Error('Target closed');
    return evaluate(fn, args);
  };
  await assert.rejects(() => askCommand.func(page, { prompt: 'hi' }), new RegExp(`Target closed.*inspect conversation ${id}.*before retrying`));
  assert.equal(page.submissions, 1);
});
