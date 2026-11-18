# Verification

## Baseline before implementation

- Worktree: clean on branch `main` tracking `origin/main`.
- `node --test tests/*.test.js` — 14 passed, 0 failed.
- `opencli --version` — 2.0.3.
- `opencli adapter check qwen-studio/<command>` — all eight commands passed with zero warnings.
- GitHub issues page — 0 open issues. `gh issue list --repo llenn-collab/temp-workarounds-to-do --state all --limit 50` could not reach the API through the environment proxy.

## Current automated checks

Final checks:

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

Current audit run:

- `opencli qwen-studio status --window background` and `opencli qwen-studio chats --page 1 --window background` did not return within the 30-second command window. No new live account result is claimed, and no prompt was sent during this run.
- The latest `ask` changes are unit-tested but not live verified against the authenticated browser.

## Bili check

- `codex --version` — `codex-cli 0.169.0`.
- `bili --version` — `0.1.214 (c26e001b6)`.
- `bili codex --help` failed before launch: `ENOENT: no such file or directory, mkdir '/Users/llenn/.codex-bili-s1-bili-s1/.bili-launch.lock'`. No session files or global configurations were altered.

Never include account tokens or private chat contents in logs or fixtures. The account authorized small test prompts in the prior verification; prompts can consume usage. Avoid retrying a timed-out write until checking the chat list.
