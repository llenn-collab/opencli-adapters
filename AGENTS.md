# Project agent instructions

## Qwen Studio adapter

- This workspace implements the independent `qwen-studio` OpenCLI plugin for `chat.qwen.ai`; do not confuse it with Qianwen's existing site adapter.
- Preserve the authenticated browser session. Never read, print, or store the Qwen token outside the page context.
- Prompt submission and uploads can consume account usage. The user authorized small test prompts; avoid unnecessary retries and inspect the conversation after a timeout.
- Treat undocumented Qwen endpoints and UI labels as observed implementation details that may change. Do not claim unverified behavior.
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
