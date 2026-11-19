# Commands

| Command | Access | Behavior |
|---|---|---|
| `qwen-studio models` | Read | Lists model labels and selection state from the authenticated account's model menu. |
| `qwen-studio status` | Read | Reports whether Qwen's observed status endpoint says the session is logged in. |
| `qwen-studio chats` | Read | Lists a page of chats, excluding project chats; `--page` is one-based and defaults to 1. |
| `qwen-studio projects` | Read | Lists projects from the observed projects endpoint. |
| `qwen-studio folders` | Read | Lists folders outside projects. |
| `qwen-studio library` | Read | Lists all items from the observed library endpoint. |
| `qwen-studio chat-detail <id>` | Read | Reads messages from one conversation (`direction=up&limit=10`). |
| `qwen-studio ask <prompt>` | Write | Starts a new conversation by default; pass `--conversation-id <id>` to continue an existing conversation through Qwen's UI. Returns `{ answer, conversation_id }` by default; `--include-messages` also includes the messages from Qwen's current 10-message read window, which may not be the full conversation history. Optionally selects an exact available label with `--model`; selection is checked before submission. Also supports `--thinking auto|thinking|fast`, optional `--mode web_dev|web_search|deep_research`, `--attachment <path>`, and integer `--timeout` seconds (10–3600; default 1800). |
| `qwen-studio code-output <text>` | Local write | Extracts fenced code from the supplied text; `--output <path>` saves selected `--index` (one-based) with no-overwrite semantics. |

The chat response is read from the observed chat detail API. A successful `ask` requires `done === true`, a nonempty assistant content string or a finished answer component, and no visible generating indicator. Empty completed messages raise an error. The adapter never automatically retries prompt submission; transient failures during read-only polling are retried only within the requested timeout. After an uncertain submission it reports a known conversation ID and advises reading it before retrying, or advises inspecting chats if no ID is known. A blank browser lease navigates to Qwen before the visibility check; unrelated pages are not navigated away from. Optional fetched messages resolve finished answer components, and may not be complete history.

OpenCLI defaults to JSON output (`--format json`) and supports table, plain, YAML, Markdown, and CSV. Use `opencli qwen-studio --help -f json` for machine-readable command metadata. See [agent integration](agent-integration.md) for shell examples and output limitations.
