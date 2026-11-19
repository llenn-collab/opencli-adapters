# Qwen Studio investigation handoff

Status: Basic adapter and read expansion implemented. Historical investigation notes below are preserved; current verification is summarized in the final update.

- OpenCLI 2.0.3 and agent-browser 0.43.0 are installed. The installed opencli-adapter-author skill was read.
- `opencli list search --site qwen-studio -f json` returned zero commands.
- `opencli browser open https://chat.qwen.ai/ --session qwen-research` and `opencli browser check --session qwen-research` hung and were interrupted. `opencli doctor` reported daemonRunning=false, extensionConnected=false, and `Failed to start opencli daemon`.
- GitHub's retrieved PR #1832 page describes chat-list, ask, and image, and showed it open in a cached page; current status and behavior remain unverified. https://github.com/jackwener/OpenCLI/pull/1832
- This directory is inside a Git repository rooted at /Users/llenn, not an independent repository. Do not stage or change the parent repository. Establish an independent repository within the workspace when appropriate.
- No writes to Qwen were attempted. No tokens were recorded.

Next: diagnose the OpenCLI daemon/bridge and connect the authenticated Chrome session, then use OpenCLI Browser to inspect the site and network; independently verify practical observations with agent-browser. Check current PR status from a fresh authoritative source. Record the full inventory and restrictions, then stop at the requested phase boundary. Do not infer coverage from the incomplete research.

## Resume update

The parent Git repository has been removed; this directory is currently not a Git repository. `opencli doctor` outside the sandbox reports daemon 2.0.3 and extension 1.0.27 connected, with no issues. The earlier daemon failure was sandbox-specific. Opened https://chat.qwen.ai/ in session `qwen-research`: authenticated free account, home screen shows Qwen4-Max, model and mode selectors, temporary chat, upload, voice input and voice mode. The model-selector click failed with `Native input requires a visible browser page; input was not dispatched.` Select and uncover the Chrome tab before continuing. Initial page load observed successful requests including POST `/api/v2/users/status`, GET `/api/v2/configs/setting-config`, GET `/api/v2/library/list?type=all`, GET `/api/v2/folders/?exclude_project=true`, GET `/api/v2/projects/`, and GET `/api/v2/chats/?page=1&exclude_project=true`. These observations do not establish command behavior. No write action was dispatched. Continue inspecting menus and network in the connected browser, without recording personal data or credentials.

## Focused-browser investigation

The Chrome tab became accessible. Read-only UI observations on the free account: model selector lists Qwen3.7-Plus, Qwen4-Max, Qwen3.8-Max, and after expanding, Qwen3.8-Omni-Flash, Qwen3.7-Max, Qwen3.5-Omni-Plus. Mode menu lists upload attachment (file/image/video/audio), Agent Mode, Web Dev, Create Image, Create Video, Web search, Deep Research, More (Slides, Artifacts, Learn, Travel Planner), and Tools. Account menu offers Usage, Settings, Archived Chats, upgrade, customer service and logout. Settings sections: General, Usage & Billing, Interface, Models, Chats, Personalization, Account, About. Chats offers import, export, archive all, delete all. Personalization includes memories, customization, cookies and tool controls. Library tabs: All, Image, Video, Document, Web Dev, Podcast; My Published button. Expanded sidebar offers Projects, All chats, Community, Coder, Create. A conversation menu offers Pin, Rename, Clone, Archive, Share, Select, Download, Move to Project, Delete, Report Content. These are UI observations only; functionality and restrictions have not been verified. No account or conversation writes were made.

Next: inspect remaining navigation, tool menus, dialogs, existing conversation message controls, settings sections and mode-specific forms; inspect observed request and response shapes without recording credentials. Verify with agent-browser. Phase 1 is not complete; do not calculate coverage yet.

## Latest resume

