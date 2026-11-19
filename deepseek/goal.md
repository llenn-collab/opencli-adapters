# Goal: Codex uses DeepSeek Chat as an external assistant

Build an OpenCLI adapter that lets Codex use the DeepSeek Chat website (`https://chat.deepseek.com/`) as an external AI assistant.

The adapter must use the user's existing, authenticated Chrome session through OpenCLI. This plugin is independent of OpenCLI's built-in `deepseek` site adapter; it is the DeepSeek counterpart of the `qwen-studio` plugin and follows the same working plan.

## Workflow: Codex with DeepSeek Chat

1. The user gives a task to Codex.
2. Codex makes a request for DeepSeek.
3. Codex sends the request to the adapter (OpenCLI for DeepSeek Chat).
4. The adapter uses the connected Chrome session.
5. The adapter connects to the authenticated DeepSeek Chat.
6. DeepSeek processes the request.
7. The adapter gets the completed response.
8. The adapter makes a compact, structured result.
9. Codex uses the result.
10. Codex asks: "Does Codex need more assistance?"

## Flow Summary

User → Codex → Adapter → Chrome session → DeepSeek Chat → DeepSeek → Adapter → Result → Codex → Decision (loop to step 3, or end)

The final goal is not simply to send messages to DeepSeek.

## Purpose

This workflow shows how Codex gets assistance from DeepSeek Chat: for example, sending a code review to DeepSeek, obtaining a response, asking follow-up questions in the same conversation, and using the results without manual copying.

## Expected adapter behavior — Operating manual

- `status` reports only whether the current DeepSeek session is authenticated, using the observed `userToken` credential and `/api/v0/users/current` envelope (code 0 signed in, code 40002 anonymous).
- `models` lists the observed model labels (`instant`, `expert`, `vision`) with selection and disabled state, checked against the live picker before submission.
- `chats` lists conversations from the sidebar; `chat-detail` reads a conversation's visible messages. Both reflect DeepSeek's virtualized windows and state that limit explicitly.
- `ask` starts or continues one conversation per invocation. It validates all arguments before any UI change, checks page visibility and composer readiness (sign-in, blocking dialogs, age verification) before submission, submits exactly once, waits until the assistant answer is stable, and returns compact JSON with only `answer` and `conversation_id` (plus `messages` with `--include-messages`).
- `ask` supports `--model`, `--think` (DeepThink), `--search` (instant model only), `--conversation-id`, `--attachment` (local file, 100 MB cap, uploaded before submission and failing closed with "prompt was not submitted" if the upload does not complete), `--include-messages`, and `--timeout`.
- DeepThink and Smart Search toggles are verified in both directions (enable and disable) after the click, before submission; a toggle whose post-click state cannot be confirmed fails closed.
- `new` starts a fresh chat from the root URL and fails closed ("new chat was not started") unless the root route is open with zero rendered conversation messages.
- `chat-delete <uuid>` deletes exactly one conversation through the sidebar item's "…" menu → `Delete` → confirmation dialog → a single "Delete chat" click (never repeated), and fails closed unless the target disappears from the sidebar; duplicate sidebar entries for the same conversation are refused.
- Errors never suggest a blind retry after uncertain dispatch: they name the conversation to inspect first (`deepseek-chat chat-detail` or `deepseek-chat chats`).
- `code-output` extracts fenced code blocks from supplied response text and can save one block to a new file without overwriting.
- The adapter never reads, prints, or stores DeepSeek credentials outside the page context.

## Acceptance tests

1. OpenCLI integration: `opencli adapter check deepseek-chat` reports all commands with zero errors and zero warnings.
2. Authentication detection: `deepseek-chat status` reports `logged_in` correctly for an authenticated session and for an anonymous one.
3. Conversation listing: `deepseek-chat chats` lists observed conversations with IDs usable by `chat-detail`.
4. Read conversation messages: `deepseek-chat chat-detail <uuid>` returns visible user and assistant messages in order.
5. Compact JSON response format: a successful `ask` returns exactly `answer` and `conversation_id` by default.
6. Model discovery and selection: `deepseek-chat models` lists live labels; `ask --model <label>` verifies selection before submission.
7. New text conversation and response extraction: `ask` in a new conversation returns a nonempty answer and the conversation ID of the opened chat.
8. Multi-turn conversation: `ask --conversation-id <id>` continues the conversation and returns the follow-up answer from the same thread.
9. Feature controls: `--think` and `--search` produce responses with observable DeepThink/search behavior, with the toggle's post-click state verified in both directions; `--search` with `--model expert|vision` is rejected before submission.
10. Attachment: `ask --attachment <local-file>` uploads the file before submission (observed chip on the composer) and the answer reflects the file's content; a failed upload ends with "prompt was not submitted" and zero submission.
11. Fresh chat: `deepseek-chat new` reports `new chat started` only when the root route opens with zero rendered conversation messages; otherwise it fails closed with "new chat was not started".
12. Verified chat deletion: `deepseek-chat chat-delete <uuid>` deletes exactly the targeted conversation, confirmed by its disappearance from the sidebar with all other conversations preserved; the destructive confirmation click happens once.

No criterion is claimed passed without evidence recorded in `docs/verification.md`. If an external dependency (browser bridge, account state, service availability) prevents a test, the exact blocker is recorded and the criterion stays unresolved. The all-pass gate is evidence of the tested configurations, not a guarantee of future service availability.
