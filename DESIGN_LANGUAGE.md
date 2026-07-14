# Smart Learnly — UI Design System

> This is the canonical visual source of truth for Smart Learnly. Read it before proposing, generating, or changing any user-facing UI.

## Authority and change protocol

Use this priority order when instructions conflict:

1. The user's current request.
2. This document.
3. Existing shared components and global tokens.
4. The closest current reference page.
5. General UI libraries, external references, or AI suggestions.

Do not silently reinterpret the visual direction. If a requested screen needs a new pattern, explain the deviation before applying it across the product.

## Current visual direction

Smart Learnly is a simple, professional, content-first e-learning platform. The current direction is inspired by the clarity and density of established learning products such as Udemy, without copying their brand or layout pixel-for-pixel.

The interface should feel:

- Clear, familiar, and task-oriented.
- Flat and restrained, with white surfaces and quiet gray dividers.
- Dense enough for course and admin workflows, but still readable.
- Purple-led only for identity, selection, focus, and the main action.
- Specific to learning: courses, lessons, tests, flashcards, progress, classes, and publishing.

This is **not** a neo-brutalist interface. Do not reintroduce heavy black outlines, offset black shadows, button translation effects, colorful icon boxes, glassmorphism, decorative gradients, or floating visual effects.

## Foundations

### Typography

- Primary font: `Lato`, followed by the system sans-serif stack.
- `Instrument Serif` is legacy/editorial and should only remain where already intentionally used on public content.
- Page title: `28px`–`40px`, weight `700`–`800`, tight but readable tracking.
- Section heading: `20px`–`28px`, weight `700`–`800`.
- Body: `14px`–`16px`, weight `400`, line-height `1.5`–`1.65`.
- Labels and table headings: `11px`–`13px`, weight `600`–`800`.
- Do not use typography below `12px` for meaningful content.

### Canonical tokens

Use variables from `src/index.css`; do not duplicate raw colors in a component unless no semantic token exists.

| Purpose | Token | Current value |
| --- | --- | --- |
| Primary action / selection | `--primary` | `#5624d0` |
| Primary hover | `--primary-dark` | `#401b9c` |
| Main text | `--ink` | `#2d2f31` |
| Secondary text | `--muted` | `#6a6f73` |
| Standard divider | `--line` | `#d1d7dc` |
| Quiet surface | `--surface` | `#f7f9fa` |
| Soft purple state | `--sl-purple-soft` | `#f3f0fa` |
| Success | `--sl-success` | `#168c76` |
| Warning | `--sl-warning` | `#b76e00` |
| Danger | `--sl-danger` | `#b91c1c` |

Purple is an accent, not a page background. Do not introduce a competing blue primary.

### Geometry and elevation

- Buttons, inputs, tabs, and compact controls: `4px` radius.
- Standard cards and panels: `8px` radius.
- Pills: `999px`, only for statuses, short categories, or compact metadata.
- Normal border: `1px solid var(--line)`.
- Normal cards and panels: no shadow.
- Dropdowns, dialogs, and temporary overlays may use one soft shadow.
- Never use offset black shadows or hover transforms on standard controls.

### Spacing and content width

- Follow a 4px/8px spacing rhythm.
- Trainee content pages normally use a centered width around `1180px`.
- Dense admin list pages may use up to `1440px`.
- Desktop page gutter: `24px`–`48px`; mobile gutter: `14px`–`16px`.
- Prefer whitespace and dividers over nesting every section inside another card.

## Role-based application shells

### Trainee

- Trainees do not have an application sidebar.
- Keep the public/home header structure: logo, prominent course search, Categories, notification, and user control.
- Categories sits between search and notification and opens a dropdown.
- Do not add a second category navigation row below the header.
- Under the header, keep the welcome area and the horizontal trainee navigation: Dashboard, Progress, Course Catalog, My Tests, Flashcards.
- The active trainee destination uses text weight and a short underline, not a long full-width border.

### Admin, TMO, SME, and Trainer workspaces

- Use the application shell in `src/app/layouts/AppLayout.css`.
- Desktop sidebar is dark (`#1c1d1f`), `248px` expanded and `76px` collapsed.
- A collapsed sidebar temporarily expands above the content on hover or keyboard focus, then returns to collapsed state.
- Active navigation uses a subtle dark surface plus a thin purple indicator.
- Keep the top workspace header compact at about `56px`; it should not become a large decorative banner.
- Preserve the subtle layout grid background. Content surfaces remain white or transparent so the grid identity is not accidentally erased.
- Mobile uses a drawer/overlay instead of the desktop collapsed interaction.

## Component rules

### Buttons

- Reuse `Button` from `src/shared/components/ui`.
- One primary button per decision area: purple fill, white text, purple `1px` border.
- Secondary/outline buttons: white background, gray `1px` border.
- Destructive actions: restrained red text/border and explicit confirmation.
- Minimum interactive height: `44px`.
- Hover changes background, text, or border only. Do not translate the control or add an offset shadow.
- Disabled and loading states must be visibly and semantically disabled.

### Inputs, search, and filters

- Controls are normally `44px`–`48px` high with `1px` gray borders and `4px` radius.
- Use visible labels for forms. A placeholder is an example, not the only label.
- Focus uses a purple border and a subtle purple ring.
- Search and related filters should form one compact toolbar.
- On narrow screens, move filters to a drawer or stack them vertically; do not compress labels until they become unreadable.
- Debounce server-backed search and filter before pagination so results represent the full dataset.

