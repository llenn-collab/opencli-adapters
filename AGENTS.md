# Project agent instructions

This workspace holds two independent OpenCLI plugins in sibling folders: `qwen/` (`qwen-studio` for `chat.qwen.ai`) and `deepseek/` (`deepseek-chat` for `chat.deepseek.com`). Each folder is a self-contained installable plugin (own manifest, sources, tests, docs). Workspace-level files (this file, `skills-lock.json`) stay at the root.

## Qwen Studio adapter (`qwen/`)

- The `qwen-studio` plugin is independent for `chat.qwen.ai`; do not confuse it with Qianwen's existing site adapter.
- Preserve the authenticated browser session. Never read, print, or store the Qwen token outside the page context.
- Prompt submission and uploads can consume account usage. The user authorized small test prompts; avoid unnecessary retries and inspect the conversation after a timeout.
- Treat undocumented Qwen endpoints and UI labels as observed implementation details that may change. Do not claim unverified behavior.
- Keep unsupported UI features out of adapter coverage documentation.

## DeepSeek Chat adapter (`deepseek/`)

- The `deepseek-chat` plugin is independent for `chat.deepseek.com`; do not confuse it with OpenCLI's built-in `deepseek` site adapter (which is the observed-evidence reference, not shared code).
- Preserve the authenticated browser session. Never read, print, or store the DeepSeek `userToken` outside the page context.
- Prompt submission can consume account usage. The user authorized small test prompts on the same terms as Qwen; avoid unnecessary retries and inspect the conversation after a timeout.
- Treat undocumented DeepSeek endpoints and UI labels as observed implementation details that may change (e.g. the model picker targeted by `div[role="radio"]` is absent in the 2026-11-18 UI build). Do not claim unverified behavior; classify unavailable features accurately in coverage docs.
- Keep unsupported UI features out of adapter coverage documentation.

## Delegation

- For each non-trivial task, first use the project `planner` agent to inspect the request and repository and produce a complete, ordered plan, including affected files and callers, checks, dependencies, and material risks. For trivial tasks, the primary agent may proceed directly.
- The planner decides whether to assign the whole implementation to one builder or split independent work among builders and workers. Identify each assignment's scope, file ownership, dependencies, and whether it can run in parallel. Workers handle trivial, clearly specified tasks that require no design decisions. The planner may delegate such tasks to one or more workers during planning.
- After planning, the primary agent coordinates execution and may implement work itself. Builders may delegate trivial, clearly specified work to one or more workers. Tell concurrent agents they share the workspace and must preserve each other's changes. Keep changes within scope; return to the planner if findings materially change the approach.
- The primary agent or builder reviews and verifies the completed work, including worker changes, and resolves integration issues.
- Use relevant inherited skills when they apply. The planner may use skills to shape its plan. Keep plugin and app access disabled by default; the primary agent should provide needed external context, or enable a specific integration only when the task requires it.
- Consult the read-only `advisor` for uncertain technical decisions or a major functional, security, integration, or regression failure. Provide concrete source, diff, or error evidence and ask for a concise, actionable recommendation. The primary agent or builder evaluates and applies the recommendation, then verifies the repair.
- Escalate to the read-only `error_advisor` only if the advisor cannot identify a safe correction from the evidence, or one evidence-based repair guided by the advisor fails to resolve the major error. Include the exact failure evidence and prior repair result.
- The primary agent, builder, or an assigned worker may apply fixes within its scope. Advisors provide recommendations only; they must not implement. Do not run repeated advisor escalation loops.
- Agents inherit the parent session's permissions and tools. Agent instructions do not grant separate read-only permissions or a sandbox.

# Agent Desktop

- Use `agent-desktop` to see and operate desktop apps. Before the first use, run `agent-desktop skills get desktop` and `agent-desktop skills get platform`, and follow them.