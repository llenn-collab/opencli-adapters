# **OpenCLI Qwen Studio — Project Goal and Functional Manual**

**Repository:** [llenn-collab/temp-workarounds-to-do](https://github.com/llenn-collab/temp-workarounds-to-do.git)

**Latest GitHub commit:** [`b8a76c8`](https://github.com/llenn-collab/temp-workarounds-to-do/commit/b8a76c80f2352a447eb022bbfe28df9a023b2900)

**Project status: PARTIALLY FUNCTIONAL**

I inspected the latest repository code and verification records. The recent changes are present, including the response parser improvements and the new `message-content.mjs` module.

## **1. What is the actual goal?**

Build an OpenCLI adapter that lets Codex use the free Qwen Studio website as an external AI assistant.

The adapter must use the user's existing, authenticated Chrome session through OpenCLI.

It must not require a paid Qwen API key, use unsupported browser automation, or bypass browser security controls.

### **Expected workflow**

# Workflow: Codex with Qwen Studio

## Purpose
This workflow shows how Codex gets assistance from Qwen Studio.

## Steps
1. The user gives a task to Codex.
2. Codex makes a request for Qwen.
3. Codex sends the request to the adapter (OpenCLI for Qwen Studio).
4. The adapter uses the connected Chrome session.
5. The adapter connects to the authenticated Qwen Studio.
6. Qwen processes the request.
7. The adapter gets the completed response.
8. The adapter makes a compact, structured result.
9. Codex uses the result.
10. Codex asks: "Does Codex need more assistance?"

## Decision (Step 10)
- **Yes:** Codex continues the same conversation. Go back to step 3.
- **No:** Codex completes the task. The workflow ends.

## Note
The loop uses the same conversation. This keeps the context for Qwen.

## Flow Summary
User → Codex → Adapter → Chrome session → Qwen Studio → Qwen → Adapter → Result → Codex → Decision (loop to step 3, or end)
The final goal is not simply to send messages to Qwen.

**The final goal is to make Qwen a reliable AI service that Codex can call, use repeatedly, and recover from safely.**

For example, Codex should be able to send a code review to Qwen, obtain a response, ask follow-up questions in the same conversation, and use the results without manual copying.

Codex remains responsible for evaluating Qwen's output and completing the user's task.

## **2. What have we accomplished?**

The latest repository records **41 passing automated tests**. I verified the implementation and its documented test results on GitHub, but I did not independently execute the test suite or a live Qwen command.

| Capability                    | Current state                                                 |
| ----------------------------- | ------------------------------------------------------------- |
| OpenCLI integration           | Implemented                                                   |
| Qwen authentication detection | Live verified                                                 |
| Conversation listing          | Verified in previous live tests                               |
| Read conversation messages    | Implemented and live verified                                 |
| Compact JSON response format  | Verified through replay                                       |
| Model discovery               | Live verified                                                 |
| Model selection               | Implemented; automated live execution unverified              |
| New text conversation         | Submission verified; successful command completion unverified |
| Response extraction           | Improved and replay verified                                  |
| Multi-turn conversation       | Implemented; live verification pending                        |
| Thinking controls             | Implemented; results not verified                             |
| Web search and research modes | Partially verified                                            |
| File uploads                  | Blocked by Chrome permissions                                 |
| Error handling                | Implemented; more live validation required                    |
| Codex integration             | Documented; complete delegation workflow not verified         |

### **Important progress**

The previous failure did not mean that Qwen failed to generate an answer.

Qwen successfully generated `OK.` in conversation `17d400aa-9762-416e-9e17-282a7ed8db21`.

The original command failed to retrieve that answer within its timeout. The updated parser can now recover the answer from the recorded conversation.

This establishes that the parser works for that observed response structure. It does not yet establish that a new live `ask` command can complete successfully.

## **3. Expected adapter behavior — Operating manual**

This section defines how the completed adapter must function.

### **A. Installation and authentication**

**Objective:** Reuse an existing Qwen account without requesting separate API credentials.

The operator must:

1. Install the OpenCLI plugin.
2. Connect Chrome to OpenCLI.
3. Sign in to [Qwen Studio](https://chat.qwen.ai/?utm_source=chatgpt.com).
4. Confirm authentication before submitting tasks.

Example:

```
opencli plugin install .
opencli qwen-studio status --format json
```

Expected result:

```
{
  "ok": true,
  "data": {
    "logged_in": true,
    "site": "qwen-studio"
  }
}
```

This illustrates the expected result structure.

The adapter must never print or save authentication tokens.

### **B. Model discovery and selection**

**Objective:** Let Codex discover and select models available to the connected Qwen account.

```
opencli qwen-studio models --format json
```

The command must return each available model's exact label, selected state, and disabled state.

To select a model:

```
opencli qwen-studio ask \
  "Explain this JavaScript function." \
  --model "Qwen3.7-Plus" \
  --window foreground \
  --format json
```

Expected behavior:

- Discover current models instead of relying on fixed model names.
- Accept an exact available model label.
- Verify selection before submitting.
- Reject unsupported or unavailable models without submitting a prompt.

**Current status:** Model discovery works. Live model-specific answer generation still needs verification.

### **C. Text chat**

**Objective:** Submit a prompt and retrieve a completed answer.

```
opencli qwen-studio ask \
  "Reply exactly: OK." \
  --window foreground \
  --format json
```

Expected successful result:

```
{
  "ok": true,
  "data": {
    "answer": "OK.",
    "conversation_id": "<conversation-uuid>"
  }
}
```

This is an example of the intended format, not a verified successful live command result.

The adapter must wait until Qwen finishes its response. It must not treat an empty answer or an incomplete message as success.

For efficient Codex integration, the default result must contain only the answer and conversation ID.

### **D. Conversation continuity**

**Objective:** Continue a previous Qwen conversation without losing its context.

For example, Codex submits:

```
opencli qwen-studio ask \
  "Remember the number 47. Reply READY." \
  --window foreground \
  --format json
```

The adapter returns a conversation ID.

Codex then submits:

```
opencli qwen-studio ask \
  "What number did I give you?" \
  --conversation-id "<conversation-uuid>" \
  --window foreground \
  --format json
```

Expected answer:

```
{
  "answer": "47",
  "conversation_id": "<same-conversation-uuid>"
}
```

The real response includes the normal OpenCLI JSON envelope.

The adapter must:

- Open the specified conversation.
- Preserve the conversation history stored by Qwen.
- Identify the new reply rather than return an old reply.
- Return the same conversation ID.
- Avoid creating a different conversation by mistake.

**Current status:** The implementation exists, but a successful live continuation has not been demonstrated.

### **E. Reasoning and task modes**

The adapter must support these controls where Qwen makes them available.

| Function           | Command option         | Expected behavior                     |
| ------------------ | ---------------------- | ------------------------------------- |
| Automatic thinking | `--thinking auto`      | Let Qwen choose its thinking behavior |
| Thinking           | `--thinking thinking`  | Select Qwen's thinking mode           |
| Fast               | `--thinking fast`      | Select Qwen's fast mode               |
| Web search         | `--mode web_search`    | Request Qwen's web search mode        |
| Deep research      | `--mode deep_research` | Request Qwen's deep research mode     |
| Web development    | `--mode web_dev`       | Request Qwen's Web Dev mode           |

Example:

```
opencli qwen-studio ask \
  "Research the latest developments in AI coding tools." \
  --mode deep_research \
  --format json
```

The expected behavior is to select the requested mode, submit the prompt, and return a completed response.

The adapter must not claim that a mode worked merely because its selection control changed.

### **F. File uploads**

**Objective:** Allow Codex to send a local file to Qwen.

Intended command:

```
opencli qwen-studio ask \
  "Review this code and identify defects." \
  --attachment "./example.js" \
  --format json
```

The completed functionality must:

1. Verify that the file exists and is acceptable.
2. Attach it through an OpenCLI-supported mechanism.
3. Confirm that Qwen received the attachment.
4. Submit the prompt.
5. Return Qwen's completed answer.

The adapter should support file types that Qwen accepts, subject to account and website limits.

**Current blocker:** Chrome rejects the file-input operation with `Not allowed`.

This feature must remain blocked until a supported upload mechanism works. The implementation must not bypass Chrome's restrictions.

### **G. Conversation retrieval**

The repository currently provides these read commands:

| Command       | Purpose                         |
| ------------- | ------------------------------- |
| `status`      | Check authentication            |
| `models`      | Discover account-visible models |
| `chats`       | List recent conversations       |
| `chat-detail` | Retrieve conversation messages  |
| `projects`    | List Qwen projects              |
| `folders`     | List folders outside projects   |
| `library`     | List library items              |

Example:

```
opencli qwen-studio chats --page 1 --format json

opencli qwen-studio chat-detail \
  "<conversation-uuid>" \
  --format json
```

Conversation reads currently request up to 10 messages.

For the `ask` command, optional history output is available:

```
opencli qwen-studio ask \
  "Summarize our discussion." \
  --conversation-id "<conversation-uuid>" \
  --include-messages \
  --format json
```

**Important:** `--include-messages` does not guarantee the complete conversation history.

Full-history retrieval is not part of the current verified implementation.

### **H. Structured responses and code extraction**

**Objective:** Make Qwen's answers easy for Codex to process.

The adapter must preserve Qwen's generated text in the `answer` field.

If Qwen generates JSON, Codex can parse that text separately. The adapter does not currently guarantee that Qwen will produce valid JSON simply because the prompt requests it.

The existing code extraction command is:

````
opencli qwen-studio code-output \
  '```js
console.log("Hello");
```' \
  --format json
````

This extracts code blocks from supplied text. It does not execute the code.

The command can also save a code block to a new file without overwriting an existing file.

### **I. Error handling and recovery**

**Objective:** Avoid duplicate requests, incorrect answers, and unsafe recovery actions.

| Failure                      | Required behavior                                     |
| ---------------------------- | ----------------------------------------------------- |
| User not authenticated       | Stop and report authentication failure                |
| Browser page not visible     | Stop before submission                                |
| Unsupported model            | Reject before submission                              |
| Network read failure         | Retry read operations within the deadline             |
| Qwen returns HTTP 429 or 5xx | Retry eligible reads within the deadline              |
| Response incomplete          | Continue polling                                      |
| Multiple conflicting answers | Report an error                                       |
| Timeout after submission     | Report uncertainty; do not submit again automatically |
| Upload permission denied     | Stop without bypassing Chrome                         |
| Invalid conversation ID      | Reject the request                                    |

A critical distinction is whether the failure occurred **before or after prompt submission**.

If the command fails after sending a prompt, Codex must inspect the existing conversation before considering another submission.

The adapter must never assume that a timeout means Qwen did not answer.

## **4. What remains to accomplish?**

These are the outstanding engineering requirements, in priority order.

| Priority | Task                        | Completion criterion                                                           |
| -------- | --------------------------- | ------------------------------------------------------------------------------ |
| P0       | Reliable live text response | A new `ask` command exits successfully with the correct nonempty answer and ID |
| P0       | Multi-turn continuation     | Two successful consecutive commands use the same conversation                  |
| P0       | Safe timeout recovery       | A failed read cannot cause a duplicate prompt                                  |
| P1       | Live model selection        | A generated response uses the requested available model                        |
| P1       | Codex task delegation       | Codex invokes OpenCLI, reads JSON, and uses the answer without manual copying  |
| P1       | File uploads                | Qwen accepts a real local attachment through supported OpenCLI operations      |
| P1       | Reasoning-mode verification | Each requested thinking setting works in a live task                           |
| P1       | Task-mode verification      | Web search, deep research, and Web Dev produce verified results                |
| P2       | Reliability testing         | Repeated bounded tests establish stable behavior and clear failure reporting   |
| P2       | Documentation               | Commands, limitations, and verification records match actual behavior          |

The initial project goal does not require implementing every feature in the Qwen website.

Image generation, video generation, voice, publishing, chat deletion, and other site-management features are outside the present scope.

## **5. What should Codex delegation look like?**

Consider this example.

**User request:** Review a Python module and identify possible defects.

The desired process is:

1. Codex reads the relevant Python code.
2. Codex decides whether a second AI analysis would help.
3. Codex calls the Qwen adapter with the code or an appropriate file attachment.
4. Qwen returns findings through the compact response format.
5. Codex checks those findings against the actual code.
6. Codex can ask another question using the same conversation ID.
7. Codex produces the final answer or implements a verified correction.

The user should not need to open Qwen manually for every prompt, select the model, copy answers, or maintain conversation IDs.

The user may still need to authenticate, restore the Chrome window, or resolve an account restriction.

**Codex must remain the decision-maker.** Qwen supplies additional analysis; Codex evaluates it before applying changes.

## **6. When can we call the project complete?**

For the core adapter, I would require the following acceptance tests:

- **Test 1 — Authentication:** Detect signed-in and signed-out states correctly.
- **Test 2 — Model selection:** Discover an available model, select it, and verify the selection.
- **Test 3 — Generation:** Submit a new prompt and receive a nonempty answer in one successful command.
- **Test 4 — Continuation:** Continue the returned conversation and confirm Qwen remembers information from the previous turn.
- **Test 5 — Structured output:** Return the correct answer and conversation ID without unnecessary conversation data.
- **Test 6 — Recovery:** Handle timeouts, temporary read failures, and browser visibility failures without duplicate submissions.
- **Test 7 — Upload:** Send a real supported file and confirm Qwen uses its contents.
- **Test 8 — Delegation:** Complete one real Codex-to-Qwen-to-Codex workflow.
- **Test 9 — Regression:** Pass the automated suite and OpenCLI adapter checks without warnings.

These tests require real browser-backed verification where applicable. Unit tests alone do not establish successful integration with Qwen.

## **7. What should we do next?**

**Next task: Verify a complete live two-turn conversation with the updated parser.**

The previous iterations established three important facts:

1. Qwen can receive a submitted prompt.
2. Qwen can generate a completed answer.
3. The corrected parser can recover that answer through read-only replay.

The remaining gap is making the complete `ask` command return successfully and then continuing its conversation.

I recommend one controlled live test using the connected foreground Qwen page. If the first command fails after submission, inspect the existing conversation rather than resubmit. If it succeeds, run one continuation.

Do not begin another broad browser investigation unless that test provides new evidence of a browser-specific failure.

Once live continuation passes, test Codex delegation using the existing OpenCLI JSON interface. After that, address the file-upload blocker and verify the requested modes.

### **Final assessment**

The repository now has **nine registered commands**, a compact response format, model discovery, response parsing, and the foundations of conversation continuity.

The principal unfinished work is no longer basic command implementation. It is **end-to-end reliability and verification**.

The target remains clear: Codex should be able to use Qwen Studio as an external AI assistant, obtain complete results, continue discussions, and recover safely from failures.