### Tabs

- Use simple text tabs with a short `2px` active underline.
- Avoid large pill tabs for primary page navigation.
- Do not stretch the active underline across the entire container.

### Cards and panels

- A card must group one coherent task or information set.
- Use white background, `1px` divider, `8px` radius, normally no shadow.
- Avoid nested cards unless the inner surface represents a separate interaction.
- Prefer flat sections for headings and toolbar areas.

### Tables and management lists

- Desktop admin workflows should prefer a compact semantic table.
- Table headers use a quiet gray surface and short uppercase labels.
- Keep the identifying column first and row actions last.
- Keep independent concepts in independent columns; for example, Category and Level are separate.
- Put secondary actions in an overflow menu when the row becomes crowded.
- Filters must be applied on the server before pagination; never label a current-page-only count as a catalog total.
- On mobile, convert the table to labelled cards rather than forcing a page-wide horizontal scroll.

### Status and feedback

- Status badges are compact pills with subtle semantic backgrounds.
- Always include text; color alone must not communicate status.
- Loading, error, empty, and no-result states must explain what happened and the next useful action.
- Toasts confirm create, update, delete, enrollment, and other mutation results.

### Icons

- Use `lucide-react` only unless an existing brand asset is required.
- Standard icon size is `16px`–`20px`; use one consistent outline stroke style.
- Icon-only controls still need a `44px` target and an accessible name.
- Avoid emoji and decorative colored icon containers.

### Motion

- Use `150ms`–`250ms` transitions for hover, focus, menus, and sidebar state.
- Animate opacity or transform only when motion communicates state.
- Respect `prefers-reduced-motion`.
- Do not add looping decorative animation.

## Established page patterns

### Trainee Dashboard

- Center content at approximately `1180px`.
- Show a compact weekly streak/achievement summary before Continue Learning.
- Continue Learning is the primary learning-resumption area.
- Follow with useful next actions or recent learning, not decorative KPI walls.
- Reference: `src/features/dashboard/pages/TraineeDashboardPage.jsx` and `.css`.

### Trainee Progress

- Start with progress summary and a small set of meaningful metrics.
- Use clear course progress rows/cards and restrained status treatment.
- Charts or progress bars must include readable values, not color alone.
- Reference: `src/features/progress/TraineeProgressPage.css` and related components.

### Course Catalog

- Keep Search, Filters, sorting, and view controls in one toolbar on desktop.
- Keep category chips as a separate scannable row only when they help discovery.
- Do not show redundant result copy such as a duplicated “10 courses” line.
- Grid/list switching must preserve the same course data and filter state.
- Reference: `src/features/course/pages/CourseListPage.jsx` and `.css`.

### Admin Course Management

- Use one page title and one Create Course action.
- Toolbar: Search, Category, Level, Reset.
- Status selection: All, Draft, Published, Inactive as text tabs.
- Table columns: Course, Category, Level, Price, Status, Updated, Actions.
- Category and Level remain separate on desktop and in labelled mobile summaries.
- Search and filters are server-side before pagination.
- Reference: `src/features/admin/courses/pages/AdminCoursesPage.jsx` and `.css`.

## Responsive and accessibility requirements

- Review at `375px`, `768px`, `1024px`, and `1440px`.
- Do not introduce page-level horizontal scrolling on mobile.
- Maintain at least `44px` interactive targets and at least `8px` between separate targets.
- Keep a visible `:focus-visible` state.
- Use semantic headings, labels, buttons, links, tables, and `aria-live` only for meaningful dynamic updates.
- Normal text contrast should meet WCAG AA (`4.5:1`).
- Do not rely on hover for an essential action.

## Implementation workflow for humans and AI

Before changing UI:

1. Read this document and `AI-RULE-FE.md`.
2. Inspect the target JSX/CSS and the closest reference page listed above.
3. Identify the user role, primary task, primary action, and data source.
4. Preserve routes, permissions, APIs, and working behavior unless the request changes them.
5. Reuse shared primitives and semantic tokens.
6. Implement loading, error, empty, success, responsive, and keyboard states.
7. Run targeted ESLint and `npm run build`.

## Do / avoid

| Do | Avoid |
| --- | --- |
| Use flat white surfaces, gray dividers, and restrained purple accents | Reintroducing neo-brutalism, offset shadows, or button movement |
| Keep layouts familiar to real e-learning products | Copying another brand pixel-for-pixel |
| Use one clear primary action | Giving every action equal visual weight |
| Use semantic tokens and shared components | Creating page-specific button systems |
| Keep admin data dense and scannable | Turning every value into a colorful card or badge |
| Preserve the trainee/admin role distinction | Giving trainees an admin-style sidebar |
| Verify server filtering and pagination together | Filtering only the current page and presenting it as global data |

## Core source references

- `src/index.css` — global tokens and typography.
- `src/shared/components/ui/Button/Button.css` — canonical button behavior.
- `src/shared/components/ui/Input/Input.css` — canonical form-control behavior.
- `src/app/layouts/Header.css` — public and trainee header.
- `src/app/layouts/TraineeLayout.css` — trainee shell and navigation.
- `src/app/layouts/AppLayout.css` — admin/staff sidebar and workspace shell.
- `src/app/layouts/LayoutBackground.css` — shared grid background.
- `src/shared/components/Pagination.css` — shared pagination.
