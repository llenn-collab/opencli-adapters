import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveAttachment, uploadAttachment } from '../upload.mjs';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'upload-test.txt');

// Scripted page: each evaluate marker consumes its own result list; Error
// entries throw, the last entry repeats.
function uploadPage({ setFileInputError, script = {} } = {}) {
  const calls = { setFileInput: 0, fallback: 0, preview: 0, sendReady: 0, wait: 0 };
  const defaults = { fallback: [{ ok: true }], preview: [true], sendReady: [true] };
  const take = (key) => {
    const list = script[key] ?? defaults[key];
    const entry = list.length > 1 ? list.shift() : list[0];
    if (entry instanceof Error) throw entry;
    return entry;
  };
  return {
    calls,
    wait: async () => { calls.wait += 1; },
    setFileInput: async () => {
      calls.setFileInput += 1;
      if (setFileInputError) throw new Error(setFileInputError);
    },
    evaluate: async (fn) => {
      const source = String(fn);
      if (source.includes('data-deepseek-upload-fallback')) { calls.fallback += 1; return take('fallback'); }
      if (source.includes('data-deepseek-upload-preview')) { calls.preview += 1; return take('preview'); }
      if (source.includes('data-deepseek-upload-send-ready')) { calls.sendReady += 1; return take('sendReady'); }
      throw new Error(`unexpected evaluate: ${source.slice(0, 80)}`);
    },
  };
}

test('resolves attachments in Node before any browser work', () => {
  const file = resolveAttachment(FIXTURE);
  assert.equal(file.name, 'upload-test.txt');
  assert.ok(path.isAbsolute(file.path));
  assert.ok(fs.readFileSync(file.path, 'utf8').includes('DEEPSEEK-UPLOAD-MARKER-2026-11-18'));
  assert.throws(() => resolveAttachment(''), /attachment path is required/);
  assert.throws(() => resolveAttachment(path.join(path.dirname(FIXTURE), 'no-such-file.txt')), /not readable/);
  assert.throws(() => resolveAttachment(path.dirname(FIXTURE)), /not a regular file/);
});

test('rejects attachments above the 100 MB cap without reading them', () => {
  const big = path.join(os.tmpdir(), `deepseek-upload-cap-${process.pid}.txt`);
  fs.writeFileSync(big, '');
  try {
    fs.truncateSync(big, 100 * 1024 * 1024 + 1);
    assert.throws(() => resolveAttachment(big), /too large.*100 MB/);
  } finally {
    fs.rmSync(big, { force: true });
  }
});

test('uploads through setFileInput when the bridge supports it', async () => {
  const page = uploadPage();
  assert.deepEqual(await uploadAttachment(page, FIXTURE), { ok: true });
  assert.equal(page.calls.setFileInput, 1);
  assert.equal(page.calls.fallback, 0);
  assert.equal(page.calls.preview, 1);
  assert.equal(page.calls.sendReady, 1);
});

test('falls back to the in-page File path only for the observed bridge errors', async () => {
  for (const fragment of ['Unknown action', 'not supported', 'Not allowed', 'fileChooserOpened not received']) {
    const page = uploadPage({ setFileInputError: `bridge refused: ${fragment}` });
    assert.deepEqual(await uploadAttachment(page, FIXTURE), { ok: true }, fragment);
    assert.equal(page.calls.setFileInput, 1, fragment);
    assert.equal(page.calls.fallback, 1, fragment);
  }
});

test('propagates unrelated setFileInput errors without falling back', async () => {
  const page = uploadPage({ setFileInputError: 'CDP session closed' });
  await assert.rejects(() => uploadAttachment(page, FIXTURE), /CDP session closed/);
  assert.equal(page.calls.fallback, 0);
});

test('fails closed when the fallback finds no React change handler', async () => {
  const page = uploadPage({
    setFileInputError: 'Unknown action',
    script: { fallback: [{ ok: false, reason: 'React onChange not found' }] },
  });
  assert.deepEqual(await uploadAttachment(page, FIXTURE), { ok: false, reason: 'React onChange not found' });
  assert.equal(page.calls.preview, 0);
});

test('fails closed when the file preview or the send control never appears', async () => {
  const noPreview = uploadPage({ script: { preview: [false] } });
  assert.deepEqual(await uploadAttachment(noPreview, FIXTURE), { ok: false, reason: 'file preview did not appear' });
  assert.equal(noPreview.calls.preview, 8);

  const noSend = uploadPage({ script: { sendReady: [false] } });
  assert.deepEqual(await uploadAttachment(noSend, FIXTURE), { ok: false, reason: 'send button did not enable after upload' });
  assert.equal(noSend.calls.sendReady, 15);
});

test('tolerates "Promise was collected" on readiness reads only', async () => {
  const page = uploadPage({
    script: {
      preview: [new Error('Promise was collected'), true],
      sendReady: [new Error('Promise was collected'), true],
    },
  });
  assert.deepEqual(await uploadAttachment(page, FIXTURE), { ok: true });
  assert.equal(page.calls.preview, 2);
  assert.equal(page.calls.sendReady, 2);
  assert.equal(page.calls.setFileInput, 1);

  const onSetFileInput = uploadPage({ setFileInputError: 'Promise was collected' });
  await assert.rejects(() => uploadAttachment(onSetFileInput, FIXTURE), /Promise was collected/);
  assert.equal(onSetFileInput.calls.fallback, 0);
});

test('uses the in-page fallback when the bridge has no setFileInput at all', async () => {
  const page = uploadPage();
  delete page.setFileInput;
  assert.deepEqual(await uploadAttachment(page, FIXTURE), { ok: true });
  assert.equal(page.calls.fallback, 1);
});
