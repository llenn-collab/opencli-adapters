# Agent integration — deepseek-chat

For Codex and shell automation, OpenCLI already provides JSON output and a nonzero process exit on command failure. This guide covers the adapter-specific pieces.

## Pooling

Use one connected profile and serialize DeepSeek operations:

```sh
OPENCLI_SITE_SLOTS=deepseek-chat:1 opencli deepseek-chat ask "…" --window foreground
```

`ask` requires the DeepSeek tab visible and selected (page `visibilityState`); run it with `--window foreground` and the DeepSeek tab active in its window. Read commands (`status`, `models`, `chats`, `chat-detail`) accept `--window background`. Direct CDP and ephemeral browser sessions are outside this pool and must not drive DeepSeek commands.

## Task-scoped conversation IDs

`ask` returns `conversation_id`. Keep it for the task; pass it back with `--conversation-id` for follow-ups. Conversation listings and message reads use `chats` and `chat-detail`. Start scratch threads with `new` (no args; fails closed unless the root route opens with no rendered messages) and remove task-created throwaways with `chat-delete <uuid>` (single verified deletion; inspect `chats` first if unsure of the ID). Rename, chat search, login/logout, and export are not adapter commands.

## Attachments

Pass `--attachment <local-file>` to `ask` to upload a regular file (100 MB cap) before submission. The upload uses the browser bridge's `setFileInput` first, with an in-page File/DataTransfer React-`onChange` fallback; if neither path completes, the command fails closed with "prompt was not submitted" (zero submission).

## Result contract

Default `ask` JSON data is exactly `answer` and `conversation_id`. Add `--include-messages` for the visible turn rows. After any post-submission error, read the named conversation before retrying: the error text tells you whether to use `deepseek-chat chat-detail <id>` or `deepseek-chat chats`.

## Failure classes

- Pre-submission failures (validation, visibility, readiness, sign-in, dialogs, attachment upload) guarantee zero submissions; they end with "prompt was not submitted".
- Post-submission failures say "Submission may have occurred" and name the conversation to inspect. Never blind-retry: inspect first (the assistant may have answered despite a timeout).
- `new` fails closed with "new chat was not started" when the root route does not open with zero rendered conversation messages.
- `chat-delete` fails closed (never repeats the destructive click) when the dialog does not behave as observed or the target does not disappear from the sidebar; inspect `chats` before any retry.
- Account limits and service load can produce empty responses; the adapter reports "completed the request without a response" instead of guessing.

## Code extraction

Feed assistant text to `deepseek-chat code-output` and save blocks with `--output <new-path>` (never overwrites).
