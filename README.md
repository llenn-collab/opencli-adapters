# Qwen Studio for OpenCLI

Independent OpenCLI adapter for `https://chat.qwen.ai/` (separate from the existing Qianwen adapter).

## Install and use

Install this directory with `opencli plugin install <path-or-url>`. The connected OpenCLI Chrome session must already be signed in to Qwen.

```sh
opencli qwen-studio status
opencli qwen-studio chats
opencli qwen-studio projects
opencli qwen-studio folders
opencli qwen-studio library
opencli qwen-studio chat-detail <conversation-id>
opencli qwen-studio ask "Reply exactly: hello" --thinking auto
opencli qwen-studio ask "What did I just ask you?" --conversation-id <conversation-id>
opencli qwen-studio ask "Search for current weather" --mode web_search
opencli qwen-studio code-output '<assistant response text>'
```

`ask` starts a new Qwen conversation by default. Pass `--conversation-id <id>` to open and continue an existing conversation through Qwen's UI; its stored history remains available to Qwen. The default JSON data includes only `answer` and `conversation_id`; pass `--include-messages` to include the messages returned by Qwen's current 10-message read window. It supports `--thinking auto|thinking|fast`, `--mode web_dev|web_search|deep_research`, and optional `--attachment <local-file>`. It returns only after Qwen marks a nonempty assistant response complete. Qwen may be unavailable due to account limits or service load.

Read commands list projects, folders, library items, and chats (`--page N` for later chat pages). Use `--window background` to keep Chrome automation out of the foreground. The adapter was verified from outside this directory with a live status request; OpenCLI still needs its connected, signed-in Chrome bridge.

`code-output` extracts fenced code blocks from supplied response text. Add `--output <new-path>` to save one block (`--index` is one-based); existing files are never overwritten. Pass the response text explicitly, for example from a saved `ask` result.

See [command reference](docs/commands.md), [coverage](docs/coverage.md), [architecture](docs/architecture.md), and [verification](docs/verification.md). This adapter does not implement the rest of Qwen's visible UI; coverage is stated explicitly.

For Codex and shell automation, OpenCLI already provides JSON output and a nonzero process exit on command failure; see the [agent integration guide](docs/agent-integration.md). Conversation listing and reading use `chats` and `chat-detail`. Rename, search, delete, and export are not adapter commands.
