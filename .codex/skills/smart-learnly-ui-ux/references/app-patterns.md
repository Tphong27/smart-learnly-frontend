# App redesign patterns

Use these patterns with `../../../DESIGN_LANGUAGE.md`; they refine interaction and information architecture, not the visual identity.

## Sidebar

- Group navigation by user task, not by internal modules.
- Keep the active item unmistakable with a subtle active surface, a thin purple marker, and readable text contrast.
- Limit persistent items to the most frequent destinations; put low-frequency actions in a secondary group.
- Support a collapsed desktop state with tooltips and an accessible mobile drawer.
- Keep account/help/logout separate from task navigation.

## Admin dashboard

- Start with the most time-sensitive decision: alerts, pending review, at-risk classes, or actions requiring approval.
- Show 3–5 decision-oriented metrics, each with a useful comparison or status; avoid a wall of decorative KPI cards.
- Follow with one clear operational list/table and a short “what needs attention” panel.
- Let filters answer a real question. Persist useful filter state where the surrounding app already does.
- Use a compact data density on desktop and switch table rows to labelled stacked summaries on small screens.

## Forms and settings

- Split long forms into meaningful sections with short helper text.
- Put irreversible or destructive controls in a clearly separated danger area.
- Keep save/cancel actions visible after long sections when appropriate.
- Validate at the field and explain how to correct the problem.

## Tables and list pages

- Make the primary row action easy to scan and available by keyboard.
- Use badges for short statuses only; do not replace explanatory content with color pills.
- Offer empty, loading, error, and no-results states that tell users what to do next.
- On mobile, retain the identifying data, status, and primary action before secondary columns.

