# Qwen Studio adapter notes

Use `opencli qwen-studio status` to check login; `chats --page N`, `projects`, `folders`, and `library` to inspect account data; and `chat-detail <id>` to read up to the observed conversation history. Use `ask` for a new prompt and optionally select a supported mode, thinking setting, or local attachment. Use `code-output` on assistant response text to extract or save fenced code.

The adapter uses the currently connected Chrome session. Keep the browser signed in at chat.qwen.ai; `--window background` keeps automation out of the foreground. Never copy or print the localStorage token. Prompt submission and uploads write to the user's Qwen account and may consume usage. Do not retry prompts blindly after a timeout: inspect the conversation first to avoid duplicate submissions.

See `docs/commands.md` for flags and `docs/verification.md` for known limitations.
