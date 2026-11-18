# Verification

## Baseline before implementation

- Worktree: clean on branch `main` tracking `origin/main`.
- `node --test tests/*.test.js` — 14 passed, 0 failed.
- `opencli --version` — 2.0.3.
- `opencli adapter check qwen-studio/<command>` — all eight commands passed with zero warnings.
- GitHub issues page — 0 open issues. `gh issue list --repo llenn-collab/temp-workarounds-to-do --state all --limit 50` could not reach the API through the environment proxy.

## Earlier automated checks

Historical checks (the Phase 2 baseline is recorded below):

- `node --test tests/*.test.js` — 20 passed, 0 failed, 0 skipped.
- `opencli adapter check qwen-studio/<command>` for `status`, `chats`, `chat-detail`, `ask`, `projects`, `folders`, `library`, and `code-output` — all passed with zero warnings.
- `opencli qwen-studio --help -f json` — returned machine-readable metadata for eight commands.
- `opencli qwen-studio code-output 'Here is code: ```js\nconsole.log("ok")\n```' --format json` — returned `{"ok":true,"data":[{"language":"js","code":"console.log(\"ok\")"}]}`.
- `opencli qwen-studio code-output '```txt\nhello\n```' --index 2 --output /private/tmp/qwen-studio-invalid-output --format json` — returned an argument error with exit code 2; the output file was not created.
- `git diff --check` — passed.

## Live Qwen checks

Historical checks from the connected signed-in session (2026-11-18):

- Status returned `logged_in: true`; chat list returned results; project/folder and library reads returned expected payloads; chat detail returned user and assistant records.
- Small authorized prompts created conversations but completed with empty assistant content during high demand. The adapter returned `Qwen completed the request without a response; check account limits or site errors`. A visible Qwen message said the service was experiencing high demand. No real nonempty assistant answer has been verified.
- Auto, Fast, Web search, Web Dev, and Deep Research selections reached completion in the historical runs, but empty output means the modes' actual effects remain unverified.
- Attachment through both adapter `page.setFileInput` and direct `opencli browser upload` stopped before submission with Chrome `{"code":-32000,"message":"Not allowed"}`. This is a browser permission/runtime limit; Qwen did not reject an upload.

## Current run (2026-11-18)

- `git fetch origin` confirmed `origin/main` at `6df2b87`; local `14883a9` is one commit ahead and is not on the remote. Work continued on `codex/qwen-live-conversation-phase` without resetting existing work.
- The sandbox could not reach OpenCLI's host-local daemon. With host access, `opencli profile list` showed connected profile `qsfrjtn8` and extension `1.0.27`; `opencli qwen-studio status --window background` returned `logged_in: true`. Agent-browser independently loaded the signed-in Qwen page and observed HTTP 200 for status/config/model/chat-list reads.
- One authorized prompt, `Reply exactly: hello`, created conversation `7e1b2505-122a-411b-aa7e-862d2372308a`. The ask command exited with `Could not read the Qwen response in the current browser session: timeoutMs is not defined`. A separate `chat-detail` read confirmed the user message and an empty assistant message. No prompt was resent; no nonempty live assistant response or multi-turn continuity is verified.
- On the correct OpenCLI profile, Qwen's `#filesUpload` input was present, but `opencli browser upload` failed at Chrome DevTools Protocol `DOM.setFileInputFiles` with `{"code":-32000,"message":"Not allowed"}`. No Qwen upload request was observed. Agent-browser reported its selection action succeeded, but no file remained queued and no upload request followed; no supported upload method is established.

Current audit run:

- Host-access status and authenticated browser connectivity are verified as recorded above. Sandbox-only CLI reads fail because the sandbox cannot reach the host-local browser daemon.
- `ask --conversation-id` has unit coverage, but live continuation remains unverified because the only live assistant record is empty.

## Conversation continuation implementation checks (2026-11-18)

- `node --test tests/*.test.js` — 27 passed, 0 failed, 0 skipped.
- `node --test tests/ask.test.js` — 17 passed, 0 failed.
- `opencli adapter check qwen-studio/ask` — passed with zero errors or warnings.
- `opencli qwen-studio ask --help` — exposes `--conversation-id [value]`; OpenCLI 2.0.3 passes that schema option to the adapter as `args['conversation-id']`, which is covered by UUID validation tests.
- Continuations capture existing message IDs through the read-only page-context history read before submission and fail closed if that baseline is unavailable. Polling requires a new user message matching the current prompt and a new completed assistant message after it.
- The default JSON renderer serializes `{ conversation_id, messages }` under `data` and preserves the message array. OpenCLI's optional table renderer stringifies nested message objects as `[object Object]`; use default JSON for structured messages.
- `git diff --check` — passed.

## Bili check

- `codex --version` — `codex-cli 0.169.0`.
- `bili --version` — `0.1.214 (c26e001b6)`.
- `bili codex --help` failed before launch: `ENOENT: no such file or directory, mkdir '/Users/llenn/.codex-bili-s1-bili-s1/.bili-launch.lock'`. No session files or global configurations were altered.

Never include account tokens or private chat contents in logs or fixtures. The account authorized small test prompts in the prior verification; prompts can consume usage. Avoid retrying a timed-out write until checking the chat list.

## Input visibility preflight

`ask` checks the page's `document.visibilityState` before opening a conversation or changing submission controls, matching the visibility condition used by the installed OpenCLI native-input guard. If it is not `visible` or cannot be read, the command fails before submitting. This is a point-in-time visibility check, not a guarantee that the window is unobscured or remains visible; OpenCLI can still reject native input later. Select the Qwen tab and restore its window before running `ask`.

Live check: signed-in status succeeded. A separate foreground Qwen page reported `visible` and had a textarea. `models` returned Qwen3.7-Plus, Qwen4-Max (selected), and Qwen3.8-Max. The first `ask --model Qwen4-Max --window foreground` failed the preflight with `Qwen browser page is not visible or its visibility could not be checked; prompt was not submitted`. No prompt retry or continuation was attempted. Visibility of the separate page does not establish visibility of the adapter's page.

## Phase 2 baseline and read-only investigation (2026-11-18)

- Branch `main`, HEAD and fetched `origin/main` both `18466383dd3e0c03e83eaf18fb624f627eb6317f`; unrelated worktree changes were preserved.
- Before Phase 2 edits, `node --test tests/*.test.js` passed 28 tests, superseding the earlier counts above.
- Signed-in status succeeded. The existing controlled test conversation had `done: true` and empty top-level assistant `content`, but a finished `answer` component contained the expected answer displayed in the UI. This establishes a parser defect for that conversation; historical high-demand notices do not establish the cause of every empty response.
- The free-account model menu exposed labels and selected state. A manual model change and restoration left the visible Auto thinking mode unchanged; this does not establish successful model execution. No prompts were submitted for this investigation.
- After implementation, `node --test tests/*.test.js` passed 37 tests; `opencli adapter check qwen-studio/ask` and `opencli adapter check qwen-studio/models` passed without warnings; `git diff --check` passed. The live `models` command matched the three visible labels and selection state. One attempted `ask --model` stopped before dispatch with `Native input requires a visible browser page; input was not dispatched.` No prompt was submitted.
