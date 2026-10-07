# Research-backed decisions for IBot

Reviewed October 2, 2026. These are engineering choices for this repository, not claims that IBot reproduces a paper's complete system or published benchmark results.

## Recommended approach

Keep a trusted host policy boundary, narrow agent execution privileges, scoped local notes, deterministic user routing, and explicit evidence/reconciliation gates. Improve those boundaries and measure retrieval before adding a graph database, another autonomous memory writer, or more agents. This recommendation follows the current source and migration cost; it is not a universal ranking of memory architectures.

| Primary research reviewed | Relevant finding | Decision for IBot |
| --- | --- | --- |
| [CaMeL: Defeating Prompt Injections by Design](https://arxiv.org/html/2503.18813v2), especially §5 and §9 | Control/data separation and capability enforcement protect tool actions; a second model alone does not enforce permitted data flow. User fatigue and side channels remain concerns. | Keep host authorization and scoped grants. Mark retrieved reference notes untrusted before a model can act on them. Our chat-level guard is a conservative approximation, not the paper's interpreter/proven guarantees. |
| [LongMemEval](https://arxiv.org/html/2410.10813v2), §4–5 | Memory quality depends separately on stored granularity, indexing, temporal retrieval and reading; compressed facts can lose needed details. | Preserve editable source notes; retrieve small original-text chunks with provenance and revision timestamps. Test missing evidence and historical updates. FTS5 is a practical local baseline; the paper's dense-retrieval results do not establish its superiority here. |
| [Lost in the Middle](https://arxiv.org/html/2307.03172v3) | Tested models were sensitive to where relevant evidence occurs in long contexts. | Use bounded relevant retrieval instead of filling prompts with unrelated notes. The experiments do not prove the same effect size for today's selected models. |
| [MemGPT](https://arxiv.org/abs/2310.08560), abstract reviewed | Hierarchical memory moves information between limited context and external storage. | Retain a short core preference field plus searchable external notes; keep writes behind authorization. Do not import an autonomous paging framework merely to obtain retrieval. |
| [LongMemEval-V2](https://arxiv.org/abs/2605.12493), abstract reviewed; work in progress | Evaluates environment experience, workflows, changing state, gotchas and premise awareness; stronger coding-agent retrieval has latency costs. | Add workflow/missing-premise retrieval regressions. Evaluate actual recorded desktop trajectories before adding sandboxed coding-agent memory retrieval. |
| [Why Do Multi-Agent LLM Systems Fail?](https://arxiv.org/abs/2503.13657), abstract reviewed | Failure taxonomy includes system design, inter-agent alignment and task verification. | Preserve bounded delegation, explicit routing, one bot owner and failure-blocking review. More specialists are not a substitute for clear handoffs and completion checks. |
| [AgentDojo](https://arxiv.org/abs/2406.13352), abstract reviewed | Provides an environment for testing tool agents under injection attacks, including realistic tasks and adaptable attack/defense cases. | Keep adversarial persistence/approval tests and expand transport-specific attacks. Our offline regressions are not an AgentDojo evaluation or proof against adaptive attacks. |

## Implemented in this follow-up

`desktop/memory.ts` now indexes overlapping chunks of at most 1,600 characters (200-character overlap). SQLite ranks only records visible in the requested scope and valid at the requested ISO timestamp. Current retrieval excludes superseded revisions; explicit `asOf` retrieves the historical valid revision. Results include note IDs, chunk indices, origin, validity timestamps and the selected original text. Timestamps represent note revisions, not independently verified real-world fact validity.

No-match and empty-query retrieval return empty evidence. Invalid/non-finite budgets cannot disable the size bound. Unrelated notes are not used as fallback. A relevant chunk can fit where its whole source note previously exceeded the prompt budget. Character/token estimates remain heuristic. Lexical ranking is not semantic search; paraphrases can still miss evidence.

`search_memory` accepts an optional ISO `asOf`. Automatically retrieved notes taint the chat before the first model-controlled effect, closing the gap where injected notes previously entered the system prompt without activating the persistence guard. Host classification remains independent of model-generated descriptions.

## Evidence and limitations

`npm run eval:memory` runs ten synthetic, deterministic retrieval checks with isolated temporary files and no model/provider calls. The same harness against `ace4345` passed **5/10**; current retrieval passed **10/10**. The improved cases are historical revision, missing evidence, long note, invalid budget and unsupported premise. This checks retrieved evidence and budget behavior; it does not measure generated-answer accuracy, semantic recall, latency under a large corpus or published benchmark performance.

The harness is also part of `npm test` through `tests-desktop/memory-evaluation.test.ts`. Regression coverage includes scope filtering, temporal validity, provenance, manual edits, deletion and the note-to-write authorization transition. No new dependencies or model costs were introduced. The index remains derived from Markdown/revision files; existing source notes migrate without rewriting their content.

Next, close host provider/MCP egress and browser-session authority gaps, add orphan-run supervision, and measure realistic recall with licensed, representative trajectories. A vector or graph retriever should be adopted only after it improves held-out recall under the same privacy, cost and latency constraints. Automatic consolidation and model-written summaries still need provenance, review and deletion guarantees.
