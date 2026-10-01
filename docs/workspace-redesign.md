# Workspace design

The redesign modifies IBot's existing components and keeps its Next.js stack, lockfile, server provider adapters, bounded execution engine, task state, and session credential handling.

## Reference and original implementation

The user supplied [Rakazo](https://github.com/elie222/rakazo) as a product reference. Its public README, vision, and [product demonstration](https://rakazo.com/) informed the high-level pattern of navigation beside conversation beside a work panel. No Rakazo source code, assets, branding, or implementation was imported. IBot retains its own identity and implements this pattern around its existing model-based task engine.

## Implemented experience

- A task entry screen with a large composer, three editable starting prompts, role shortcuts, actual recent tasks, and a connection checklist.
- A compact sidebar with real task search, current execution status, and provider connection state.
- Conversation-first execution: Chat beside Team, Activity, and Files on wide screens; a work-panel drawer on smaller screens. Full Agents, Graph, and Files tabs remain available.
- Readable generated text: basic Markdown headings, lists, quotes, inline code and fenced code with copy. Model content stays text; embedded HTML is escaped and code is not executed.
- Follow-up attempts retain the previous task ID and expose the previous result and a navigation link. Each attempt still owns separate event IDs and streamed state. The existing bounded prior-result context is sent to the model.
- Task history with search and status filters. Team role templates open the manual builder; playbooks open editable task drafts. Live templates require tested exact models or the explicitly configured Auto default.
- Graphite surfaces, restrained warm accents, Geist, compact navigation and responsive layouts. Reduced-motion settings are preserved.

## Scope

The work panel shows actual model assignments, summaries, usage, and received files. It is not a remote computer. Browser operation, terminals, scheduled routines, persistent agent memory, and teaching by demonstration need separate execution infrastructure and remain unavailable. The Demo selector is explicit; live failures never produce sample output.

Provider settings and execution tests use synthetic responses when credentials are unavailable. Visual verification of Demo mode is not a live provider inference test.
