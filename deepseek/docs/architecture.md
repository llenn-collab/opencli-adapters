# Architecture — deepseek-chat

Independent OpenCLI plugin for `https://chat.deepseek.com/`, structured like the `qwen-studio` plugin. It does not share code with OpenCLI's built-in `deepseek` site adapter; the built-in adapter is only the observed-evidence reference for DeepSeek behavior.

## Modules

- `deepseek-api.mjs` — page-context `fetch` for `/api/v0/` paths with the observed `userToken` bearer credential (JSON `{value}` or raw string). Restricts paths, reuses the signed-in DeepSeek tab, initializes `about:blank` once.
- `response.mjs` — pure parsers for observed payloads: login status code envelope (0 / 40002), sidebar conversation rows, visible message rows.
- `message-content.mjs` — pure turn logic: `messageContent` (DOM answer over bubble text; a bubble with a thinking section returns only the DOM-split answer, never the thinking text), `parseCompletedMessages` (user-bubble matching is substring-based — user bubbles can carry attachment chip text ahead of the prompt — plus the stability gate), `formatAskResult` (compact `answer` + `conversation_id`), `pollForResponse` (transient retry semantics, one answer-text stability window).
- `model-ui.mjs` — observed model picker (`div[role="radio"]`, positional labels `instant`, `expert`, `vision`) and composer toggles (`.ds-toggle-button`: DeepThink, Search). `setFeature` verifies the post-click toggle state with bounded re-reads and returns `{ok, active}`; `ask` enforces BOTH the enable and disable directions before submission. Fail-closed structure checks.
- `upload.mjs` — `resolveAttachment` (regular-file check + 100 MB cap before any UI work), `uploadAttachment` (`page.setFileInput` primary, then a 4-observed-error fallback to the in-page File/DataTransfer React-onChange path), `waitForFilePreview` (8×2s), `waitForSendReady` (15×1s). CDP "Promise was collected" is tolerated on idempotent readiness reads only, never on the setFileInput or Enter send transaction.
- `status.js`, `models.js`, `chats.js`, `chat-detail.js`, `ask.js`, `code-output.js`, `new.js`, `chat-delete.js` — command registrations (`site: 'deepseek-chat'`) and page flows. `new` opens the root URL and fails closed unless the root route is showing zero rendered conversation messages. `chat-delete` targets exactly one sidebar entry (refusing duplicates), drives "…" → `Delete` → confirmation dialog → a single `Delete chat` click with bounded dialog and disappearance verification.

## ask flow

validate args (including attachment file + 100 MB cap) → tab check (reuse or initialize `about:blank`) → visibility → composer readiness (sign-in / dialogs / age verification fail closed) → open conversation (UUID route or new chat) → conversation identity check → baseline bubble texts (continuations only) → model selection (verified) → DeepThink/Search toggles verified in BOTH directions (`setFeature` returns `{ok, active}`; an unverifiable state fails closed) → optional attachment upload (preview chip + send-ready checks; failure ends with "prompt was not submitted") → single Enter submission → conversation ID capture (new chats) or identity re-check (continuations) → poll visible bubbles until the answer text is stable across three reads → compact result. Any post-submission failure reports "Submission may have occurred" with the conversation to inspect.

## Read model

Conversation lists and messages are read from the rendered DOM (sidebar links, `.ds-message` bubbles) because no chat-list/message API is confirmed for this plugin's evidence base. DeepSeek virtualizes both windows, so results are the rendered window and that limit is stated in every affected command. `status` is the only API-backed read (`/api/v0/users/current`, observed). File uploads go through the browser bridge's `setFileInput` first and the in-page React `onChange` fallback second (both paths observed in OpenCLI's built-in `deepseek` adapter evidence); a Chrome-bridge denial uses the fallback or fails closed.

## Tests

`tests/*.test.js` — pure unit tests with mocked page objects (no live browser): parser and turn-logic coverage plus ask command failure/recovery scenarios (zero submissions on pre-dispatch errors, exactly one on uncertain dispatch, recovery messages), attachment validation/upload fallback, fresh-chat verification, and chat-delete dialog/disappearance guards. 84 pass, 0 fail (2026-11-18).
