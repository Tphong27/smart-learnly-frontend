---
name: smart-learnly-ui-ux
description: Redesign, review, or implement Smart Learnly pages and components while preserving the project's established design language. Use for requests involving the homepage, course pages, authentication, sidebars, admin dashboards, forms, tables, navigation, cards, or responsive UI; also use when asked for design suggestions, UX audits, or UI implementation in this repository.
---

# Smart Learnly UI/UX

## Required context

1. Read `../../../DESIGN_LANGUAGE.md` in full before making a design decision. It is the source of truth for visual direction.
2. Inspect the target component plus its CSS and the closest existing reference screen before proposing a change.
3. If an environment provides a `ui-ux-pro-max` skill, use it after loading the design language. Apply its UX and accessibility guidance only when it does not conflict with `DESIGN_LANGUAGE.md`.
4. Read `references/app-patterns.md` for sidebar, dashboard, data-table, and responsive guidance.

## Redesign workflow

### 1. Establish the job

- Identify the user role, the primary task, the main action, and the information needed to make that action.
- Preserve working behaviour, routes, permissions, APIs, and state unless the user explicitly asks to change them.
- Treat the project design language as a hard constraint; treat UI/UX patterns as tools, not as a replacement visual identity.

### 2. Diagnose before designing

State the following concisely when the user asks for suggestions or a review:

- The 2–4 highest-impact usability or hierarchy problems.
- The proposed structure and the reason it makes the main task easier.
- The Smart Learnly patterns retained (purple/ink/off-white, selective tactile emphasis, concrete learning context).
- Mobile and accessibility considerations.

Do not create a redesign based only on a component name when the source can be inspected.

### 3. Compose the solution

- Make one action visually primary in each decision area.
- Prefer real learning, course, class, assessment, or admin data over decorative UI.
- Use a quiet background and group only meaningful content in cards.
- Apply ink borders and offset shadows to hero cards, key actions, and important decisions selectively; do not make every surface heavy.
- Keep spacing, type scale, icon style, focus states, error states, loading states, and responsive behaviour consistent with existing shared components.
- Reuse `src/shared/components/ui` and `lucide-react` before introducing a new primitive or icon library.

### 4. Implement or hand off

- For a request to **suggest/review**, do not modify files. Give a concrete hierarchy or wireframe-level proposal and an implementation order.
- For a request to **redesign/build**, implement the agreed direction in the closest feature-scoped files; avoid unrelated changes.
- Verify the affected area at desktop, tablet, and mobile widths. Run the narrowest relevant lint/build checks.

## Decision rules

- Do not add generic AI art, robots, productivity clichés, unsupported social proof, glossy gradients, or decorative motion.
- Do not use a blue primary for new work; purple is the product action color.
- Do not hide labels behind placeholders or rely on color alone for status.
- Do not solve dense admin UI by putting every metric in a card. Prioritize decisions, exceptions, and next actions.
- Prefer progressive disclosure over a long one-screen form or sidebar.

## Output format for design suggestions

Use this compact structure unless the user requests another format:

1. **What changes:** proposed hierarchy and interactions.
2. **Why it works:** user/task rationale and project-style fit.
3. **Responsive/accessibility:** key behaviour below tablet/mobile and keyboard/screen-reader considerations.
4. **Implementation scope:** files/components likely to change.

