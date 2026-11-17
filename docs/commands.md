# Commands

| Command | Access | Behavior |
|---|---|---|
| `qwen-studio status` | Read | Reports whether Qwen's observed status endpoint says the session is logged in. |
| `qwen-studio chats` | Read | Lists a page of chats, excluding project chats; `--page` is one-based and defaults to 1. |
| `qwen-studio projects` | Read | Lists projects from the observed projects endpoint. |
| `qwen-studio folders` | Read | Lists folders outside projects. |
| `qwen-studio library` | Read | Lists all items from the observed library endpoint. |
| `qwen-studio chat-detail <id>` | Read | Reads messages from one conversation (`direction=up&limit=10`). |
| `qwen-studio ask <prompt>` | Write | Starts a new conversation; `--thinking auto|thinking|fast`, optional `--mode web_dev|web_search|deep_research`, `--attachment <path>`, and bounded `--timeout` seconds (10–3600; default 1800). |
| `qwen-studio code-output <text>` | Local write | Extracts fenced code from the supplied text; `--output <path>` saves selected `--index` (one-based) with no-overwrite semantics. |

The chat response is read from the observed chat detail API. A successful `ask` requires `done === true`, a nonempty assistant content string, and no visible generating indicator. Empty completed messages raise an error. The adapter does not automatically retry writes.
