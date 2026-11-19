# Qwen conversation continuation

## Intent

Enable an OpenCLI user to continue an existing Qwen chat by its explicit conversation ID, while preserving the website's own conversation history and returning the actual assistant messages with that ID. This supports reliable multi-turn use without fabricating memory.

## Goals

- Fix the current response-polling callback so it receives the remaining deadline.
- Keep `ask <prompt>` creating a new Qwen conversation.
- Add an optional conversation ID to `ask`; when supplied, open that Qwen conversation in the authenticated browser and submit the new prompt through the website UI.
- Return the conversation ID together with the actual conversation messages.
- Keep `chats` as the list command and `chat-detail <id>` as the read command; the continuation path opens the same conversation before sending.
- Keep empty assistant output as an explicit error and never retry prompt submission automatically.

## Non-goals

- No direct, undocumented write API calls.
- No injection of prior user/assistant messages into a new prompt.
- No extra Qwen features or attachment implementation without a verified browser-supported upload method.

## Approaches considered

1. **Reuse `ask` with an optional conversation ID (selected).** Navigate to the existing `/c/<id>` route, use the website composer, and poll the existing conversation. This reuses the current command and uses Qwen's own persistent history.
2. **Add separate `continue` and `open` commands.** This makes the actions explicit but duplicates command surface and risks splitting the same UI submission flow.
3. **Post directly to an observed Qwen write endpoint.** Rejected because the endpoint is undocumented and not yet verified; it would bypass the website's conversation behavior.

## Constraints and calls

- Preserve authentication in page context; never read or print the token.
- A command with an explicit conversation ID must validate it before navigation.
- Prompt submission happens once. If it may have succeeded but reading fails, inspect that conversation before another write.
- A response is successful only when Qwen marks the assistant message complete and its content is nonempty.
- The live probe created conversation `7e1b2505-122a-411b-aa7e-862d2372308a`, but Qwen returned an empty assistant message. That live outcome remains a service-side blocker; it must not be represented as successful verification.

## Verification scope

- Unit coverage for conversation-ID validation, response shape, timeout propagation, and empty-response errors.
- Live verification of a new chat and a two-turn exchange only after a nonempty assistant response is available.
- Update `docs/commands.md`, `docs/coverage.md`, and `docs/verification.md` with verified behavior and blockers.
