# Coverage

Coverage labels reflect evidence, not only the presence of a command. Historical live results remain useful evidence, but current session checks can still be blocked by the browser bridge.

| Capability | State | Evidence / boundary |
|---|---|---|
| Session status | VERIFIED (historical live check); current check BLOCKED | `/api/v2/users/status`, bearer token held in page context. Historical status returned logged in; current background call did not return within 30 seconds. |
| Recent chats and pagination | VERIFIED (historical live check); current check BLOCKED | Observed `/api/v2/chats/?page=N&exclude_project=true`; previous live check returned results. Current background read did not return within 30 seconds. |
| Projects and folders | VERIFIED (historical live check); current check BLOCKED | Observed GET endpoints returned empty arrays for the account during previous checks. |
| Library | VERIFIED (historical live check); current check BLOCKED | Observed `type=all` endpoint returned items; type-specific query mappings are not implemented. Signed media URL key parameters are redacted. |
| Chat detail | VERIFIED (historical live smoke check); current check BLOCKED | Observed `/api/v2/chats/{id}?direction=up&limit=10`; test conversation showed user and assistant records. |
| Ask completion/parser | IMPLEMENTED — NOT LIVE VERIFIED | Requires `done === true`, nonempty assistant text, no visible generating indicator, and valid message rows. Tests cover success, incomplete, empty, and malformed responses. Historical prompts completed empty under high demand; no real nonempty answer has been verified. |
| Ask timeout and polling errors | IMPLEMENTED — NOT LIVE VERIFIED | Integer timeout validation is 10–3600 seconds. Read polling retries network errors and HTTP 429/5xx within the same deadline; auth and other errors fail immediately. Prompt submission is never retried. |
| Thinking and three requested modes | PARTIAL | Auto, Web search, Web Dev, Deep Research, and Fast were selected/submitted in historical runs; those runs returned empty responses, so actual mode execution and mode-specific content remain unverified. |
| Attachment | BLOCKED by browser permission | Site exposes `#filesUpload`, but adapter and direct OpenCLI upload returned Chrome `{"code":-32000,"message":"Not allowed"}` before submission. This is a browser runtime permission failure, not a confirmed Qwen rejection. |
| Code extraction/save | VERIFIED locally | Parses fenced blocks from supplied response text; refuses overwrite. Local CLI JSON output was exercised. |
| Continue existing chats; rename/search/delete/export | NOT IMPLEMENTED | No verified adapter request contract. Existing chat detail is read-only; ask always creates a new conversation. Destructive actions are not exposed. |
| Projects/folders organization and library type filters | NOT IMPLEMENTED | Read-only list operations only; no mutation or type-specific library filters. |
| Other visible Qwen features | NOT IMPLEMENTED | Models, image/video generation, Agent Mode, tools, settings, publishing, sharing, archive/delete/import/export and voice are not adapter commands. |
| OpenCLI/Codex automation | VERIFIED LOCALLY | OpenCLI 2.0.3 discovers eight commands; `--help -f json` is structured; local `code-output` returned JSON. The existing CLI is sufficient; no wrapper/MCP layer was added. |
| Bili integration | BLOCKED in this environment | Bili 0.1.214 was installed, but `bili codex --help` could not create its session overlay lock directory. No Bili or Codex configuration was changed. |

The command registry and historical live reads were verified from `/private/tmp`, outside the plugin directory. On this audit run, the background status and chats invocation did not return within 30 seconds. Chrome must be connected and signed in; `--window background` keeps automation out of the foreground.

Visible controls are not treated as proof that a function works. Browser fallback/manual use is outside adapter command coverage.
