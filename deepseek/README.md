# DeepSeek Chat for OpenCLI

Independent OpenCLI adapter for `https://chat.deepseek.com/` (separate from OpenCLI's built-in `deepseek` site adapter).

## Install and use

Install this directory with `opencli plugin install <path-or-url>`. The connected OpenCLI Chrome session must already be signed in to DeepSeek.

```sh
opencli deepseek-chat status
opencli deepseek-chat models
opencli deepseek-chat chats
opencli deepseek-chat chat-detail <conversation-uuid>
opencli deepseek-chat ask "Reply exactly: hello" --model instant
opencli deepseek-chat ask "Explain this briefly" --think --conversation-id <conversation-uuid>
opencli deepseek-chat ask "Search for current weather" --search
opencli deepseek-chat ask "Reply with only the exact marker line found in the attached file" --attachment tests/fixtures/upload-test.txt
opencli deepseek-chat new
opencli deepseek-chat chat-delete <conversation-uuid>
opencli deepseek-chat code-output '<assistant response text>'
```

`ask` starts a new DeepSeek conversation by default. Pass `--conversation-id <uuid>` to open and continue an existing conversation through DeepSeek's UI. The default JSON data includes only `answer` and `conversation_id`; pass `--include-messages` to include the visible conversation messages. Use `models` to list model labels (`instant`, `expert`, `vision`); pass one with `--model`. Selection is checked before submission; the current UI build renders no model picker, so `models` and `--model` fail closed (see coverage). `--think` enables DeepThink, `--search` enables web search (instant model only; rejected with `--model expert|vision`). `--attachment <local-file>` attaches a regular file (100 MB cap) before submission; a failed upload ends with "prompt was not submitted". It returns only after the assistant answer text is stable across polls. DeepSeek may be unavailable due to account limits or service load.

`new` starts a fresh chat from the root URL and fails closed ("new chat was not started") unless the root route opens with zero rendered conversation messages. `chat-delete <uuid>` deletes exactly one conversation through the sidebar item's "…" menu → `Delete` → confirmation dialog (a single "Delete chat" click, never repeated) and fails closed unless the target disappears from the sidebar while other conversations are preserved.

Read commands list chats from the sidebar and read a conversation's visible messages (`chat-detail`). Conversation lists and messages are read from the rendered page, so DeepSeek's virtualized windows may show only recent items. Use `--window background` to keep Chrome automation out of the foreground.

`code-output` extracts fenced code blocks from supplied response text. Add `--output <new-path>` to save one block (`--index` is one-based); existing files are never overwritten.

See [command reference](docs/commands.md), [coverage](docs/coverage.md), [architecture](docs/architecture.md), and [verification](docs/verification.md). This adapter does not implement the rest of DeepSeek's visible UI; coverage is stated explicitly. Rename, chat search, login/logout and export are not adapter commands.

For Codex and shell automation, OpenCLI already provides JSON output and a nonzero process exit on command failure; see the [agent integration guide](docs/agent-integration.md).
