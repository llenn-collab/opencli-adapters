import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverModels, selectModel, setFeature } from '../model-ui.mjs';
const choices = [
  { label: 'instant', selected: true, disabled: false },
  { label: 'expert', selected: false, disabled: false },
  { label: 'vision', selected: false, disabled: true },
];
function pageFor(models = choices, selected = 'expert', clicked = true) {
  const calls = [];
  return {
    calls,
    wait: async (arg) => calls.push(['wait', arg]),
    evaluate: async (_callback, arg) => {
      calls.push(['evaluate', arg]);
      const evaluates = calls.filter(([name]) => name === 'evaluate').length;
      if (evaluates === 1) return models;
      if (typeof arg === 'number') return clicked;
      return selected;
    },
  };
}
test('discovers observed positional model labels and selection state', async () => {
  assert.deepEqual(await discoverModels(pageFor()), choices);
});
test('fails closed for missing or malformed model controls', async () => {
  await assert.rejects(() => discoverModels(pageFor([])), /unexpected structure/);
  await assert.rejects(() => discoverModels(pageFor([{ label: 'instant', selected: true, disabled: false }])), /unexpected structure/);
  await assert.rejects(() => discoverModels({ wait: async () => { throw new Error('selector missing'); } }), /Could not discover DeepSeek models/);
});
test('selects an available model and confirms the selected label', async () => {
  const page = pageFor();
  assert.equal(await selectModel(page, 'expert'), 'expert');
  assert.equal(page.calls.filter(([name]) => name === 'evaluate').length, 3);
});
test('rejects unavailable, disabled, or mismatched models', async () => {
  for (const label of ['missing', 'vision']) await assert.rejects(() => selectModel(pageFor(), label), /unavailable/);
  await assert.rejects(() => selectModel(pageFor(choices, 'expert', false), 'expert'), /unavailable/);
  await assert.rejects(() => selectModel(pageFor(choices, 'instant'), 'expert'), /selection mismatch/);
});
test('does not change an already selected model', async () => {
  const page = pageFor(choices, 'instant');
  assert.equal(await selectModel(page, 'instant'), 'instant');
  assert.equal(page.calls.filter(([name]) => name === 'evaluate').length, 2);
});
test('verifies toggle state after every click and fails closed when it cannot', async () => {
  const featurePage = (results) => {
    const calls = [];
    return {
      calls,
      wait: async (arg) => calls.push(['wait', arg]),
      evaluate: async (fn, arg) => { calls.push([String(fn), arg]); return results.shift(); },
    };
  };
  // already in the requested state: one read, no click
  const idle = featurePage([false]);
  assert.deepEqual(await setFeature(idle, 'DeepThink', false), { ok: true, active: false });
  assert.equal(idle.calls.filter(([source]) => source.includes('button.click()')).length, 0);
  // off -> on and on -> off both verified after the click
  const on = featurePage([false, true, true]);
  assert.deepEqual(await setFeature(on, 'DeepThink', true), { ok: true, active: true });
  assert.equal(on.calls.filter(([source]) => source.includes('button.click()')).length, 1);
  const off = featurePage([true, true, false]);
  assert.deepEqual(await setFeature(off, 'Search', false), { ok: true, active: false });
  assert.equal(off.calls.filter(([source]) => source.includes('button.click()')).length, 1);
  // missing control: no click, not ok
  const missing = featurePage([null]);
  assert.deepEqual(await setFeature(missing, 'DeepThink', true), { ok: false, active: null });
  assert.equal(missing.calls.filter(([source]) => source.includes('button.click()')).length, 0);
  // control disappears between read and click
  const vanished = featurePage([false, false]);
  assert.deepEqual(await setFeature(vanished, 'DeepThink', true), { ok: false, active: null });
  // click ignored: state never reaches the request
  const ignored = featurePage([false, true, false, false]);
  assert.deepEqual(await setFeature(ignored, 'DeepThink', true), { ok: false, active: false });
  assert.equal(ignored.calls.filter(([source]) => source.includes('button.click()')).length, 1);
  await assert.rejects(() => setFeature(featurePage([]), 'Upload', true), /Unknown DeepSeek feature/);
});
test('models rejects an unauthenticated account before opening the picker', async () => {
  const { listModels } = await import('../models.js');
  let probes = 0;
  const page = {
    getCurrentUrl: async () => 'https://chat.deepseek.com/',
    evaluate: async () => { probes += 1; return { code: 40002 }; },
    wait: async () => assert.fail('model picker should not open'),
  };
  await assert.rejects(() => listModels(page), /not signed in/);
  assert.equal(probes, 1);
});
test('models propagates authentication errors without opening the picker', async () => {
  const { listModels } = await import('../models.js');
  const page = {
    getCurrentUrl: async () => 'https://chat.deepseek.com/',
    evaluate: async () => { throw new Error('DeepSeek API authentication failed: HTTP 401'); },
    wait: async () => assert.fail('model picker should not open'),
  };
  await assert.rejects(() => listModels(page), /authentication failed: HTTP 401/);
});
