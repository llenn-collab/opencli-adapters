# Verification — deepseek-chat

Current results are from 2026-11-18 on this machine with the connected OpenCLI Chrome profile (signed in to DeepSeek). Historical results are labeled.

## Current results (2026-11-18, final)

### Automated checks

| Check | Result |
| --- | --- |
| `node --test deepseek/tests/*.test.js` | 84 pass, 0 fail |
| `node --test qwen/tests/*.test.js` (moved plugin, unchanged) | 58 pass, 0 fail |
| `opencli adapter check deepseek-chat` | 8 commands, 0 errors, 0 warnings |
| `opencli adapter check qwen-studio` (after move to `qwen/`) | 9 commands, 0 errors, 0 warnings |
| `git diff --check` | clean |

### Live acceptance (connected Chrome profile, DeepSeek signed in)

| # | Criterion (goal.md) | Result |
| --- | --- | --- |
| 1 | OpenCLI integration | Passed — adapter check clean (8 commands, 0 errors, 0 warnings) |
| 2 | Authentication detection | Passed — `status` → `{"logged_in":true,"site":"chat.deepseek.com"}`; anonymous code 40002 path unit-verified |
| 3 | Conversation listing | Passed — `chats` listed 10 live conversations with usable UUIDs and titles |
| 4 | Read conversation messages | Passed — `chat-detail` on `b90dda95-…` and `07d259e6-…` returned user/assistant rows in order |
| 5 | Compact JSON response format | Passed — successful `ask` returned exactly `answer` and `conversation_id` |
| 6 | Model discovery and selection | **Blocked** — no model picker is rendered in the current DeepSeek UI build (see evidence below) |
| 7 | New text conversation | Passed — `ask "Reply exactly: hello"` → `{"answer":"hello","conversation_id":"b90dda95-57d2-4f45-a805-5574a0fa3f22"}` |
| 8 | Multi-turn conversation | Passed — `ask --conversation-id b90dda95-… "What did I just ask you?"` stayed in the same conversation and answered "You asked me to reply exactly \"hello.\"" |
| 9 | Feature controls | Passed — earlier same-day runs: `--think` produced an assistant record containing "Thought for 1 second" plus reasoning (conversation `07d259e6-…`); `--search` produced a sourced web answer (conversation `6a5a11a4-…`); `--search` with `--model expert\|vision` rejected before submission (unit-verified). Final acceptance: DeepThink ON: `ask "Reply exactly: think-on" --think` → `{"answer":"think-on","conversation_id":"0a70db9d-8416-4cce-9dd8-af9f29b1343e"}`; continuation with `--conversation-id 0a70db9d-… --think` recalled "You asked me to reply exactly \"think-on.\"" in the same conversation, and `chat-detail` shows "Thought for 1 second" reasoning records for both think turns. DeepThink OFF: `ask "Reply exactly: think-off" --conversation-id 0a70db9d-…` (no `--think`) verified deselection and the exact answer without a thinking record; this run also exercised Smart Search's disable direction (defaults off, verified deselection). Smart Search ON: `ask "Search the web for the current weather in Tokyo …" --search` → sourced answer ("According to tenki.jp, Tokyo is sunny today (November 18, 2026)…", conversation `eabaf893-8150-4f64-9920-9807e0554204`). The toggle's post-click state is verified by the adapter in both directions (fail-closed). |
| 10 | Attachment | Passed — `ask "Reply with only the exact marker line found in the attached file." --attachment tests/fixtures/upload-test.txt` → `{"answer":"DEEPSEEK-UPLOAD-MARKER-2026-11-18","conversation_id":"9ebc3007-08b1-4075-89d9-bb170a262903"}`; the marker exists only in the file, and the record shows the "upload-test.txt / TXT 125B" attachment chip. Upload path observed: `setFileInput` primary with the in-page File/DataTransfer React-onChange fallback (from OpenCLI's built-in deepseek adapter evidence). A Chrome-bridge denial falls back to the in-page React path or fails closed with "prompt was not submitted". |
| 11 | Fresh chat (`new`) | Passed — `new` → `{"status":"new chat started"}`, verified root route + zero rendered conversation messages |
| 12 | Verified chat deletion (`chat-delete`) | Passed — `chat-delete c2bbe511-8699-459f-af99-f7847e9a333a` (task-created throwaway) → `{"deleted":true,…}`; sidebar cross-check confirmed the target gone and all other conversations (task-created and pre-existing) preserved. Earlier task-created throwaway `4fb5426e-…` was also deleted during testing; nothing outside the task ledger was deleted. |

Total prompts sent to DeepSeek on 2026-11-18: 9 small test prompts (4 earlier: hello; recall; pong; Node.js LTS search — plus 5 in the final acceptance: think-on, its continuation, think-off, Tokyo weather search, attachment marker), each exactly once, no retries.

The DeepThink continuation's live thinking phase was ~4s — a short live thinking phase. Prolonged-thinking waiting is covered by unit tests (stability gate across thinking, pause-before-answer keeps polling), not proven live for minutes-long thinking.

### Criterion 6 blocker evidence (model picker)

Read-only DOM probes on the signed-in session (2026-11-18): `document.querySelectorAll("[role=radio]")` is empty on both the new-chat page and inside a conversation; the composer tree contains only the textarea and the `.ds-toggle-button` toggles (visible labels "Deep thinking", "Smart Search"). OpenCLI's built-in `deepseek` adapter targets `div[role="radio"]` for models `instant|expert|vision`; the current UI build renders no such picker and no model trigger. The adapter therefore fails closed: `models` reports the selector is not rendered, and `ask --model` refuses before any submission. If DeepSeek re-exposes a picker, the radio path is unit-tested and will work unchanged.

### Other verified observations (DOM probes + screenshots)

- Composer selector `textarea[placeholder*="DeepSeek"]` matches ("Message DeepSeek").
- Role heuristic holds: user bubbles carry 3+ classes on `.ds-message`, assistant bubbles 2; think content renders under `[class*="think"]` (`ds-think-content`) with the observed "Thought for N seconds" header; answer markdown is `.ds-markdown`.
- Sidebar links `a[href*="/a/chat/s/"]` render 9–10 conversations, grouped by time ("7 Days", "30 days") in this build; the pinned-section header pattern (`置顶`/`Pinned`) did not appear in this account's sidebar.
- `ask` requires the DeepSeek tab to be visible and selected in its window (page `visibilityState`); a background/minimized window fails closed with "prompt was not submitted" before any UI change (observed twice; zero submissions).

### Defects found and fixed during live acceptance (same day, recorded as history)

- Prompt matching was exact-equality and missed user bubbles carrying attachment chip text (bubble text `"upload-test.txt\nTXT 125B\n<prompt>"`), causing a false timeout; fixed to substring matching (observed built-in behavior).
- The conversation menu item class is `ds-dropdown-menu-option__label` (not "menu-item"); selector fixed.
- `chat-delete` confirm click was unverified: added bounded dialog waits, exactly-one-dialog/control guards, post-click dialog-close verification (the single destructive click is never repeated), and a longer disappearance window.

### Known limitations / artifacts

- `--include-messages` and `ask` answers strip the thinking section to its DOM-split answer; the full thinking record is visible via `chat-detail`.
- With `--search`, citation reference markers can trail the extracted answer text (observed: `-\n1\n-\n3` after the sentence). The answer text itself is complete. Extraction of citation markers is not cleaned up; upgrade when a stable marker structure is observed.
- One leftover scratch window (`window id 1912545159`, idle extension tab) from DOM probing could not be closed while OpenCLI session leases held it; it carries no page state and can be closed manually.

## Historical results

No prior-day results for this plugin; it was created 2026-11-18. Defects found and fixed during the same day's live acceptance are recorded above as history. The `qwen-studio` plugin's history lives in `qwen/docs/verification.md` and is unaffected by the workspace restructure (its suites and `adapter check` were re-run green from `qwen/`).
