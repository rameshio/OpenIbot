<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Code documentation must stay current

The project has a beginner-friendly code handbook at `docs/code/README.md`.
For every code change, update the relevant section in `docs/code/` in the same
task and add a dated entry to `docs/code/CHANGELOG.md`. Explain why the change
was needed, the behavior before and after, the affected files and functions,
the input-to-output code path, data/compatibility effects, and checks actually
performed. Write for a reader learning the project from scratch; define new
terms and distinguish implemented behavior from plans or unverified claims.

Follow `docs/code/15-maintenance.md`. Update `docs/code/14-file-reference.md`
when adding, removing, or renaming source files. Keep current explanations
accurate and preserve the dated change history. This requirement applies to
both active desktop code and retained web code. Preserve unrelated working-tree
changes and never put real credentials or private application data in examples.
