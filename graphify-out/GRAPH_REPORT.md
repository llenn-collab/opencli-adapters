# Graph Report - temp  (2026-11-18)

## Corpus Check
- 108 files · ~57,077 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .toml 5, (none) 2, .zst 1)

## Summary
- 661 nodes · 834 edges · 56 communities (47 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6cc6d20a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Deep Recon: evidence-first discovery for undocumented sites
- Command reference — deepseek-chat
- ref_jackwener_opencli
- Verification
- chat-delete.test.js
- Workflow: Codex with Qwen Studio
- Typed Error Conventions
- qwen/ask.js
- deepseek/ask.js
- Adapter Template
- OpenCLI AutoFix — Automatic Adapter Self-Repair
- Success-Rate Pitfalls
- eastmoney（东方财富）
- Field Decode Playbook
- Output Design
- diagnosis.md
- 站点
- 站点
- 智能搜索路由器
- JSDOM-against-frozen-fixture pattern (for in-browser DOM extractors)
- 站点
- 站点
- 站点
- bilibili（B 站）
- Site Recon
- AI 默认源
- Qwen Reliability and Acceptance Implementation Plan
- eastmoney（东方财富）
- tonghuashun（同花顺 / ths）
- xueqiu（雪球）
- 站点
- deepseek/package.json
- Qwen Studio investigation handoff
- Qwen conversation continuation
- qwen/package.json
- gmail
- Goal: Codex uses DeepSeek Chat as an external assistant
- Project agent instructions
- Coverage Matrix
- Adapter authoring
- Browser tools for agents
- 旅游
- OpenCLI
- Qwen Studio adapter audit
- Qwen Conversation Continuation Implementation Plan
- DeepSeek Chat Reliability and Acceptance Implementation Plan
- Choosing an adapter strategy
- opencode.json
- review-sample.py
- qwen/SKILL.md
- upload.test.js

## God Nodes (most connected - your core abstractions)
1. `askCommand` - 15 edges
2. `Verification` - 14 edges
3. `OpenCLI AutoFix — Automatic Adapter Self-Repair` - 13 edges
4. `Success-Rate Pitfalls` - 13 edges
5. `qwenApiJson()` - 12 edges
6. `Workflow: Codex with Qwen Studio` - 12 edges
7. `askCommand` - 12 edges
8. `Deep Recon: evidence-first discovery for undocumented sites` - 11 edges
9. `智能搜索路由器` - 10 edges
10. `**3. Expected adapter behavior — Operating manual**` - 10 edges

## Surprising Connections (you probably didn't know these)
- `ask flow` --references--> `setFeature()`  [INFERRED]
  deepseek/docs/architecture.md → deepseek/model-ui.mjs
- `Architecture` --references--> `qwenApiJson()`  [INFERRED]
  qwen/docs/architecture.md → qwen/qwen-api.mjs
- `Reliability hardening (2026-11-18)` --references--> `qwenApiJson()`  [INFERRED]
  qwen/docs/verification.md → qwen/qwen-api.mjs
- `Modules` --references--> `setFeature()`  [INFERRED]
  deepseek/docs/architecture.md → deepseek/model-ui.mjs
- `Modules` --references--> `resolveAttachment()`  [INFERRED]
  deepseek/docs/architecture.md → deepseek/upload.mjs

## Import Cycles
- None detected.

## Communities (56 total, 9 thin omitted)

### Community 0 - "Deep Recon: evidence-first discovery for undocumented sites"
Cohesion: 0.05
Nodes (37): 0.1 反爬厂商 → 决定 fetch 能不能从 Node 走, 0.2 跨 subdomain = CORS 默认关, §0 进入 §1 之前：先看两条红线, §1 network 精读（首选，Pattern A / D 命中率最高）, §2 `__INITIAL_STATE__` / inline HTML（Pattern B）, §3 JS bundle / script src 搜索（Pattern C，也是 A/D 的降级）, §4 Token / CSRF 来源排查（Pattern D）, §5 让页面自然发请求并截获 response（最后降级） (+29 more)

### Community 1 - "Command reference — deepseek-chat"
Cohesion: 0.06
Nodes (28): Agent integration — deepseek-chat, Attachments, Code extraction, Failure classes, Pooling, Result contract, Task-scoped conversation IDs, ask (+20 more)

### Community 2 - "ref_jackwener_opencli"
Cohesion: 0.13
Nodes (13): extractCodeBlocks(), extractCodeBlocks(), discoverModels(), selectModel(), listModels(), qwenApiJson(), buildChatsPath(), parseArrayData() (+5 more)

### Community 3 - "Verification"
Cohesion: 0.06
Nodes (27): Agent integration, Codex and Bili, Consume structured output, Discover and retrieve a conversation, Prerequisites, Session coordination, Submit a prompt and capture the response, Architecture (+19 more)

### Community 4 - "chat-delete.test.js"
Cohesion: 0.18
Nodes (15): chatDeleteCommand, countConversationLinks(), deleteConversation(), hoverConversation(), parseConversationId(), readVisibleMessages(), listConversations(), parseConversationList() (+7 more)

### Community 5 - "Workflow: Codex with Qwen Studio"
Cohesion: 0.07
Nodes (27): **1. What is the actual goal?**, **2. What have we accomplished?**, **3. Expected adapter behavior — Operating manual**, **4. What remains to accomplish?**, **5. What should Codex delegation look like?**, **6. When can we call the project complete?**, **7. What should we do next?**, **A. Installation and authentication** (+19 more)

### Community 6 - "Typed Error Conventions"
Cohesion: 0.07
Nodes (24): `endpoints.json` 格式（schema 锁死）, `field-map.json` 格式（schema 锁死）, `fixtures/<cmd>-<YYYYMMDDHHMM>.json` 格式, Layer 1 — In-repo 种子（`references/site-memory/<site>.md`）, Layer 2 — 本地工作目录（`~/.opencli/sites/<site>/`）, `notes.md` 格式, runbook 里的读/写时机, Site Memory (+16 more)

### Community 7 - "qwen/ask.js"
Cohesion: 0.18
Nodes (20): askCommand, assertInputVisible(), assertPageReady(), captureConversationBaseline(), conversationMessageIds(), extractChatId(), formatAskResult(), modes (+12 more)

### Community 8 - "deepseek/ask.js"
Cohesion: 0.11
Nodes (27): askCommand, assertFreshChat(), assertInputVisible(), assertPageReady(), captureConversationBaseline(), extractChatId(), openConversation(), parseBool() (+19 more)

### Community 9 - "Adapter Template"
Cohesion: 0.11
Nodes (18): 1. Declaration — 标头, 2. Args & Columns, 3. func — 主体, Adapter Template, args 形态：object vs array, COOKIE adapter 骨架（需要登录态）, Cookie 域的双查, HTML 不走 browser fetch (+10 more)

### Community 10 - "OpenCLI AutoFix — Automatic Adapter Self-Repair"
Cohesion: 0.11
Nodes (17): API changed (API_ERROR, EMPTY_RESULT), Before Entering Repair: "Empty" ≠ "Broken", Common Fixes, DOM changed (SELECTOR errors), Example Repair Session, OpenCLI AutoFix — Automatic Adapter Self-Repair, Prerequisites, Rules for Patching (+9 more)

### Community 11 - "Success-Rate Pitfalls"
Cohesion: 0.14
Nodes (13): 10. adapter 默认 timeout 不统一, 11. `aria-label` / `placeholder` / `title` 是 locale-dependent 文本, 1. fixture pattern 被放松以过 verify, 2. 字段内容污染但 `notEmpty` / `columns` 都过, 3. 字段语义分歧（两个字段看起来都对）, 4. 字段单位混淆（数值量级错）, 5. JSON-in-attribute vs 渲染后 innerText, 6. cookie 域 / origin 不一致的隐式假设 (+5 more)

### Community 12 - "eastmoney（东方财富）"
Cohesion: 0.15
Nodes (12): bilibili, Convertible bond（可转债）专属, datacenter-web 报表 `reportName`, eastmoney（东方财富）, Field Conventions, fs 市场/板块过滤码, K-line `push2his` stock/kline/get, Market 前缀（secid 格式 `<market>.<code>`） (+4 more)

### Community 13 - "Field Decode Playbook"
Cohesion: 0.15
Nodes (12): §1 肉眼对网页（字符串/时间/URL 类）, §2 排序键对比法（数字类核心手段）, §3 结构差分法（数组 / 嵌套对象类）, §4 常量 / 精度位排查, §5 写完要做的事, §6 通用坑, §7 真推不出来, Field Decode Playbook (+4 more)

### Community 14 - "Output Design"
Cohesion: 0.15
Nodes (12): 1. 命名, 2. 类型, 3. 顺序, 4. 必有列（按类型）, 5. 控量, args 命名, description 字段, Output Design (+4 more)

### Community 15 - "diagnosis.md"
Cohesion: 0.15
Nodes (12): **2. Problems in the current implementation**, **3. The browser behavior we should implement**, **4. Recommended next development task**, **5. How to test the existing adapter now**, **6. What I recommend changing in the project plan**, **Conclusion**, **Diagnosis: The main problem is browser-session management**, **Problem A: The adapter does not fully verify that Qwen is ready** (+4 more)

### Community 16 - "站点"
Cohesion: 0.17
Nodes (11): apple-podcasts, bilibili, douban, imdb, medium, spotify, tiktok, youtube (+3 more)

### Community 17 - "站点"
Cohesion: 0.17
Nodes (11): bluesky, facebook, instagram, tieba, twitter, weibo, xiaohongshu, zhihu (+3 more)

### Community 18 - "智能搜索路由器"
Cohesion: 0.18
Nodes (10): AI 查询词建议, AI 源选择, 专用源补充时机, 主路由规则, 单题预算与频率限制, 参考文件, 处理不可用的源, 强制预检 (+2 more)

### Community 19 - "JSDOM-against-frozen-fixture pattern (for in-browser DOM extractors)"
Cohesion: 0.20
Nodes (9): Anti-patterns to avoid, Creating the HTML fixture, File layout, JSDOM-against-frozen-fixture pattern (for in-browser DOM extractors), Mandatory steps (in order), Reverse-validation (mandatory before claiming the test catches the bug), See also, When this pattern applies (+1 more)

### Community 20 - "站点"
Cohesion: 0.20
Nodes (9): 36kr, google, reuters, substack, weibo, wikipedia, 站点, 资讯 / 知识 (+1 more)

### Community 21 - "站点"
Cohesion: 0.20
Nodes (9): boss, dictionary, linkedin, sinablog, weread, xueqiu, 其他垂直源, 站点 (+1 more)

### Community 22 - "站点"
Cohesion: 0.20
Nodes (9): arxiv, hackernews, linux-do, reddit, stackoverflow, v2ex, 技术 / 学术, 站点 (+1 more)

### Community 23 - "bilibili（B 站）"
Cohesion: 0.22
Nodes (8): bilibili（B 站）, 关键：wbi 签名, 可参考的 adapter, 坑 / 陷阱, 域名, 字段, 已知 endpoint, 默认鉴权

### Community 24 - "Site Recon"
Cohesion: 0.22
Nodes (8): Pattern A — SPA / JSON XHR, Pattern B — SSR / inline data, Pattern C — JSONP / `<script src>` 驱动, Pattern D — Token / CSRF / Bearer, Pattern E — 流式, Site Recon, 识别失败怎么办, 页面与请求事实

### Community 25 - "AI 默认源"
Cohesion: 0.22
Nodes (8): AI 默认源, doubao, gemini, grok, 使用规则, 补充原则, 路由建议, 通用写法模板

### Community 26 - "Qwen Reliability and Acceptance Implementation Plan"
Cohesion: 0.22
Nodes (8): 1. Establish the baseline, 2. Isolate the browser lifecycle, 3. Prove text, model and recovery, 4. Find the upload boundary, 5. Verify modes and actual delegation, 6. Final gate and records, Execution ownership and sequencing, Qwen Reliability and Acceptance Implementation Plan

### Community 27 - "eastmoney（东方财富）"
Cohesion: 0.25
Nodes (7): eastmoney（东方财富）, 可参考的 adapter, 坑 / 陷阱, 域名, 字段, 已知 endpoint, 默认鉴权

### Community 28 - "tonghuashun（同花顺 / ths）"
Cohesion: 0.25
Nodes (7): tonghuashun（同花顺 / ths）, 可参考的 adapter, 坑 / 陷阱, 域名, 字段, 已知 endpoint, 默认鉴权

### Community 29 - "xueqiu（雪球）"
Cohesion: 0.25
Nodes (7): xueqiu（雪球）, 可参考的 adapter, 坑 / 陷阱, 域名, 字段, 已知 endpoint, 默认鉴权

### Community 30 - "站点"
Cohesion: 0.25
Nodes (7): amazon, coupang, douban, smzdm, 站点, 购物, 路由提示

### Community 31 - "deepseek/package.json"
Cohesion: 0.29
Nodes (7): description, @jackwener/opencli, name, peerDependencies, @jackwener/opencli@>=2.0.3, type, version

### Community 32 - "Qwen Studio investigation handoff"
Cohesion: 0.25
Nodes (7): Focused-browser investigation, Follow-up live verification — 2026-11-18, Implementation and verification handoff — 2026-11-18, Latest resume, Qwen Studio investigation handoff, Read-only expansion — 2026-11-18, Resume update

### Community 33 - "Qwen conversation continuation"
Cohesion: 0.25
Nodes (7): Approaches considered, Constraints and calls, Goals, Intent, Non-goals, Qwen conversation continuation, Verification scope

### Community 34 - "qwen/package.json"
Cohesion: 0.29
Nodes (7): description, @jackwener/opencli, name, peerDependencies, @jackwener/opencli@>=2.0.3, type, version

### Community 35 - "gmail"
Cohesion: 0.29
Nodes (6): Domain and auth, Durable pitfalls, gmail, Positional fields verified in 2026-08, Strategy, Verified read paths

### Community 36 - "Goal: Codex uses DeepSeek Chat as an external assistant"
Cohesion: 0.29
Nodes (6): Acceptance tests, Expected adapter behavior — Operating manual, Flow Summary, Goal: Codex uses DeepSeek Chat as an external assistant, Purpose, Workflow: Codex with DeepSeek Chat

### Community 37 - "Project agent instructions"
Cohesion: 0.33
Nodes (5): Agent Desktop, DeepSeek Chat adapter (`deepseek/`), Delegation, Project agent instructions, Qwen Studio adapter (`qwen/`)

### Community 38 - "Coverage Matrix"
Cohesion: 0.33
Nodes (5): Coverage Matrix, 不支持（承认搞不定，skill 不教）, 决定用不用 skill 的快速自测, 支持（skill 里有对应的招）, 本轮硬验证 / 当前证据

### Community 39 - "Adapter authoring"
Cohesion: 0.33
Nodes (5): Adapter authoring, Check and exercise, Evidence available to you, JS interface, Optional references

### Community 40 - "Browser tools for agents"
Cohesion: 0.33
Nodes (5): Browser tools for agents, Native Chrome management, Network and scripts, Page targets and interaction, Scope and results

### Community 41 - "旅游"
Cohesion: 0.33
Nodes (5): ctrip, xiaohongshu, 旅游, 站点, 路由提示

### Community 42 - "OpenCLI"
Cohesion: 0.40
Nodes (4): Adapters and installation, Browser, OpenCLI, Results

### Community 43 - "Qwen Studio adapter audit"
Cohesion: 0.40
Nodes (4): Baseline, Prioritized implementation matrix, Qwen Studio adapter audit, Scope decisions

### Community 44 - "Qwen Conversation Continuation Implementation Plan"
Cohesion: 0.40
Nodes (4): Global Constraints, Qwen Conversation Continuation Implementation Plan, Review Focus, Task 1: Continue Qwen chats through `ask`

### Community 45 - "DeepSeek Chat Reliability and Acceptance Implementation Plan"
Cohesion: 0.50
Nodes (3): DeepSeek Chat Reliability and Acceptance Implementation Plan, Ownership, Scope and constraints

### Community 55 - "upload.test.js"
Cohesion: 0.17
Nodes (12): Architecture — deepseek-chat, ask flow, Modules, Read model, Tests, FIXTURE, readWithRetry(), resolveAttachment() (+4 more)

## Knowledge Gaps
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `qwenApiJson()` connect `ref_jackwener_opencli` to `Verification`, `qwen/ask.js`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `Deep Recon: evidence-first discovery for undocumented sites` be split into smaller, more focused modules?**
  _Cohesion score 0.05128205128205128 - nodes in this community are weakly interconnected._
- **Why does `Modules` connect `upload.test.js` to `deepseek/ask.js`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `Command reference — deepseek-chat` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `ref_jackwener_opencli` be split into smaller, more focused modules?**
  _Cohesion score 0.1349206349206349 - nodes in this community are weakly interconnected._
- **Should `Verification` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Should `Workflow: Codex with Qwen Studio` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._