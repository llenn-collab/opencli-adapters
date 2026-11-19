# Coverage — deepseek-chat

Explicit statement of what this adapter covers on `https://chat.deepseek.com/`, observed in the current UI. Everything not listed is not covered.

| Capability | Current state |
| --- | --- |
| OpenCLI integration | Implemented; `opencli adapter check deepseek-chat` clean (8 commands, 0 errors, 0 warnings) |
| DeepSeek authentication detection | Implemented via observed `userToken` + `/api/v0/users/current`; unit verified, live check pending (see verification) |
| Conversation listing | Implemented from the observed sidebar links; virtualized window limitation stated |
| Read conversation messages | Implemented from visible `.ds-message` bubbles; virtualized window limitation stated |
| Compact JSON response format | Implemented (`answer`, `conversation_id`) |
| Model discovery | Implemented with observed positional labels `instant`, `expert`, `vision`; **live-blocked**: the current UI build renders no model picker (see verification) |
| Model selection | Implemented with post-selection verification; fails closed before submission when no picker is rendered |
| New text conversation | Implemented (`ask` default route and the `new` command; `new` requires root route + zero rendered messages) |
| Response extraction | Implemented (thinking/answer DOM split with text fallback, stability gate; user-bubble matching is substring-based) |
| Multi-turn conversation | Implemented via `--conversation-id` |
| Thinking controls | `--think` (DeepThink toggle) implemented and live verified in both directions (enable and disable verified post-click); "Thought for N seconds" record observed |
| Web search | `--search` implemented for the instant model and live verified (sourced answers, both enable and disable directions); `--model expert\|vision` rejected up front; citation markers can trail extracted answers (see verification) |
| File uploads (`--attachment`) | Implemented and live verified for this adapter's upload paths (`setFileInput` primary, in-page React `onChange` fallback); regular files up to 100 MB; upload failure fails closed with "prompt was not submitted" |
| Fresh chat (`new`) | Implemented and live verified; fails closed unless the root route opens with zero rendered conversation messages |
| Chat deletion (`chat-delete`) | Implemented and live verified (write): single sidebar target, "…" → `Delete` → confirmation → one `Delete chat` click, verified disappearance; refuses duplicate sidebar entries |
| Error handling | Implemented; recovery messages name the conversation to inspect |

Not covered (not adapter commands): rename, chat search, login/logout, export, projects/folders/library (DeepSeek has no equivalents), usage/balance readouts, and the rest of DeepSeek's visible UI.

Observed-evidence basis: OpenCLI's built-in `deepseek` site adapter (selectors, `userToken` auth, `/api/v0/users/current` code envelope, positional model radios, DeepThink/Search toggle order, `/a/chat/s/<uuid>` routes, virtualized message windows, `setFileInput` primary with in-page React `onChange` upload fallback) and this plugin's unit tests. Undocumented endpoints and UI labels are treated as observed implementation details that may change.
