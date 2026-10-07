# 15 — Keep explanations beside future changes

## Required workflow

For every future code change in this repository, update the relevant handbook section and [CHANGELOG.md](CHANGELOG.md) in the same task. [AGENTS.md](../../AGENTS.md) gives future coding agents this requirement. Human contributors should follow it too. This is a contributor rule, not an automatic watcher: Markdown does not observe edits, and this task does not install a scheduler or enforcement hook.

The handbook describes how the current implementation works. The change log records how it became that way. Preserve meaningful dated entries; revise current explanations instead of appending contradictory descriptions to them.

## What to explain each time

1. **Reason:** the concrete problem or requested capability.
2. **Before and after:** what happened previously and what happens now, with a small example.
3. **Source:** exact changed files and important functions/components.
4. **Code path:** where input enters, which layer handles it, what data changes, and how output reaches the person.
5. **Data/compatibility:** saved fields, migrations/defaults, existing profiles, ongoing runs, and restart behavior where applicable.
6. **Verification:** commands/checks actually performed and results; list skips or unverified paths explicitly.
7. **Limitations:** concrete remaining issues or prerequisites, without speculative claims.

Explain new terms simply. Do not paste entire source files into documentation or include credentials/private profile data. Use a short real snippet when it clarifies behavior and state when an example is illustrative.

## Guide selection

| Changed area | Update |
|---|---|
| Startup, IPC, application layers | 02; 03 or 07 when contracts/policy change |
| Saved types, state, recovery | 03 |
| Screens, styles, navigation | 04; 11 for avatars/voice |
| Chat, routing, delegation | 05 |
| Provider catalog/API | 06 |
| Tool schema, dispatcher, policy, journal, verifier | 07; relevant runtime/connector guide |
| Docker, files, commands, egress | 08 |
| Memory, skill, routine | 09 |
| MCP/authentication/classification | 10 |
| Build, tests, package commands | 12 |
| Retained Next.js code | 13 |
| Add/remove/rename a source file | 14 and its relevant guide |

Every code task also gets a change-log entry. If existing prose remains exactly accurate, record that the relevant guide was reviewed and why no behavioral rewrite was needed; update its relevant file reference or explanatory detail when appropriate. Documentation-only changes can have a documentation entry without pretending runtime behavior changed.

## Copyable change-log entry

```markdown
## YYYY-MM-DD — Short concrete title

Status: implemented / documentation only / partial (explain).

Reason: ...

Before: ...

After: ...

Files and code: `path/to/file.ts` — `functionName` now ...

How it works: input ... → handler ... → saved/output data ... → screen ...

Documentation: [relevant guide](guide.md), file reference if needed.

Verification: exact commands/checks actually run, outcomes, and skips.

Compatibility and remaining limits: ...

Commit: include a real commit ID if one exists; otherwise say working tree.
```

Use the contributor's local date/time context. Do not invent a commit ID or attach prior test results to a new change.

## Worked example (illustrative, not a completed change)

If a future edit adds a confirmation before deleting a routine, explain that previously clicking delete removed it immediately and now a dialog collects confirmation. Identify the routine UI component and `routine.delete` handler, say whether saved data changes, show the click-to-command path, and record the actual dialog/engine checks. Update 04 and 09 plus the log. The example does not say that this feature exists today.

## Completion check

Before handing over work, confirm source links exist, examples match implementation, added files have entries, and each behavior claim has source or test support. Say what changed and where its explanation lives. A documentation requirement is only useful when the next person can find and understand the result.
