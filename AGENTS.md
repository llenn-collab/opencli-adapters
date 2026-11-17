# Project agent instructions

## Qwen Studio adapter

- This workspace implements the independent `qwen-studio` OpenCLI plugin for `chat.qwen.ai`; do not confuse it with Qianwen's existing site adapter.
- Preserve the authenticated browser session. Never read, print, or store the Qwen token outside the page context.
- Prompt submission and uploads can consume account usage. The user authorized small test prompts; avoid unnecessary retries and inspect the conversation after a timeout.
- Treat undocumented Qwen endpoints and UI labels as observed implementation details that may change. Do not claim unverified behavior.
- Keep unsupported UI features out of adapter coverage documentation.

## Delegation

- Use the project `builder` agent for clearly specified implementation work. It uses `gpt-6-luna` and should keep changes within the requested scope.
- Consult the project `advisor` agent, using `gpt-6.1-sol`, when requirements or technical choices are uncertain, when risk is high, or after one evidence-guided builder repair fails. The advisor gives read-only analysis and recommendations; it does not implement changes.
- The primary agent coordinates the task, decides whether delegation is useful, reviews delegated results, and owns the final verification. Do not run repeated builder/advisor correction loops.
- Both agents inherit the parent session's permissions and tools. Agent instructions do not grant separate filesystem or approval permissions.
