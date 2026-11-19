# Qwen Reliability and Acceptance Implementation Plan

**Goal:** Meet every acceptance criterion in `goal.md` with repeatable evidence, or identify the precise external blocker and leave it explicitly unresolved.

**Approach:** Establish a reproducible baseline, isolate browser and site failures with controlled probes, fix demonstrated defects in the existing adapter, and verify each acceptance criterion in the actual supported environment. Playwright and agent-browser are diagnostic controls; the supported adapter remains OpenCLI. No result is guaranteed in advance because Chrome, Qwen, account state and service availability are external dependencies.

**Scope and constraints:** Preserve the connected profile and existing work. Never extract or log tokens. Use only authorized small prompts, no automatic submission retries, no invented age data, no bypass of browser permissions. Do not open replacement sessions in response to a stall. Do not claim a feature passes based only on a control changing or a mock test. Record sanitized evidence, stage, timing, profile/session identity and failure category, excluding secrets and personal data.

## 1. Establish the baseline

- [ ] Review `git status`, current changes, `goal.md`, `docs/verification.md`, installed OpenCLI version and its adapter/bridge session behavior. Preserve unrelated changes. Run `node --test tests/*.test.js`, `opencli adapter check qwen-studio`, and `git diff --check`; record actual results.
- [ ] Verify the exact installed plugin path and that the adapter under test is the current working tree. Check bridge/profile identity without dumping browser state. Use one connected profile, foreground window and `OPENCLI_SITE_SLOTS=qwen-studio:1` for every pooled Qwen command; verify all participating callers use it. Record that direct CDP and ephemeral sessions are outside this pool.
- [ ] Inspect the current `ask.js` readiness and submission path, `qwen-api.mjs`, `models.js`, their callers and tests, including risks from cached URLs, visible-but-obscured controls, loading before token availability, reconnects and the time between readiness and dispatch. Design regression cases from observed behavior before changing code.

## 2. Isolate the browser lifecycle

- [ ] Read the agent-desktop skill and run `agent-desktop skills get desktop` and `agent-desktop skills get platform` before using it. Observe the existing window, tab, origin, login/verification dialog and composer without inspecting credentials. Record whether any tabs or windows are created by each operation.
- [ ] Run bounded, sequential read-only status and model checks in the pooled profile. Compare page identity and URL before and after; verify `about:blank` initializes once, existing Qwen pages are reused, and unrelated pages are not navigated. Check that connection loss produces a clear error without a replacement session.
- [ ] On an isolated local fixture or test doubles, exercise delayed loading, missing authentication, visible age and other blocking dialogs, disabled/covered composer, wrong origin, and disconnects before and after dispatch. Use Playwright only against a fixture or an explicitly identified target; do not copy session credentials. Confirm zero submissions on pre-dispatch errors and one maximum on uncertain dispatch.
- [ ] Demonstrate concurrent admission with controlled, non-destructive operations using the same pool; show the second waits and cannot navigate the first operation's page. If a process can bypass the pool, document the limitation and enforce the policy at the actual invocation boundary where feasible. Do not claim global serialization otherwise.
- [ ] For each demonstrated defect, add a failing focused test, fix the shared cause in the smallest affected code path, rerun its test and suite, and independently review before live retesting. Candidate files: `ask.js`, `qwen-api.mjs`, `models.js`, `tests/ask.test.js`, `tests/qwen-api.test.js`, and `tests/models.test.js`; change only files justified by evidence.

## 3. Prove text, model and recovery

- [ ] Verify signed-in status live; exercise signed-out behavior using an isolated fixture or separate test profile without signing out the user's profile. Detect manual verification and stop before submission; have the user resolve it truthfully if it appears.
- [ ] Discover models and choose an available model; verify the selected UI state and response metadata where Qwen exposes it. Record observed model, not an assumed effect.
- [ ] Run a small new prompt with a unique marker, save its returned conversation ID, then send a follow-up using that exact ID. Verify a completed nonempty answer, remembered marker, unchanged ID and compact JSON. Repeat a bounded set of sequential runs after lifecycle fixes; log each outcome, not just successes.
- [ ] Simulate transient reads, timeouts, hidden page and connection loss in tests; verify a single dispatch and a read-first recovery message. For any real uncertain submission, inspect chats and the known conversation before deciding on any retry. Confirm no duplicate user message in the inspected conversation.

## 4. Find the upload boundary

- [ ] Create a local non-sensitive file and isolated local HTML file-input fixture. Test OpenCLI Browser Bridge `setFileInput` and `opencli browser upload` on that fixture, observing only filename and change event; no network or Qwen prompt. Compare the exact failure with the documented `DOM.setFileInputFiles` / `Not allowed` error.
- [ ] Use agent-desktop on the same fixture as a native chooser control, following its skill; use Playwright or agent-browser on the isolated fixture only as independent controls. Determine whether the restriction is bridge-wide, profile/runtime-specific, or Qwen-specific. A working desktop chooser is diagnostic evidence, not an implicit supported adapter fallback.
- [ ] Inspect installed OpenCLI's supported upload capabilities and relevant version-matched documentation. If a supported, permission-respecting path exists, add a focused regression and implement it; validate a real benign file reaches Qwen by asking for a unique marker present only in that file. Verify the response and conversation record. If Chrome/bridge forbids every supported path, record exact evidence and the external change needed; leave upload and overall acceptance **blocked**, never bypass security or call it passed.

## 5. Verify modes and actual delegation

- [ ] Exercise Auto, Fast and Thinking, and requested Web search, Deep Research and Web Dev separately with bounded, appropriate tasks. Verify results and observable feature metadata; a toggled control or plausible sources alone does not prove a mode worked. Classify unavailable or failed modes accurately and inspect conversations before retrying uncertain submissions.
- [ ] Perform one real Codex-to-Qwen-to-Codex review on a small, non-sensitive fixture with a known defect. Capture the compact answer and conversation ID, ask one follow-up with that ID, independently check the finding against the fixture, and document the final result and any false positives. Do not claim completion from a response alone.

## 6. Final gate and records

- [ ] Run `node --test tests/*.test.js`, `opencli adapter check qwen-studio`, and `git diff --check` on the final tree. Review all changed files and the effects on existing callers. Report every failure, warning, skipped check and unrelated pre-existing change.
- [ ] Update `docs/verification.md`, `docs/coverage.md`, `docs/agent-integration.md` and `goal.md` to reconcile priorities, commands, limitations and reproducible evidence. Keep historical results distinguished from current results.
- [ ] Mark the goal complete only when all nine acceptance tests in `goal.md` pass with browser-backed evidence where applicable, including real file content and a verified delegation, and requested modes have their stated evidence. If any external dependency prevents a test, report the exact blocker and leave the criterion unresolved. The all-pass gate is evidence of the tested configurations, not a guarantee of future service availability or every possible failure.

## Execution ownership and sequencing

- One builder owns the coupled browser lifecycle files and their tests; the primary agent reviews the diff and evidence. A worker may prepare the isolated upload fixture in parallel, without touching the authenticated tab. One operator owns that tab, and all live Qwen operations are sequential except the explicitly controlled slot-admission test.
- Before changing the submission path, investigate the generic textarea selector, conversation identity after control changes, and actual-origin validation inside `readConversation`; treat these as hypotheses until a failing test or observed behavior establishes a defect.
- The core live exchange must also read back both turns, confirm one user message per prompt, and verify exactly the default `answer` and `conversation_id` result fields. A successful manual native upload is a diagnostic control; only an adapter-driven supported upload passes acceptance.
