# Coverage

Scope covers basic commands plus low-risk read access to Qwen's projects, folders, library, and paged chats. It also covers chat detail, prompt submission, code extraction/save, thinking `auto|thinking|fast`, modes `web_dev|web_search|deep_research`, and file attachment.

| Capability | State | Evidence / boundary |
|---|---|---|
| Session status | Implemented; live verified | `/api/v2/users/status`, bearer token held in page context. |
| Recent chats | Implemented; live verified | `/api/v2/chats/?page=1&exclude_project=true`; one live result contained 10 items. |
| Chat pagination | Implemented; live verified | `--page 2` used the observed `page` query parameter and returned an empty page. |
| Projects and folders | Implemented; live verified | Observed GET endpoints returned empty arrays for this account. |
| Library | Implemented; live verified | Observed `type=all` endpoint returned items; type-specific query mappings are not implemented. |
| Chat detail | Implemented; live smoke verified | Observed `/api/v2/chats/{id}?direction=up&limit=10`; test conversation showed user and assistant records. |
| Ask | Implemented; failure path live verified; successful response unavailable | Authorized test prompts created conversations, but Qwen completed them with empty assistant text during high demand. Adapter now returns an explicit error instead of success or a misleading timeout. |
| Thinking and three requested modes | UI paths exercised; successful mode behavior unverified | Auto, Web search, Web Dev, Deep Research, and fast were selected/submitted; Qwen returned empty completed responses, so mode effect is not verified. |
| Attachment | Implemented; blocked by browser permission | Site exposes `#filesUpload`, but both adapter and direct OpenCLI upload returned Chrome `{"code":-32000,"message":"Not allowed"}` before file submission. |
| Code extraction/save | Implemented; unit-tested | Parses fenced blocks from supplied text; refuses overwrite. |
| Other visible Qwen features | Out of scope | Models, image/video generation, Agent Mode, tools, settings, publishing, sharing, archive/delete/import/export and voice are not adapter commands. |

The command registry and a live status request were verified from `/private/tmp`, outside the plugin directory. Chrome must still be connected and signed in; `--window background` keeps automation out of the foreground.

Visible controls are not treated as proof that a function works. Browser fallback/manual use is outside adapter command coverage.
