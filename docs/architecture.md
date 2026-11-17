# Architecture

Each root-level JavaScript file registers one OpenCLI command for site `qwen-studio`. `status.js`, `chats.js`, and `chat-detail.js` call `qwenApiJson` in `qwen-api.mjs`; the helper navigates within the persistent authenticated browser session, reads `localStorage.token` only inside page context, and sends it as a Bearer header. It restricts paths to `/api/v2/` and does not return or log the token.

`response.mjs` validates the observed status, chats, projects, folders, library, and conversation payload shapes. Read commands use `qwen-api.mjs` to issue observed API requests from the signed-in page context. `chat-detail.js` validates the conversation shape and orders messages by timestamp. `ask.js` uses visible UI controls to create a conversation, set requested options, submit prompt/attachment, then polls the observed chat detail route for completion. `code-output.js` handles user-supplied response text locally and uses exclusive file creation when saving.

This uses undocumented site endpoints and UI labels observed during investigation; Qwen can change them without notice. No Qwen SDK or new runtime dependency is required.
