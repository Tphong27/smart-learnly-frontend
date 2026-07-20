---
name: smart-learnly-ui-ux
description: Review, design, or implement Smart Learnly web UI while preserving its current design system, role-specific layouts, shared components, accessibility, and responsive behavior. Use for homepage, trainee, course, authentication, sidebar, admin dashboard, form, table, filter, navigation, card, or visual consistency work in this repository.
---

# Smart Learnly UI/UX

## Required context

1. Read `../../../DESIGN_LANGUAGE.md` in full. It is the canonical visual and interaction source of truth.
2. Read `../../../AI-RULE-FE.md` for frontend implementation constraints.
3. Inspect the target JSX/CSS and the closest reference screen listed in the design language.
4. Read `references/app-patterns.md` when the task involves a sidebar, dashboard, form, table, or responsive list.
5. Use an available general UI/UX skill only for accessibility and usability guidance that does not conflict with the project design language.

## Workflow

1. Identify the user role, primary task, primary action, required data, and current behavior.
2. Preserve routes, permissions, APIs, state, and working interactions unless the user explicitly changes them.
3. For a review or wireframe request, state the highest-impact problems and propose a concrete hierarchy before editing.
4. For an implementation request, work in the closest feature-scoped files and reuse shared UI primitives.
5. Cover loading, error, empty, no-result, disabled, keyboard, and responsive states.
6. Verify desktop, tablet, and mobile behavior. Run targeted ESLint and `npm run build`.

## Guardrails

- Treat the current simple, flat e-learning direction as a hard constraint.
- Do not reintroduce neo-brutalism, offset black shadows, hover translation, decorative gradients, glassmorphism, emoji icons, or colorful icon containers.
- Keep purple as a restrained identity/action accent; do not introduce a competing blue primary.
- Keep trainee and admin/staff shells distinct as documented.
- Use one primary action per decision area.
- Use server-backed filtering before pagination for catalog and admin lists.
- Reuse `src/shared/components/ui`, semantic tokens, and `lucide-react` before creating new primitives.
- Do not solve dense admin screens by turning every value into a card or badge.

## Output for design suggestions

Use this structure unless the user asks for another format:

1. What changes: hierarchy and interactions.
2. Why it works: task and design-system rationale.
3. Responsive/accessibility: mobile, keyboard, and screen-reader behavior.
4. Implementation scope: files and data contracts likely to change.

