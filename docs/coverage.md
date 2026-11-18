# Coverage

Coverage labels reflect evidence, not only the presence of a command. Historical live results remain useful evidence, but current session checks can still be blocked by the browser bridge.

| Capability | State | Evidence / boundary |
|---|---|---|
| Session status | VERIFIED live (2026-11-18) | Host-access `opencli qwen-studio status` returned `logged_in: true`; OpenCLI profile `qsfrjtn8` had extension 1.0.27 connected. Sandbox-only commands could not reach the host-local bridge. |
| Recent chats and pagination | VERIFIED historically; current browser request observed | Observed `/api/v2/chats/?page=N&exclude_project=true`; agent-browser recorded the page-1 request with HTTP 200. |
| Projects and folders | VERIFIED (historical live check); current check BLOCKED | Observed GET endpoints returned empty arrays for the account during previous checks. |
| Library | VERIFIED (historical live check); current check BLOCKED | Observed `type=all` endpoint returned items; type-specific query mappings are not implemented. Signed media URL key parameters are redacted. |
| Chat detail | VERIFIED live (2026-11-18) | `chat-detail` read conversation `7e1b2505-122a-411b-aa7e-862d2372308a`: it contained the submitted user message and an empty assistant message. |
| Ask completion/parser | IMPLEMENTED — LIVE GENERATION UNVERIFIED | Requires `done === true`, nonempty top-level content or finished answer component, no visible generating indicator, and valid message rows. A prior test conversation had an empty top-level content field but a finished answer component matching the UI; earlier adapter parsing incorrectly reported no response. |
| Ask timeout and polling errors | IMPLEMENTED — UNIT TESTED | Integer timeout validation is 10–3600 seconds. Read polling retries network errors and HTTP 429/5xx within the same deadline; the remaining timeout is passed to the browser fetch. Prompt submission is never retried. |
| Thinking and three requested modes | PARTIAL | Auto, Web search, Web Dev, Deep Research, and Fast were selected/submitted in historical runs; those runs returned empty responses, so actual mode execution and mode-specific content remain unverified. |
| Attachment | BLOCKED at Chrome DevTools Protocol via OpenCLI Browser Bridge | Qwen exposes `#filesUpload`. On the connected profile, `opencli browser upload` failed in `DOM.setFileInputFiles` with Chrome `{"code":-32000,"message":"Not allowed"}`. No Qwen upload request was observed. Agent-browser's selection command returned success but did not leave a queued file or issue a request, so it did not verify a workaround. Qwen did not reject an upload. |
| Code extraction/save | VERIFIED locally | Parses fenced blocks from supplied response text; refuses overwrite. Local CLI JSON output was exercised. |
| Continue existing chats | IMPLEMENTED — LIVE CONTINUATION UNVERIFIED | `ask --conversation-id <id>` navigates to the existing chat and submits through Qwen's composer, preserving Qwen's stored history. The live test account returned empty assistant content, so continuity is not yet proven. |
| Rename/search/delete/export | NOT IMPLEMENTED | No verified adapter request contract. Destructive actions are not exposed. |
| Projects/folders organization and library type filters | NOT IMPLEMENTED | Read-only list operations only; no mutation or type-specific library filters. |
| Model discovery and selection | DISCOVERY VERIFIED LIVE; SELECTION UNIT TESTED | The models command matched the authenticated UI labels and selection state. A manual UI selection and restoration preserved the visible thinking mode; automated ask selection has not been verified live. |
| Other visible Qwen features | NOT IMPLEMENTED | image/video generation, Agent Mode, tools, settings, publishing, sharing, archive/delete/import/export and voice are not adapter commands. |
| OpenCLI/Codex automation | VERIFIED LOCALLY | OpenCLI 2.0.3 discovers eight commands; `--help -f json` is structured; local `code-output` returned JSON. The existing CLI is sufficient; no wrapper/MCP layer was added. |
| Bili integration | BLOCKED in this environment | Bili 0.1.214 was installed, but `bili codex --help` could not create its session overlay lock directory. No Bili or Codex configuration was changed. |

The authenticated browser bridge was verified with host access. Sandbox-only shell commands could not reach its loopback daemon; use the host-connected OpenCLI environment for live verification. Chrome must be connected and signed in; `--window background` keeps automation out of the foreground.

Visible controls are not treated as proof that a function works. Browser fallback/manual use is outside adapter command coverage.
