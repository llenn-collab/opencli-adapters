import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverModels, selectModel } from '../model-ui.mjs';

const choices = [
  { label: 'Model A', selected: true, disabled: false },
  { label: 'Model B', selected: false, disabled: false },
  { label: 'Model C', selected: false, disabled: true },
];

function pageFor(models = choices, selected = 'Model B', clicked = true) {
  const calls = [];
  return { calls, wait: async (arg) => calls.push(['wait', arg]), click: async (arg) => calls.push(['click', arg]),
    evaluate: async (_callback, arg) => {
      calls.push(['evaluate', arg]);
      if (calls.filter(([name]) => name === 'evaluate').length === 1) return models;
      if (arg !== undefined) return clicked;
      return selected;
    } };
}

test('discovers available model labels and selection state', async () => {
  assert.deepEqual(await discoverModels(pageFor()), choices);
});

test('fails closed for missing or malformed model controls', async () => {
  await assert.rejects(() => discoverModels(pageFor([])), /unexpected structure/);
  await assert.rejects(() => discoverModels({ wait: async () => { throw new Error('selector missing'); } }), /Could not discover Qwen models/);
});

test('selects an available model and confirms selected label', async () => {
  const page = pageFor();
  assert.equal(await selectModel(page, 'Model B'), 'Model B');
  assert.equal(page.calls.filter(([name]) => name === 'evaluate').length, 3);
});

test('rejects unavailable, disabled, changed, or mismatched models', async () => {
  for (const label of ['missing', 'Model C']) await assert.rejects(() => selectModel(pageFor(), label), /unavailable/);
  await assert.rejects(() => selectModel(pageFor(choices, 'Model B', false), 'Model B'), /unavailable/);
  await assert.rejects(() => selectModel(pageFor(choices, 'Model A'), 'Model B'), /selection mismatch/);
});

test('does not change an already selected model', async () => {
  const page = pageFor(choices, 'Model A');
  assert.equal(await selectModel(page, 'Model A'), 'Model A');
  assert.equal(page.calls.filter(([name]) => name === 'evaluate').length, 2);
});

test('models rejects an unauthenticated account before opening the menu', async () => {
  const { listModels } = await import('../models.js');
  let clicks = 0;
  const page = { goto: async () => {}, evaluate: async () => ({ success: true, data: false }),
    click: async () => { clicks += 1; } };
  await assert.rejects(() => listModels(page), /not signed in/);
  assert.equal(clicks, 0);
});

test('models propagates authentication errors without opening the menu', async () => {
  const { listModels } = await import('../models.js');
  let clicks = 0;
  const page = { goto: async () => {}, evaluate: async () => { throw new Error('Qwen API authentication failed: HTTP 401'); },
    click: async () => { clicks += 1; } };
  await assert.rejects(() => listModels(page), /authentication failed: HTTP 401/);
  assert.equal(clicks, 0);
});
