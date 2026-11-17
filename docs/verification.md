# Verification

- Unit suite: `node --test tests/*.test.js` — 11 passed after ask route, upload-label, and incomplete-history fixes.
- OpenCLI registration checks: `opencli adapter check qwen-studio/{status,chats,chat-detail,ask,code-output}` — each command passed with zero warnings.
- Live status: returned `logged_in: true` on the connected account.
- Live chats: returned `ok: true`, count 10.
- Chat detail smoke check: returned the authorized test conversation's message records.
- Ask smoke checks: minimal prompts opened new conversations and returned the explicit error `Qwen completed the request without a response; check account limits or site errors`. A prior visible response showed “The service is currently experiencing high demand. Please try again later.” Successful answer generation is not verified.
- The adapter path for Web search, Web Dev, and Deep Research reached Qwen completion; each test returned an empty assistant response. Mode-specific result behavior is not verified.
- Attachment attempts through both `page.setFileInput` and `opencli browser upload` failed before submission with Chrome `{"code":-32000,"message":"Not allowed"}`. `ask` now reports this clearly. This is a browser permission/runtime limit, not a confirmed Qwen upload rejection.
- The `ask` live runs exposed and fixed two adapter bugs: OpenCLI initially leased an inactive/new tab, and `/c/new-chat` was mistaken for a final chat ID. It now uses the persistent current session and waits for a UUID conversation path; newly created but not-yet-ready history is polled instead of treated as malformed. Web Dev, Web search, and Deep Research runs reached Qwen completion and correctly returned the empty-response error.

Never include account tokens or private chat contents in logs or test fixtures. The current account was authorized for small test prompts; those prompts may consume usage.
