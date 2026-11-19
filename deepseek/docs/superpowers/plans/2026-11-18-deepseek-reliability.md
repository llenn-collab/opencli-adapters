# DeepSeek Chat Reliability and Acceptance Implementation Plan

Follows the same working plan as `qwen-studio` (see `qwen/docs/superpowers/plans/`). Current status: initial adapter implemented, unit-tested and live-verified for all criteria except model discovery (blocked by the current UI build). See `docs/verification.md` for evidence and `goal.md` for the acceptance criteria.

## Scope and constraints

Preserve the connected profile and existing work. Never extract or log tokens. Use only authorized small prompts, no automatic submission retries, no invented data, no bypass of browser permissions. Do not open replacement sessions in response to a stall. Do not claim a feature passes based only on a control changing or a mock test. Record sanitized evidence, stage, timing, profile/session identity and failure category, excluding secrets and personal data.

- [x] Establish the baseline: move the `qwen-studio` plugin into `qwen/` (self-contained, symlink re-pointed), scaffold `deepseek/` on the same structure, keep all pre-existing changes.
- [x] Implement `status`, `models`, `chats`, `chat-detail`, `ask`, `code-output` against observed DeepSeek behavior only (`userToken` + `/api/v0/users/current` code envelope; sidebar links; `.ds-message` bubbles with think/answer DOM split; positional model radios; DeepThink/Search toggle order).
- [x] Regression tests from observed behavior before live use: mocked page objects, zero-submission guarantees, single-submission recovery paths (46 tests).
- [x] Live verification on the connected profile: status, chats, chat-detail, ask round-trip, multi-turn continuation, DeepThink and Search evidence. Record every result in `docs/verification.md`.
- [ ] Model discovery/selection acceptance: blocked — the current UI build renders no model picker (`[role=radio]` empty on new-chat and conversation pages). `models` and `ask --model` fail closed. Re-run when DeepSeek re-exposes a picker; the radio path stays unit-tested.
- [ ] Extract citation markers from `--search` answers when a stable marker structure is observed (current artifact recorded in `docs/verification.md`).
- [ ] If Chrome/bridge forbids every supported upload path (as in qwen-studio), keep file uploads out of adapter coverage; never bypass security or claim uploads passed.
- [ ] Final gate on every change: `node --test deepseek/tests/*.test.js`, `node --test qwen/tests/*.test.js`, `opencli adapter check deepseek-chat`, `git diff --check`; report every failure, warning and unrelated pre-existing change.
- [ ] Keep `docs/verification.md`, `docs/coverage.md`, `docs/agent-integration.md` and `goal.md` reconciled after each live session; keep historical results distinguished from current results.
- [ ] Mark the goal complete only when all nine acceptance tests in `goal.md` have evidence, or the unresolved criteria name their exact external blocker.

## Ownership

One builder owns `ask.js`, `message-content.mjs`, `model-ui.mjs` and their tests (the coupled browser-lifecycle files); the primary agent reviews diffs and evidence. Live DeepSeek operations are sequential on one pooled slot (`OPENCLI_SITE_SLOTS=deepseek-chat:1`, foreground window for `ask`). DOM probes for UI drift are read-only, run on scratch tabs outside the pool, and cleaned up after.
