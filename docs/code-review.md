# Code Review

Perform code review in two passes, ordered by priority.

## Pass 1 — Uncommitted Changes (HIGH priority)

Run `git diff` (and `git diff --cached` for staged changes) to collect the
full working-tree delta. Review **every hunk** against the checklist below.

For each finding, reference the exact file and line range in the diff and
classify severity as **critical**, **warning**, or **nit**.

### Checklist for uncommitted changes

1. **Correctness** — logic errors, off-by-one, wrong variable, missing
   edge cases.
2. **Type safety** — `any` usage, unsafe casts, missing null checks
   (project enforces `strict: true`).
3. **Security** — injection vectors, unsanitized user input, hardcoded
   secrets, OWASP Top 10 concerns.
4. **Consistency** — naming conventions, code style, and patterns that
   diverge from surrounding code or project conventions.
5. **Test coverage** — new logic paths that lack corresponding tests
   (when a test framework is configured). Every source file must
   maintain a minimum of **80% coverage per cell** (statements,
   branches, functions, lines) in both vitest unit/integration
   coverage and Playwright e2e coverage (Istanbul). If a change
   causes any file to drop below 80% in any cell, add tests to
   restore coverage before merging.
6. **Dead code** — unreachable branches, unused imports, leftover
   debug artifacts.
7. **Performance** — unnecessary allocations in hot paths, missing
   cleanup of listeners/timers, DOM thrashing.
8. **Accessibility** — missing ARIA attributes, unlabelled interactive
   elements, broken keyboard navigation.
9. **Asset paths** — must be relative (no absolute root paths) to
   support the `/flag-maker/` GitHub Pages deployment.
10. **No emoji** — all `.md` files, code comments, and UI strings
    must be free of emoji characters. Remove any emoji found and
    replace with plain text equivalents or remove entirely.
11. **UI style guide compliance** — any change that adds or modifies a
    UI element (layout, component, styling, theming, interaction
    behavior) must conform to `docs/ui-style-guide.md`.
    Verify colors, spacing, z-index, responsive behavior, and
    interaction constraints (no scrollbars, no text selection, no
    mobile swiping) match the style guide. The rightbar (Dynamic
    Tools) must always be visible, floating, dynamic, and contextual
    -- never hidden by default. Flag deviations as **warning** or
    **critical** depending on visual/functional impact.
12. **Clean code** — Code must conform to the principles established
    by Uncle Bob (Robert Cecil Martin) in his eponymous work
    'Clean Code: A Handbook of Agile Software Craftsmanship 2nd Edition'
13. **Problems & quality gate** — after reviewing the diff, check the
    VS Code Problems tab for compile/lint errors and fix any issues
    found, then run `npm run quality` (quick gate) to confirm the
    changes pass. For changes affecting UI rendering or layout, also
    run `npm run quality:full` (includes Playwright e2e tests).
    Playwright tests must always run headless.
14. **Auto-fix** — after reporting findings, automatically fix all
    critical and warning issues in-place. Apply fixes directly to the
    source files, re-run the quality gate, and confirm everything
    passes before presenting the final review summary.

Summarize Pass 1 with a table: `| File | Line(s) | Severity | Finding |`.

## Pass 2 — Broader Codebase (LOW priority)

Only after Pass 1 is delivered, scan the wider codebase for systemic issues:

- Patterns that conflict with the project's `AGENTS.md` conventions.
- Repeated anti-patterns across multiple files.
- Stale TODO/FIXME comments with no tracking issue.
- Missing or outdated documentation.

Keep Pass 2 brief — list top findings only, no exhaustive file-by-file
walkthrough.

## Output format

Present results as:

1. **Pass 1 summary table** (uncommitted changes).
2. **Pass 1 detailed notes** — grouped by file, with code snippets where
   helpful.
3. **Pass 2 highlights** — bullet list of broader observations (if any).
4. **Suggested next steps** — concrete actions ranked by impact.
