# Codex project instructions

## Project

This repository contains a personal, local-first task manager delivered as a responsive Web/PWA application. The MVP is single-user, requires no login, and stores task data locally.

## Source of truth

Read the relevant files in `docs/` before changing product behavior:

- `docs/01-product-brief.md` defines product goals and non-goals.
- `docs/02-mvp-requirements.md` defines scoped requirements and IDs.
- `docs/03-user-flow-and-pages.md` defines navigation and interactions.
- `docs/04-data-model.md` defines persistent entities and domain rules.
- `docs/05-technical-design.md` defines architecture and quality gates.
- `docs/06-acceptance-tests.md` defines release acceptance scenarios.
- `docs/decision-log.md` records durable product and technical decisions.

If implementation and documentation disagree, stop and surface the conflict. Do not silently choose one.

## Working rules

1. Implement one requirement or one tightly related vertical slice at a time.
2. State the requirement ID in the task plan and handoff.
3. Do not expand scope or add speculative features.
4. Preserve user changes and unrelated work already present in the worktree.
5. Prefer small, reviewable changes over broad rewrites.
6. Reuse existing patterns before adding dependencies or abstractions.
7. Do not commit, push, deploy, or publish unless the user explicitly requests it.

## Product constraints

- Keep quick task capture friction low; only the title is required at creation.
- Keep `plannedDate` and `deadline` as separate concepts.
- Model importance and urgency as separate nullable dimensions, not ordinary tags.
- Derive Eisenhower quadrants from `importance` and `urgency`; do not persist a duplicate quadrant field.
- Keep custom tags separate from system importance/urgency classification.
- Treat Inbox, Today, Upcoming, project, tag, and Completed pages as derived views over one task record.
- Keep the MVP local-first; do not add authentication, cloud sync, collaboration, recurrence, reminders, or AI planning without an approved scope change.

## Architecture constraints

- UI components must not access Dexie tables directly.
- Put domain rules in testable domain functions or application services.
- Access persistence through repository interfaces and adapters.
- Store local calendar dates as `YYYY-MM-DD`; store event timestamps as UTC ISO 8601.
- Use transactions for multi-table writes, migrations, and backup restore.
- Render user-authored notes as text; do not execute imported HTML.

## Quality requirements

For every behavioral change:

1. Add or update the smallest relevant automated tests.
2. Run formatting/linting, type checking, unit tests, and the production build when those scripts exist.
3. Run the relevant acceptance or browser flow for user-visible changes.
4. Report commands run, results, and any unverified behavior.

A task is not complete merely because the UI renders. Persistence, refresh behavior, failure states, and the linked acceptance criteria must also work.

## Documentation changes

- A P0 scope change must update requirements and acceptance tests.
- A persistent field change must update the data model, migration, and tests.
- A navigation or interaction change must update the user-flow document.
- A durable architectural decision must be added to the decision log.

## Git conventions

- Use focused branches such as `feat/mvp-001-quick-add` or `fix/backup-restore-rollback`.
- Use Conventional Commit-style messages, for example `feat: implement quick task creation`.
- Before proposing a commit, review `git status` and the complete diff.
- Never commit `.env`, credentials, tokens, exported user backups, build output, or dependency directories.