Chrome accepted native input again after reopening the Qwen page. Page-load network shape previews confirmed HTTP 200 responses for user status, settings configuration, user settings, library, folders, projects, and chat list. Chat list `data` is an array of objects with `id`, `title`, timestamps, `chat_type`, `project_id`, and `pinned`; library `data` has `items`, `has_more`, and `cursor`. No credentials or response content were saved. Investigation, independent verification, implementation, documentation, and tests remain outstanding. The existing handoff's first section is historical and superseded by its resume updates.

## Implementation and verification handoff — 2026-11-18

The user narrowed the plugin to status, recent chats, chat detail, ask, code-container copying/extraction/saving, thinking `auto|thinking|fast`, modes `web_dev|web_search|deep_research`, and file attachment. Core files are at the workspace root; required docs and tests are present. `node --test tests/*.test.js` passed 9/9. OpenCLI adapter checks passed without warnings for status, chats, chat-detail, ask, and code-output.

Authenticated read commands were live verified: status returned `logged_in: true`; chats returned 10 entries, and later 11 after the authorized test prompt created a new conversation. Chat detail returned the test conversation's user and assistant records. The test prompt yielded a Qwen high-demand error, with an empty completed assistant response; this is recorded as failed generation, not success. `ask` sends the bearer token only within page context, explicitly selects even Auto, applies attachment and requested mode sequentially, and requires `done === true`, nonempty text, and no visible generating indicator. Ask's happy path, all modes, and upload remain unverified end to end.

The workspace is not a Git repository; no parent repository was changed. Chrome was restored in existing session `qwen-research` at `https://chat.qwen.ai/`. Continue in this session; do not create another window/tab to work around a transient issue.

Next: if service allows, verify one successful small ask, then exercise each requested mode and a harmless local attachment. Refresh verification docs and handoff with observed outcomes. Do not retry writes blindly after timeouts.

## Follow-up live verification — 2026-11-18

The user asked to complete verification and fix the unresolved ask result. Found and fixed two `ask` defects: it opened/leased the wrong tab because it navigated instead of using the persistent session, and it treated `/c/new-chat` as a real conversation ID. The poller now extracts only a UUID chat ID, tolerates history not ready yet, uses the observed Bearer token in page context, and reports an empty completed answer as an explicit error. The upload menu matcher now handles descriptive secondary text; upload errors are surfaced clearly. Added tests for new-chat routing and delayed history.

Latest checks: `node --test tests/*.test.js` 11/11 pass; all five `opencli adapter check qwen-studio/*` checks pass with zero warnings; live status true; live chats count 20. Minimal prompts for Auto, Web search, Web Dev, Deep Research, and Fast+Deep Research reached a completed empty assistant result under Qwen high-demand service behavior, and the adapter surfaced `Qwen completed the request without a response; check account limits or site errors`. A prior visible Qwen response stated that the service was experiencing high demand. No successful generated answer was observed, so code extraction from a live Qwen answer cannot be demonstrated.

Attachment verification remains blocked by Chrome/OpenCLI: adapter `page.setFileInput` and direct `opencli browser upload` both fail before submission with `{"code":-32000,"message":"Not allowed"}`. The adapter now surfaces this clearly. Do not mark uploads verified or claim Qwen rejected them. Resolve only if the browser bridge grants file-input permission or a supported upload mechanism is observed. The active `qwen-research` session remains bound to the existing Qwen tab at home.

## Read-only expansion — 2026-11-18

Added `projects`, `folders`, `library` (observed `type=all` only), and validated `chats --page N`. The sources are already-observed endpoints: `/api/v2/projects/`, `/api/v2/folders/?exclude_project=true`, `/api/v2/library/list?type=all`, and `/api/v2/chats/?page=N&exclude_project=true`. Live read-only requests from `/private/tmp` succeeded: projects and folders were empty, library returned items, and page 2 of chats was empty. OpenCLI discovered all eight commands from outside the plugin directory; `qwen-studio status --window background` returned `logged_in: true`. This confirms current-machine use outside the directory, not a portable install on another machine. Library output includes signed media URLs; redact the `key` query parameter before returning items. Do not expose the captured value in logs or docs.
