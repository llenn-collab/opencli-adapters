# Agent integration

OpenCLI is the supported automation interface. It defaults to JSON, offers structured command metadata, and exits nonzero when a command fails. No separate MCP server or wrapper is needed.

## Prerequisites

- Install this plugin with OpenCLI.
- Sign in to Qwen in the Chrome session connected to OpenCLI.
- Confirm with `opencli qwen-studio status --window background`.
- Use `--window background` for commands that should not foreground Chrome.

The localStorage token is read only inside the Qwen page context. Do not enable verbose/trace capture for secret-bearing browser state or copy token values into scripts. `ask` sends a prompt and may consume account usage.

## Submit a prompt and capture the response

```sh
if result=$(opencli qwen-studio ask 'Reply exactly: hello' --timeout 120 --format json); then
  printf '%s\n' "$result" | jq -er '.data.answer'
else
  printf '%s\n' 'Qwen ask failed; inspect the OpenCLI error above.' >&2
  exit 1
fi
```

The assistant message is the authoritative result; a conversation ID alone is not success. The command requires a nonempty completed assistant response and returns `{ answer, conversation_id }` by default. Pass `--include-messages` to also return the messages in Qwen's current 10-message read window; this is not guaranteed to be the full conversation history. It retries only read-only polling after network errors or HTTP 429/5xx, within the same timeout. It never retries prompt submission automatically. If the process times out after submission, inspect `opencli qwen-studio chats` before manually retrying to avoid duplicate prompts.

## Discover and retrieve a conversation

```sh
opencli qwen-studio chats --page 1 --format json
opencli qwen-studio chat-detail '<conversation-id>' --format json
```

`ask` returns the ID for the chat it created. Use that ID to read the conversation or continue it:

```sh
opencli qwen-studio chat-detail '<conversation-id>' --format json
opencli qwen-studio ask 'What number did I give you?' --conversation-id '<conversation-id>' --format json
```

With `--conversation-id`, `ask` opens the existing chat and submits through Qwen's composer, so Qwen uses its own stored history. It does not inject earlier messages into the prompt. Rename, search, delete, and export are not adapter commands.

## Consume structured output

```sh
opencli qwen-studio --help -f json | jq '.commands[] | {name, usage, command_options}'
opencli qwen-studio code-output '```js
console.log("hello")
```' --format json
```

OpenCLI's `--format json` output wraps command data in its JSON result object. Preserve the process exit status and treat command failure as failure even if partial output exists. `code-output --output <path>` creates a new file exclusively and refuses to overwrite an existing path.

## Codex and Bili

From a Codex task, invoke the same OpenCLI commands through the shell and parse their JSON. Keep authentication in the existing connected browser session; do not put credentials in prompts, environment dumps, logs, or agent instructions. Example:

```sh
opencli qwen-studio ask 'Summarize this error in one sentence' --timeout 120 --format json
```

This workspace has Codex CLI 0.169.0 and Billion Context 0.1.214 installed. A local `bili codex --help` smoke attempt was blocked because Bili could not create its per-session overlay lock directory at `/Users/llenn/.codex-bili-s1-bili-s1/.bili-launch.lock`. Bili session isolation means normal Codex shell discovery and Chrome connectivity do not prove Bili compatibility. The adapter makes no global Codex, Bili, or Context Mode changes. Retry the Bili smoke only in an environment where its own session overlay starts, then confirm `opencli` discovery and the connected Chrome bridge from inside that session.
