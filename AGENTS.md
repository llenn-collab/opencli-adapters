# Project agent instructions

## Qwen Studio adapter

- This workspace implements the independent `qwen-studio` OpenCLI plugin for `chat.qwen.ai`; do not confuse it with Qianwen's existing site adapter.
- Preserve the authenticated browser session. Never read, print, or store the Qwen token outside the page context.
- Prompt submission and uploads can consume account usage. The user authorized small test prompts; avoid unnecessary retries and inspect the conversation after a timeout.
- Treat undocumented Qwen endpoints and UI labels as observed implementation details that may change. Do not claim unverified behavior.
- Keep unsupported UI features out of adapter coverage documentation.

## Delegation

- Use the project `builder` agent for implementation work; keep changes within the requested scope.
- Use the read-only `advisor` agent for uncertain technical decisions. Keep advisor responses short and actionable.
- Use `error_advisor` only for a major functional or security failure, a critical integration failure, a serious regression, or after one evidence-based repair fails to resolve a major error. Send it the exact failure evidence.
- Only the primary agent or builder may apply fixes. Advisors provide recommendations only and must not implement.
- Do not run repeated advisor escalation loops.
- Both agents inherit the parent session's permissions and tools. Agent instructions do not grant separate read-only permissions or a sandbox.
