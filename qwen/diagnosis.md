## **Diagnosis: The main problem is browser-session management**

I checked the updated [GitHub repository](https://github.com/llenn-collab/temp-workarounds-to-do?utm_source=chatgpt.com). The latest commit is [`a68e382`](https://github.com/llenn-collab/temp-workarounds-to-do/commit/a68e38202e7513269436100cd55d13ac4b2074b6?utm_source=chatgpt.com).

**The core Qwen adapter works, but browser initialization and session recovery are not reliable.**

The repository confirms that:

- A new Qwen conversation returned `READY`.
- A second request used the same conversation ID and recalled `Periwinkle`.
- Qwen recorded the requested `Qwen4-Max` model.
- A Codex-to-Qwen code-review exchange succeeded.
- The latest reported verification passed 48 tests and all nine adapter checks.

The problems you described concern what happens before the adapter can submit a request reliably.

### **What I found**

| Observed problem                         | Likely explanation                                                                    | Confidence                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Chrome opens at `about:blank`            | OpenCLI provides a new page that the adapter must initialize                          | Confirmed behavior; root cause of stalls unknown |
| Multiple windows and tabs appear         | OpenCLI may create or reconnect browser sessions instead of reusing the intended page | Possible; not yet proven                         |
| Qwen asks for birth year                 | A required website verification step prevents access to the normal chat interface     | Based on your observation                        |
| The adapter stalls during loading        | The current readiness checks do not cover every page state                            | Confirmed code limitation                        |
| Each prompt opens a new chat             | `ask` creates a new conversation by default unless it receives `--conversation-id`    | Confirmed                                        |
| The browser reconnects and commands fail | The active page may become invalid during a command                                   | Supported by previous failure reports            |

The key distinction is that **the browser opening successfully does not mean Qwen is ready to receive a prompt**.

## **2. Problems in the current implementation**

I found four areas that need attention.

### **Problem A: The adapter does not fully verify that Qwen is ready**

In [ask.js](https://github.com/llenn-collab/temp-workarounds-to-do/blob/main/ask.js?utm_source=chatgpt.com), the adapter currently follows this sequence:

```
Get browser URL
    ↓
If about:blank, navigate to Qwen
    ↓
Check document.visibilityState
    ↓
Wait for "New Chat" control
    ↓
Open conversation
    ↓
Wait for textarea
    ↓
Select model and modes
    ↓
Submit prompt
```

The problem is that these checks do not establish that the user can interact with Qwen.

For example, a birth-year verification dialog could cover the composer while the underlying textarea still exists.

**Required fix:** Add an explicit page-readiness check that distinguishes loading, authentication, required user action, and a usable chat composer.

Do not assume that `document.readyState === "complete"` means Qwen is ready. It only describes document loading.

### **Problem B: Persistent sessions can interfere with each other**

The adapter declares:

```
siteSession: 'persistent'
```

This should let successive commands reuse the site's browser tab.

However, OpenCLI's documentation warns that concurrent commands using a persistent site session can navigate the same tab while another command is using it. OpenCLI also uses separate browser and adapter automation containers.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub+1



I found a related issue in [qwen-api.mjs](https://github.com/llenn-collab/temp-workarounds-to-do/blob/main/qwen-api.mjs?utm_source=chatgpt.com):

```
await page.goto('https://chat.qwen.ai/');
```

Every call through this helper navigates to the Qwen homepage, even when the existing page is already on Qwen.

If Codex invokes `status`, `chats`, or `chat-detail` while another command controls the same persistent tab, navigation could interrupt the active operation.

I have not confirmed that this race caused your reported stalls. The code and OpenCLI documentation establish that the risk exists.

**Required fix:** Serialize operations that share a persistent Qwen tab. Avoid unnecessary navigation, and prevent diagnostic commands from interrupting a prompt submission.

OpenCLI documents a single-slot session pool for this purpose. The implementation should inspect support in your installed version before enabling it.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub



### **Problem C: The birth-year dialog is not handled**

Your report identifies a required Qwen verification dialog.

The current adapter has no dedicated handling for this state.

Qwen documents an age-verification cookie, which supports the existence of a separate age-verification process.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://qwen.ai\&sz=32)

qwen.ai



The adapter should detect the dialog and report that it needs user action.

You should complete the verification truthfully in the Chrome profile and Qwen tab that OpenCLI uses. The adapter should not invent a birth year or bypass the verification.

After verification, the adapter should check readiness again before submitting anything.

If the dialog repeatedly appears, investigate whether the commands use different Chrome profiles or whether Qwen preserves the verification state.

### **Problem D: New chats are the current default**

The present behavior is intentional:

```
if (conversationId) {
  // Open existing conversation
} else {
  // Start new chat
}
```

Therefore, every independent call without `--conversation-id` starts a new conversation.

For Codex delegation, this means Codex must retain the returned conversation ID and pass it in subsequent calls.

**Required fix:** Ensure the Codex integration preserves the conversation ID for the duration of each delegated task. Do not automatically continue whichever conversation happens to be most recent.

## **3. The browser behavior we should implement**

I recommend treating browser readiness as a sequence of explicit states.

flowchart TD
    A["Acquire Qwen adapter session"] --> B{"Page available?"}
    B -->|No| C["Stop with browser error"]
    B -->|Yes| D{"Page location"}
    D -->|about:blank| E["Navigate to Qwen once"]
    D -->|Qwen| F["Inspect page state"]
    E --> F
    D -->|Unrelated website| C
    F --> G{"Qwen ready?"}
    G -->|Still loading| H["Wait within deadline"]
    H --> F
    G -->|Authentication required| I["Stop: sign-in required"]
    G -->|Birth-year verification| J["Stop: user action required"]
    G -->|Composer ready| K["Open requested conversation"]
    K --> L["Verify conversation and controls"]
    L --> M["Submit one prompt"]
    M --> N["Retrieve completed response"]
    N --> O["Return answer and conversation ID"]

The adapter must never use a temporary loading screen as evidence that it should open another window.

If the browser connection becomes invalid, it should return a clear error. Codex can then inspect the existing conversation before any new submission.

## **4. Recommended next development task**

**Priority: Fix browser lifecycle and readiness before continuing file-upload work.**

The implementation should satisfy these requirements:

| Requirement            | Acceptance criterion                                                              |
| ---------------------- | --------------------------------------------------------------------------------- |
| Session reuse          | Sequential calls can reuse one persistent site session                            |
| Browser initialization | `about:blank` navigates to Qwen once                                              |
| Loading detection      | The adapter waits for a usable composer, not only document completion             |
| Birth-year dialog      | The adapter detects it and requests manual completion                             |
| Authentication         | Missing login prevents submission                                                 |
| Conversation control   | Continuations use the supplied conversation ID                                    |
| Concurrent operations  | Commands cannot navigate another command's active page                            |
| Browser disconnection  | The adapter reports the failure without opening uncontrolled replacement sessions |
| Submission recovery    | Uncertain submissions do not trigger automatic retries                            |

I would also add diagnostic output that records the command stage, URL, session mode, and failure category without exposing personal data or tokens.

For example:

```
{
  "status": "blocked",
  "stage": "page_readiness",
  "reason": "age_verification_required",
  "prompt_submitted": false,
  "action": "Complete Qwen verification in the connected browser"
}
```

This is a proposed diagnostic structure, not current adapter output.

## **5. How to test the existing adapter now**

Use one consistent session policy for a controlled test.

First, verify the browser connection:

```
opencli doctor
```

Then check Qwen:

```
opencli qwen-studio status \
  --site-session persistent \
  --window foreground \
  --format json
```

Once Qwen is visibly ready, submit a small prompt:

```
opencli qwen-studio ask \
  "Reply exactly: READY" \
  --site-session persistent \
  --window foreground \
  --format json
```

For a follow-up, use the returned conversation ID:

```
opencli qwen-studio ask \
  "What did I ask you to reply?" \
  --conversation-id "<returned-id>" \
  --site-session persistent \
  --window foreground \
  --format json
```

These flags are documented by OpenCLI. They request a persistent adapter session and a foreground window, but they cannot guarantee that the bridge will stay connected.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://github.com\&sz=32)

GitHub



Do not run unrelated browser diagnostics or concurrent Qwen commands during this test.

If Qwen displays the birth-year question, complete that step manually before proceeding.

If the command stalls after submission, inspect the conversation before retrying.

## **6. What I recommend changing in the project plan**

The repository's `goal.md` currently identifies file-upload investigation as the next priority.

I would change that priority.

| Order | Work                                                                     |
| ----- | ------------------------------------------------------------------------ |
| **1** | Stabilize browser sessions and page readiness                            |
| **2** | Handle required user verification and authentication states              |
| **3** | Prevent concurrent commands from interfering with an active conversation |
| **4** | Verify repeated new-chat and continuation operations                     |
| **5** | Resume file-upload investigation                                         |
| **6** | Verify Deep Research, Web Dev, and other modes                           |

File uploads remain a separate Chrome permission problem. Changing the browser lifecycle may make upload failures easier to diagnose, but it will not necessarily resolve the `Not allowed` error.

### **Conclusion**

**The next fix should focus on the OpenCLI–Qwen connection lifecycle, not the Qwen response parser.**

The response parser and core two-turn chat workflow have already passed live tests.

The unresolved issue is that the automation cannot consistently identify and retain a usable browser page throughout a command.

The most useful next implementation is a bounded browser-readiness module combined with safe persistent-session coordination. That provides a clear basis for diagnosing the remaining failures without creating more tabs, conversations, or uncertain submissions.

I have not changed repository files. I have also omitted the handoff, as requested.