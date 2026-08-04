# AGENTS.md — Smart Learnly Frontend

This file gives AI coding agents the minimum context and rules required before changing this repository.

## Required shared organization rules

Before reorganizing, refactoring, renaming, moving, or deleting frontend code,
read `../AI_CODE_ORGANIZATION_RULES.md` in full. Its simplicity, dead-code
evidence, small-batch, and verification rules are mandatory in addition to this
file. In particular, do not split one screen into many trivial files, and do
not delete dynamically loaded routes or assets based only on static imports.

If the repository is opened without the parent workspace, these core rules
still apply:

- Preserve behavior and separate structural refactors from feature changes.
- Prefer the fewest files, functions, layers, components, hooks, and
  abstractions that keep each responsibility clear.
- Keep a tiny one-use component or one-to-three-line helper inline unless it
  represents a meaningful reusable UI or business rule.
- Extract code only for reuse, meaningful state/effects, a distinct
  responsibility, independent testing, or materially clearer flow.
- Do not add pass-through components, hooks, services, managers, or utilities
  with no independent responsibility.
- Before deleting code, check imports, lazy routes, dynamic assets, scripts,
  tests, mocks, docs, environment configuration, and backend API contracts.
  Report uncertain candidates instead of deleting them.
- Never delete uploads, secrets, deployment files, public routes, or unrelated
  working-tree changes automatically.
- Refactor one bounded feature at a time, then run targeted ESLint and
  `npm run build`.
- Use explicit feature role folders: `pages`, `components`, `hooks`,
  `services`, `utils`, and feature-owned styles. Business API services belong
  in `features/<domain>/services`; only shared API infrastructure such as
  `api-client` remains in top-level `services`.
- Add a concise Vietnamese documentation comment above every named production
  function, React component, and custom hook. Business functions explain
  purpose and important rules; trivial helpers need one sentence. Anonymous
  callbacks do not need comments unless their behavior is non-obvious. Apply
  this to every production file created or materially edited in the task.

## Repository responsibility

This repository contains the frontend application for Smart Learnly Platform (SLP).

The frontend is responsible for:

- Page routing.
- Screen implementation.
- Role-based navigation visibility.
- Form UX and client-side validation.
- API integration with the backend.
- Learning workspace UI.
- Course catalog and enrollment UI.
- Trainer, SME, TMO, Admin workspaces.
- Dashboard and reporting visualization.
- Loading, empty, error, and unauthorized states.

The frontend is not responsible for:

- Database schema.
- Backend authorization enforcement.
- Payment verification.
- AI prompt execution.
- RAG ingestion logic.
- Server-side audit logging.

## Current technical baseline

Known baseline:

- React.
- Vite.
- ESLint.
- JavaScript/JSX unless the team later migrates to TypeScript.

Use the repository's actual `package.json` as the source of truth before adding libraries.

## UI design source of truth

Before reviewing, proposing, generating, or changing user-facing UI:

1. Read `DESIGN_LANGUAGE.md` in full. It is the canonical visual and interaction specification.
2. Read `AI-RULE-FE.md` for implementation constraints.
3. Inspect the target component, its CSS, and the closest reference page named in `DESIGN_LANGUAGE.md`.
4. Use `AI-UI-HANDOFF.md` when transferring unfinished UI work to another AI.

The current product direction is a simple, flat, Udemy-inspired e-learning interface. Do not reintroduce neo-brutalism, offset black shadows, hover translation, decorative gradients, glass effects, or colorful icon boxes unless the user explicitly changes the design direction.

## Product truth rules

Do not invent screens or business flows. Use project documents as the authority:

- SRS defines scenarios and feature behavior.
- Screen Design Specification defines page IDs, site map, navigation, and screen flows.
- RTW/Permission Matrix defines feature/action access where available.
- Backend API contracts define request and response shapes.

If UI and backend behavior conflict, stop and ask for clarification.

## Frontend implementation rules

1. Keep screens aligned with Screen Design page IDs when possible.
2. Do not hardcode fake business behavior as final logic.
3. Put mock data in clearly named mock files only.
4. Do not expose secrets in frontend environment variables.
5. Treat frontend role-based hiding as UX only; backend remains the authority.
6. Always implement loading, empty, error, and unauthorized states for API-driven screens.
7. Avoid creating one huge component. Split by page, section, and reusable component.
8. Keep API calls centralized in service/client files.
9. Do not duplicate backend validation rules blindly; mirror only user-friendly checks.
10. Do not display AI-generated draft feedback or generated content as official unless backend status says it is approved/published.

## Definition of done for frontend tasks

A frontend task is not done until:

- The route or component builds.
- The screen has loading, error, empty, and success handling where applicable.
- The UI respects role visibility.
- API request/response assumptions are documented.
- Forms prevent obvious invalid input before submission.
- No secrets are committed.
- No unrelated visual redesign is introduced.
