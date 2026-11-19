import test from 'node:test';
import assert from 'node:assert/strict';
import { chatDeleteCommand } from '../chat-delete.js';

const TARGET = '749e6bbd-6a45-4440-beaa-ae5238bf06d8';
const NEIGHBOR = 'a3f1c2d4-5b6e-4a7f-8c9d-0e1f2a3b4c5d';

// ── Minimal DOM harness ─────────────────────────────────────────────────────
// Runs chat-delete's real in-page probes against a hand-built sidebar/dialog
// tree; only the selectors the adapter uses are supported.
function matches(el, selector) {
  let rest = selector.trim();
  const tagMatch = rest.match(/^([a-zA-Z][\w-]*)/);
  if (tagMatch) {
    if (el.tagName !== tagMatch[1].toUpperCase()) return false;
    rest = rest.slice(tagMatch[0].length);
  }
  const parts = rest.match(/\[[^\]]+\]|\.[\w-]+/g) ?? [];
  if (parts.join('') !== rest) throw new Error(`unsupported selector: ${selector}`);
  return parts.every((part) => {
    if (part.startsWith('.')) return el.className.split(/\s+/).includes(part.slice(1));
    const found = part.match(/^\[([\w-]+)(\*?=)"?([^\]" ]*)"?\]$/);
    if (!found) throw new Error(`unsupported selector part: ${part}`);
    const [, name, op, value] = found;
    const actual = el.getAttribute(name);
    if (actual == null) return false;
    return op === '*=' ? actual.includes(value) : actual === value;
  });
}

