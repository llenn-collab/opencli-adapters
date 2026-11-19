import fs from 'node:fs';
import path from 'node:path';
import { CommandExecutionError } from '@jackwener/opencli/errors';

// Observed bridge errors that mean page.setFileInput is unavailable; only these
// fall back to the in-page File/DataTransfer path. Anything else is a real
// failure and must propagate.
const SET_FILE_INPUT_FALLBACKS = ['Unknown action', 'not supported', 'Not allowed', 'fileChooserOpened not received'];
const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;

// Resolves and validates the file in Node before any browser work, so a bad
// path fails the command with zero UI calls.
export function resolveAttachment(filePath) {
  const raw = String(filePath ?? '').trim();
  if (!raw) throw new CommandExecutionError('attachment path is required');
  const abs = path.resolve(raw);
  let stats;
  try { stats = fs.statSync(abs); }
  catch (error) {
    throw new CommandExecutionError(`attachment is not readable: ${abs} (${error.code ?? error.message})`);
  }
  if (!stats.isFile()) throw new CommandExecutionError(`attachment is not a regular file: ${abs}`);
  if (stats.size > MAX_ATTACHMENT_BYTES) {
    throw new CommandExecutionError(`attachment is too large (${(stats.size / 1024 / 1024).toFixed(1)} MB); maximum is 100 MB`);
  }
  return { path: abs, name: path.basename(abs) };
}

// SPA router transitions can throw CDP "Promise was collected"; only idempotent
// readiness reads are retried — never setFileInput and never the Enter submit.
async function readWithRetry(page, fn, args) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await page.evaluate(fn, args); }
    catch (error) {
      const message = String(error?.message || error);
      if (attempt < 2 && message.includes('Promise was collected')) {
        await page.wait(0.5);
        continue;
      }
      throw error;
    }
  }
}

// Observed: the preview appears first (filename leaf div, or a preview-like node
// for images) while the send control stays disabled until the upload finishes.
export async function waitForFilePreview(page, fileName, attempts = 8) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    await page.wait(2);
    const ready = await readWithRetry(page, (name) => {
      // data-deepseek-upload-preview
      const SEND = 'button.ds-button--primary, div[role="button"]:not(.ds-toggle-button)';
      const hasName = [...document.querySelectorAll('div')]
        .some((el) => el.children.length === 0 && (el.textContent || '').trim() === name);
      if (hasName) return true;
      const box = document.querySelector('textarea[placeholder*="DeepSeek"]');
      if (!box) return false;
      let container = box.parentElement;
      while (container && !container.querySelector(SEND)) container = container.parentElement;
      if (!container) return false;
      return Boolean(container.querySelector('img[src], canvas, video, [style*="background-image"], [class*="preview"], [class*="upload"]'));
    }, fileName);
    if (ready) return true;
  }
  return false;
}

export async function waitForSendReady(page, attempts = 15) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const enabled = await readWithRetry(page, () => {
      // data-deepseek-upload-send-ready
      const SEND = 'button.ds-button--primary, div[role="button"]:not(.ds-toggle-button)';
      const box = document.querySelector('textarea[placeholder*="DeepSeek"]');
      if (!box) return false;
      let container = box.parentElement;
      while (container && !container.querySelector(SEND)) container = container.parentElement;
      if (!container) return false;
      const buttons = container.querySelectorAll(SEND);
      const last = buttons[buttons.length - 1];
      return Boolean(last && last.getAttribute('aria-disabled') !== 'true' && !last.disabled && last.querySelector('svg'));
    });
    if (enabled) return true;
    await page.wait(1);
  }
  return false;
}

export async function uploadAttachment(page, filePath, fileName) {
  const file = resolveAttachment(filePath);
  const name = fileName ? String(fileName) : file.name;
  let uploaded = false;
  if (typeof page.setFileInput === 'function') {
    try {
      await page.setFileInput([file.path], 'input[type="file"]');
      uploaded = true;
    } catch (error) {
      const message = String(error?.message || error);
      if (!SET_FILE_INPUT_FALLBACKS.some((fragment) => message.includes(fragment))) throw error;
    }
  }
  if (!uploaded) {
    const base64 = fs.readFileSync(file.path).toString('base64');
    const result = await page.evaluate((payload) => {
      // data-deepseek-upload-fallback
      const binary = atob(payload.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const input = document.querySelector('input[type="file"]');
      if (!input) return { ok: false, reason: 'file input not found' };
      const propsKey = Object.keys(input).find((key) => key.startsWith('__reactProps$'));
      if (!propsKey || typeof input[propsKey].onChange !== 'function') {
        return { ok: false, reason: 'React onChange not found' };
      }
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], payload.name));
      // Use input.files, not transfer.files: the assignment transfers ownership.
      input.files = transfer.files;
      input[propsKey].onChange({ target: { files: input.files } });
      return { ok: true };
    }, { base64, name });
    if (!result?.ok) return { ok: false, reason: result?.reason ?? 'file input could not be filled' };
  }
  if (!await waitForFilePreview(page, name)) return { ok: false, reason: 'file preview did not appear' };
  if (!await waitForSendReady(page)) return { ok: false, reason: 'send button did not enable after upload' };
  return { ok: true };
}
