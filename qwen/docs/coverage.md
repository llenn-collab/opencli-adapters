# Coverage

Coverage labels reflect evidence, not only the presence of a command. Historical live results remain useful evidence, but current session checks can still be blocked by the browser bridge.

| Capability | State | Evidence / boundary |
|---|---|---|
| Session status | VERIFIED live (2026-11-18) | Host-access `opencli qwen-studio status` returned `logged_in: true`; OpenCLI profile `qsfrjtn8` had extension 1.0.27 connected. Sandbox-only commands could not reach the host-local bridge. |
| Recent chats and pagination | VERIFIED historically; current browser request observed | Observed `/api/v2/chats/?page=N&exclude_project=true`; agent-browser recorded the page-1 request with HTTP 200. |
| Projects and folders | VERIFIED (historical live check); current check BLOCKED | Observed GET endpoints returned empty arrays for the account during previous checks. |
| Library | VERIFIED (historical live check); current check BLOCKED | Observed `type=all` endpoint returned items; type-specific query mappings are not implemented. Signed media URL key parameters are redacted. |
| Chat detail | VERIFIED live (2026-11-18) | `chat-detail` read conversation `7e1b2505-122a-411b-aa7e-862d2372308a`: it contained the submitted user message and an empty assistant message. |
| Ask completion/parser | VERIFIED LIVE | A foreground ephemeral `ask` returned `READY` and conversation ID `a6ddaeac-377e-441b-98e1-889c303ea9a0`. Other cases still require reliability testing. |
| Ask timeout and polling errors | IMPLEMENTED — UNIT TESTED | Integer timeout validation is 10–3600 seconds. Read polling retries network errors and HTTP 429/5xx within the same deadline; the remaining timeout is passed to the browser fetch. Prompt submission is never retried. |
| Thinking and three requested modes | VERIFIED LIVE (2026-11-18) | Fast → `4`. Thinking → `Paris`. Web search → Tokyo population with citations `[[20]]`, `[[24]]`. Deep Research → clarifying questions (expected behavior). Web Dev → complete HTML with red heading. All nonempty answers with stable conversation IDs. |
| Attachment | BLOCKED at Chrome DevTools Protocol on chat.qwen.ai origin | Qwen exposes `#filesUpload`. **Local HTTP fixture** upload works: `opencli browser upload` succeeded (`uploaded: true`, `file_names: ["upload-test.txt"]`, 200 bytes, change event fired). **chat.qwen.ai** upload silently fails: bridge returns `uploaded: true` but `file_names: []` and 0 files in the input. Restriction is Qwen-origin-specific, not bridge-wide. External change needed: Chrome allow `DOM.setFileInputFiles` for chat.qwen.ai, or Qwen expose an API upload endpoint. No security bypass attempted. |
| Lifecycle edge cases | VERIFIED — UNIT TESTED (58 tests) | Tests cover: blocking dialogs, disabled/loading composer, unauthenticated state, wrong-origin fail-fast in `readConversation`, no localStorage leak on wrong origin, non-retryable origin errors, disconnection during polling with recoverable inspection message. |
| Delegation (Codex→Qwen→Codex) | VERIFIED LIVE (2026-11-18) | Qwen reviewed Python fixture with known `ZeroDivisionError`. Finding independently confirmed via `exec()`. Follow-up with conversation ID returned fix suggestion. Zero false positives. Conversation `a6114e86-2654-4710-945e-6d02a9b8a496` stable across turns. |
| Code extraction/save | VERIFIED locally | Parses fenced blocks from supplied response text; refuses overwrite. Local CLI JSON output was exercised. |
| Continue existing chats | VERIFIED LIVE | A continuation of `a6ddaeac-377e-441b-98e1-889c303ea9a0` recalled `Periwinkle` and retained the conversation ID. |
| Rename/search/delete/export | NOT IMPLEMENTED | No verified adapter request contract. Destructive actions are not exposed. |
| Projects/folders organization and library type filters | NOT IMPLEMENTED | Read-only list operations only; no mutation or type-specific library filters. |
| Model discovery and selection | VERIFIED LIVE FOR Qwen4-Max | The models command matched the authenticated UI; both turns of the live conversation recorded model metadata `qwen4-max` after selection. Other models remain unverified for generation. |
| Other visible Qwen features | NOT IMPLEMENTED | image/video generation, Agent Mode, tools, settings, publishing, sharing, archive/delete/import/export and voice are not adapter commands. |
| OpenCLI/Codex automation | VERIFIED LOCALLY | OpenCLI 2.0.3 discovers eight commands; `--help -f json` is structured; local `code-output` returned JSON. The existing CLI is sufficient; no wrapper/MCP layer was added. |
| Bili integration | BLOCKED in this environment | Bili 0.1.214 was installed, but `bili codex --help` could not create its session overlay lock directory. No Bili or Codex configuration was changed. |

The authenticated browser bridge was verified with host access. Sandbox-only shell commands could not reach its loopback daemon; use the host-connected OpenCLI environment for live verification. Chrome must be connected and signed in; `--window background` keeps automation out of the foreground.

Visible controls are not treated as proof that a function works. Browser fallback/manual use is outside adapter command coverage.