function queryAll(root, selector) {
  const out = [];
  const walk = (el) => {
    for (const child of el.children) {
      if (matches(child, selector)) out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

function node({ tag = 'div', className = '', text = '', attrs = {}, children = [], visible = true, width = 28, height = 28 } = {}) {
  const el = {
    tagName: tag.toUpperCase(),
    className,
    text,
    attrs,
    children,
    visible,
    width,
    height,
    clicks: 0,
    events: [],
    parentElement: null,
    onClick: null,
    onHover: null,
    getAttribute(name) {
      if (name === 'class') return this.className;
      return name in this.attrs ? this.attrs[name] : null;
    },
    getClientRects() { return this.visible ? [{ width: this.width, height: this.height }] : []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: this.width, height: this.height }; },
    get textContent() { return this.text + this.children.map((child) => child.textContent).join(''); },
    get innerText() { return this.textContent; },
    click() { this.clicks += 1; this.onClick?.(this); },
    dispatchEvent(event) {
      this.events.push(event.type);
      if (event.type === 'mouseover') this.onHover?.(this);
    },
    querySelector(selector) { return queryAll(this, selector)[0] ?? null; },
    querySelectorAll(selector) { return queryAll(this, selector); },
  };
  for (const child of children) child.parentElement = el;
  return el;
}

function buildApp({
  target = TARGET,
  neighbors = [NEIGHBOR],
  dialog = 'full',
  deleteItems = ['Delete'],
  confirmControl = true,
  removeOnConfirm = true,
  keepDialogOpen = false,
  extraDialog = false,
  menuRevealed = true,
  duplicateTarget = false,
  url = 'https://chat.deepseek.com/',
} = {}) {
  const ids = [target, ...neighbors, ...(duplicateTarget ? [target] : [])].filter(Boolean);
  const conversations = ids.map((id) => {
    const link = node({ tag: 'a', className: 'ds-sidebar-link', text: `Chat ${id}`, attrs: { href: `/a/chat/s/${id}` } });
    const menu = node({ tag: 'button', className: 'ds-button ds-button--icon', text: '⋯', visible: false });
    const container = node({ className: 'ds-sidebar-item', children: [link, menu] });
    return { id, link, menu, container };
  });
  const targetConversation = conversations.find((item) => item.id === target);

  const dropdownItems = ['Rename', 'Pin', ...deleteItems].map((label) =>
    node({ className: 'ds-dropdown-menu-option__label', text: label, visible: false }));

  let dialogNode = null;
  const cancel = node({ className: 'ds-button ds-button--outlinedNeutral', text: 'Cancel', visible: false });
  const confirm = confirmControl
    ? node({ className: 'ds-button ds-button--error', text: 'Delete chat', visible: false })
    : null;
  if (dialog !== 'none') {
    dialogNode = node({
      className: 'ds-modal-content ds-elevated',
      attrs: { role: 'dialog' },
      text: dialog === 'full' ? 'Once deleted, this chat cannot be recovered.' : 'Are you sure?',
      visible: false,
      children: [...(confirm ? [confirm] : []), cancel],
    });
  }

  const openDialog = () => {
    if (!dialogNode) return;
    dialogNode.visible = true;
    cancel.visible = true;
    if (confirm) confirm.visible = true;
  };
  for (const item of dropdownItems) {
    if (item.text === 'Delete') item.onClick = openDialog;
  }
  for (const conversation of conversations) {
    conversation.menu.onClick = () => dropdownItems.forEach((item) => { item.visible = true; });
  }
  if (confirm) {
    confirm.onClick = () => {
      if (removeOnConfirm && targetConversation) {
        const siblings = targetConversation.container.children;
        const index = siblings.indexOf(targetConversation.link);
        if (index >= 0) siblings.splice(index, 1);
      }
      if (keepDialogOpen) return;
      dialogNode.visible = false;
      confirm.visible = false;
      cancel.visible = false;
    };
  }

  const sidebar = node({ className: 'ds-sidebar', children: conversations.map((item) => item.container) });
  const duplicates = extraDialog
    ? [node({ className: 'ds-modal-content ds-elevated', attrs: { role: 'dialog' }, text: 'Once deleted, this chat cannot be recovered.', children: [cancel] })]
    : [];
  const root = node({ children: [sidebar, ...dropdownItems, ...(dialogNode ? [dialogNode] : []), ...duplicates] });
  const reveal = () => {
    if (targetConversation && menuRevealed) targetConversation.menu.visible = true;
  };
  if (targetConversation) targetConversation.link.onHover = reveal;

  return {
    url,
    document: {
      querySelectorAll: (selector) => queryAll(root, selector),
      querySelector: (selector) => queryAll(root, selector)[0] ?? null,
    },
    reveal,
    conversations,
    targetConversation,
    dropdownItems,
    dialogNode,
    cancel,
    confirm,
  };
}

// Runs chat-delete against the harness page; always resolves with the outcome
// and the recorded UI calls so failures stay inspectable.
async function run(app, args, { withHover = true } = {}) {
  const calls = [];
  let currentUrl = app.url;
  const page = {
    getCurrentUrl: async () => { calls.push(['getCurrentUrl']); return currentUrl; },
    goto: async (target) => { calls.push(['goto', target]); currentUrl = target; },
    wait: async (seconds) => { calls.push(['wait', seconds]); },
    evaluate: async (fn, arg) => { calls.push(['evaluate']); return fn(arg); },
  };
  if (withHover) page.hover = async (selector) => { calls.push(['hover', selector]); app.reveal(); };

  const saved = { document: globalThis.document, window: globalThis.window, MouseEvent: globalThis.MouseEvent };
  globalThis.document = app.document;
  globalThis.window = globalThis;
  globalThis.MouseEvent = class { constructor(type, init) { this.type = type; this.init = init; } };
  try {
    return { ok: true, result: await chatDeleteCommand.func(page, args), calls };
  } catch (error) {
    return { ok: false, error, calls };
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete globalThis[key];
      else globalThis[key] = saved[key];
    }
  }
}

async function runFailing(app, args, options) {
  const outcome = await run(app, args, options);
  assert.equal(outcome.ok, false, `expected a failure, got ${JSON.stringify(outcome.result)}`);
  return outcome;
}

// ── Tests ───────────────────────────────────────────────────────────────────
test('rejects an invalid UUID before touching the page', async () => {
  const outcome = await run(buildApp(), { id: 'not-a-uuid' });
  assert.equal(outcome.ok, false);
  assert.match(outcome.error.message, /DeepSeek conversation UUID/);
  assert.deepEqual(outcome.calls, []);
});

test('deletes exactly the requested conversation and verifies it disappeared', async () => {
  const app = buildApp();
  const outcome = await run(app, { id: TARGET });
  assert.equal(outcome.ok, true, String(outcome.error));
  assert.deepEqual(outcome.result, [{ deleted: true, id: TARGET }]);
  assert.equal(app.confirm.clicks, 1);
  assert.equal(app.cancel.clicks, 0);
  const deleteItem = app.dropdownItems.find((item) => item.text === 'Delete');
  assert.equal(deleteItem.clicks, 1);
  const neighbor = app.conversations.find((item) => item.id === NEIGHBOR);
  assert.equal(neighbor.container.children.includes(neighbor.link), true, 'neighbor link must survive');
  assert.equal(neighbor.menu.clicks, 0, 'neighbor menu must stay untouched');
  const hoverCall = outcome.calls.find(([name]) => name === 'hover');
  assert.ok(hoverCall, 'expected a hover on the target link');
  assert.ok(hoverCall[1].includes(TARGET) && !hoverCall[1].includes(NEIGHBOR));
});

test('reaches a new chat through the root URL when the lease is blank', async () => {
  const app = buildApp({ url: 'about:blank' });
  const outcome = await run(app, { id: TARGET });
  assert.equal(outcome.ok, true, String(outcome.error));
  assert.deepEqual(outcome.calls.filter(([name]) => name === 'goto'), [['goto', 'https://chat.deepseek.com/']]);
});

test('fails closed when the conversation is not in the sidebar', async () => {
  const app = buildApp({ target: null });
  const outcome = await runFailing(app, { id: TARGET });
  assert.match(outcome.error.message, new RegExp(`conversation ${TARGET} is not visible in the sidebar; it may be virtualized away or already deleted — verify with deepseek-chat chats`));
  assert.equal(outcome.calls.filter(([name]) => name === 'evaluate').length, 1);
  assert.equal(app.cancel.clicks, 0);
});

test('refuses to guess when the sidebar shows the conversation twice', async () => {
  const app = buildApp({ duplicateTarget: true });
  const outcome = await runFailing(app, { id: TARGET });
  assert.match(outcome.error.message, /appears 2 times in the sidebar; refusing to guess/);
  assert.equal(outcome.calls.filter(([name]) => name === 'hover').length, 0);
});

test('fails when the hover never reveals the conversation menu', async () => {
  const app = buildApp({ menuRevealed: false });
  const outcome = await runFailing(app, { id: TARGET });
  assert.match(outcome.error.message, /did not open; nothing was deleted/);
  assert.equal(app.confirm?.clicks ?? 0, 0);
  assert.equal(app.cancel.clicks, 0);
});

test('fails when the Delete menu item is missing or ambiguous', async () => {
  const missing = await runFailing(buildApp({ deleteItems: ['Rename', 'Pin'] }), { id: TARGET });
  assert.match(missing.error.message, /Delete item for conversation .* was missing/);
  assert.equal(missing.calls.filter(([name]) => name === 'evaluate').length, 8, 'bounded probes before giving up');

  const ambiguous = await runFailing(buildApp({ deleteItems: ['Delete', 'Delete'] }), { id: TARGET });
  assert.match(ambiguous.error.message, /Delete item for conversation .* was ambiguous/);
});

test('fails when the confirmation dialog is missing or does not match the observed text', async () => {
  const noDialogApp = buildApp({ dialog: 'none' });
  const noDialog = await runFailing(noDialogApp, { id: TARGET });
  assert.match(noDialog.error.message, /delete confirmation for conversation .* was missing/);

  const wrongTextApp = buildApp({ dialog: 'wrong' });
  const wrongText = await runFailing(wrongTextApp, { id: TARGET });
  assert.match(wrongText.error.message, /delete confirmation for conversation .* was missing/);

  const noControlApp = buildApp({ confirmControl: false });
  const noControl = await runFailing(noControlApp, { id: TARGET });
  assert.match(noControl.error.message, /delete confirmation for conversation .* was no_confirm/);

  for (const app of [noDialogApp, wrongTextApp, noControlApp]) {
    assert.equal(app.confirm?.clicks ?? 0, 0, 'the destructive control must not be clicked');
    assert.equal(app.cancel.clicks, 0, 'Cancel must never be clicked');
  }
});

test('fails closed when the confirmation dialog appears more than once', async () => {
  const app = buildApp({ extraDialog: true });
  const outcome = await runFailing(app, { id: TARGET });
  assert.match(outcome.error.message, /delete confirmation for conversation .* was ambiguous/);
  assert.equal(app.confirm.clicks, 0);
  assert.equal(app.cancel.clicks, 0);
});

test('refuses to retry when the confirmation click does not close the dialog', async () => {
  const app = buildApp({ keepDialogOpen: true });
  const outcome = await runFailing(app, { id: TARGET });
  assert.match(outcome.error.message, /did not close the dialog; refusing to retry/);
  assert.equal(app.confirm.clicks, 1, 'the confirm click must never repeat');
  assert.equal(app.cancel.clicks, 0);
});

test('keeps exactly one destructive click even when verification retries', async () => {
  const app = buildApp({ removeOnConfirm: false });
  const outcome = await runFailing(app, { id: TARGET });
  assert.match(outcome.error.message, new RegExp(`deletion could not be verified; conversation ${TARGET} still visible — inspect deepseek-chat chats`));
  assert.equal(app.confirm.clicks, 1, 'the confirm click must never repeat');
  assert.equal(app.cancel.clicks, 0);
  assert.ok(outcome.calls.filter(([name]) => name === 'wait').length >= 5, 'expected bounded verification retries');
});

test('opens the menu with in-page hover events when the bridge has no hover', async () => {
  const app = buildApp();
  const outcome = await run(app, { id: TARGET }, { withHover: false });
  assert.equal(outcome.ok, true, String(outcome.error));
  assert.ok(outcome.calls.every(([name]) => name !== 'hover'));
  assert.ok(app.targetConversation.link.events.includes('mouseover'));
  assert.equal(app.confirm.clicks, 1);
});

test('refuses to operate on an unrelated page', async () => {
  const app = buildApp({ url: 'https://example.com/' });
  const outcome = await runFailing(app, { id: TARGET });
  assert.match(outcome.error.message, /Open the signed-in DeepSeek tab/);
  assert.equal(outcome.calls.filter(([name]) => name === 'evaluate').length, 0);
});
