# Qwen Conversation Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `qwen-studio ask` continue an existing Qwen conversation by ID and return its ID with the actual messages.

**Architecture:** Keep prompt submission in Qwen's authenticated UI and use Qwen's existing conversation history. Reuse `ask` with optional `conversation_id`; preserve `chats` and `chat-detail` for listing and reading.

**Tech Stack:** Node.js ES modules, OpenCLI 2.0.3, built-in `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-18-qwen-conversations-design.md`

## Global Constraints

- Preserve authentication in page context; never read or print the token.
- Prompt submission happens once; inspect the conversation before any retry after an uncertain outcome.
- A response is successful only when Qwen marks the assistant message complete and its content is nonempty.
- Do not use undocumented direct write endpoints or inject previous messages.

## Review Focus

- Invalid conversation IDs must fail before browser navigation; test the accepted UUID and malformed ID.
- New-chat behavior must remain the default; test args with and without `conversation_id`.
- Empty completed assistant output remains an error; retain the existing parser test.
- Polling must pass the remaining deadline to the browser fetch; test that the page evaluation receives the same timeout.
- Live Qwen failures must not be reported as successful continuation; document live status separately from unit results.

---

### Task 1: Continue Qwen chats through `ask`

**Files:**
- Modify: `ask.js`
- Test: `tests/ask.test.js`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/agent-integration.md`
- Modify: `docs/commands.md`
- Modify: `docs/coverage.md`
- Modify: `docs/verification.md`
- Modify: `docs/audit.md`

**Interfaces:**
- `validateAskArgs(args)` returns the validated prompt options and optional `conversationId`.
- `readConversation(page, id, timeoutMs)` calls `page.evaluate` with both `id` and the remaining `timeoutMs`.
- `ask` returns `{ conversation_id, messages }` after Qwen completes a nonempty answer.

- [x] **Step 1: Add failing tests** for optional UUID validation, rejection of malformed conversation IDs, and passing `timeoutMs` through `readConversation`; retain tests for empty and malformed responses.
- [x] **Step 2: Run `node --test tests/ask.test.js`** and confirm the new tests fail for missing continuation support and timeout propagation.
- [x] **Step 3: Implement the minimum UI flow** in `ask.js`: without an ID, keep clicking New Chat; with an ID, navigate to `https://chat.qwen.ai/c/<id>` before using the same composer; pass the remaining timeout into the page fetch; return the conversation ID with messages.
- [x] **Step 4: Run `node --test tests/ask.test.js`**, then `node --test tests/*.test.js`; require all tests to pass.
- [x] **Step 5: Update affected current docs** (`README.md`, architecture, agent integration, command reference, coverage, verification, and audit) for the new ID option/output; distinguish local/unit behavior from live continuation, which remains unverified while Qwen returns empty assistant content. Keep historical handoff notes intact.
- [x] **Step 6: Inspect `git diff --check` and the final diff.** Do not send another prompt unless the already-created conversation first shows a usable assistant response.
