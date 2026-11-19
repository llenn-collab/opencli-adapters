# Command reference — deepseek-chat

All read/write commands require the connected OpenCLI Chrome session on `https://chat.deepseek.com/`, signed in. Output is JSON in agent mode.

## status

`opencli deepseek-chat status` → `logged_in`, `site`. Uses the observed `userToken` (localStorage, JSON `{value}` or raw string) and `GET /api/v0/users/current` (code 0 = signed in, code 40002 = anonymous).

## models

`opencli deepseek-chat models` → `label`, `selected`, `disabled`. Labels are the observed positional model aliases `instant`, `expert`, `vision` (DeepSeek localizes the visible picker text, so the adapter uses the stable aliases). Fails before opening the picker when not signed in. The current UI build renders no `div[role="radio"]` picker; `models` and `ask --model` fail closed until a picker is observed (see coverage/verification).

## chats

`opencli deepseek-chat chats` → `id`, `title`, `pinned`. Lists sidebar conversation links (`a[href*="/a/chat/s/"]`); pinned items are detected from the observed section header (`置顶` / `Pinned`). The sidebar is virtualized: the result is the currently rendered window. No pagination argument (the rendered window is the observed source).

## chat-detail

`opencli deepseek-chat chat-detail <uuid>` → `role`, `content` rows. Navigates to `https://chat.deepseek.com/a/chat/s/<uuid>` and reads the visible `.ds-message` bubbles in DOM order. The message list is virtualized: the result is the rendered window. The ID must be a DeepSeek conversation UUID; validation happens before navigation.

## ask

`opencli deepseek-chat ask "<prompt>" [--model instant|expert|vision] [--think] [--search] [--conversation-id <uuid>] [--attachment <local-file>] [--include-messages] [--timeout N]`

Starts a new conversation by default (DeepSeek's new-chat route). `--conversation-id` continues an existing conversation. Result fields: `answer`, `conversation_id` (plus `messages` with `--include-messages`).

- Arguments are validated before any UI change: model must be one of the observed labels; `--search` is rejected with `--model expert|vision` (observed constraint); `--conversation-id` must be a UUID; `--timeout` is an integer 10–3600 (default 1800); `--attachment` must be a regular file of at most 100 MB (checked before any UI work).
- `--attachment` uploads the file before submission: `page.setFileInput` is primary, with an in-page File/DataTransfer React-`onChange` fallback when the bridge denies it (observed evidence from OpenCLI's built-in `deepseek` adapter). The file preview chip and an enabled send button must appear before submission; a failed upload ends with "prompt was not submitted".
- Page visibility and composer readiness are checked before submission; sign-in, blocking dialogs and age verification fail closed with "prompt was not submitted".
- `--think` and `--search` toggles are verified in both directions (enable and disable) after the click, before submission; an unverifiable toggle state fails closed.
- Submission is exactly one Enter press on the composer (`textarea[placeholder*="DeepSeek"]`).
- The response is accepted only after the assistant answer text is stable across three consecutive polls and nonempty.
- On any post-submission failure the error names the conversation to inspect first; it never suggests a blind retry.
- Continuing requires the opened conversation to match `--conversation-id`; a changed conversation is reported with the original ID for recovery.

## new

`opencli deepseek-chat new` → `{"status":"new chat started"}` (no arguments). Navigates to the root URL to start a fresh chat and verifies the root route is open with zero rendered conversation messages; otherwise it fails closed with "new chat was not started". No prompt is submitted.

## chat-delete

`opencli deepseek-chat chat-delete <uuid>` → `{"deleted":true,…}`. A write command: targets exactly one sidebar conversation entry (refuses duplicate sidebar entries for the same ID), opens that item's "…" menu, clicks `Delete`, then clicks `Delete chat` once in the confirmation dialog — the destructive click is never repeated. Bounded waits verify the dialog appears and closes after the click; the target must disappear from the sidebar (longer disappearance window) or the command fails closed. Other conversations are not touched.

## code-output

`opencli deepseek-chat code-output '<text>' [--index N] [--output <new-path>]` → `language`, `code` blocks (or `saved`, `language` with `--output`). Extracts fenced code blocks from supplied assistant text. `--output` never overwrites an existing file.
