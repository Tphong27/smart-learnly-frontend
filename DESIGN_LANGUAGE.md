# Smart Learnly — Design Language Guide

> Read this before creating or changing any user-facing UI. The goal is a confident, practical learning product — not a generic SaaS dashboard and not an "AI-looking" interface.

## Product personality

Smart Learnly is an online learning platform for trainees, trainers, and training centers. Its visual voice should feel:

- **Clear and capable** — prioritise hierarchy, readable content and obvious actions.
- **Warmly energetic** — purple carries momentum; a small yellow accent can signal a highlight or milestone.
- **Tactile, not decorative** — thin ink borders and restrained offset shadows make important surfaces feel intentional.
- **Human and specific** — use real course, lesson and progress context instead of vague claims about AI, productivity, or millions of users.

Avoid glossy gradients, glassmorphism, excessive blur, floating blobs, generic illustration art, oversized feature lists, and animated decoration that does not explain content.

## Foundations

### Typography

- Primary typeface: `Lato`, then system sans-serif fallback.
- Display serif (only when it is already part of the page): `Instrument Serif`.
- Page titles use strong weight (`700`–`900`), tight tracking, and a compact line-height.
- Body copy is compact but comfortable: normally `14px`–`16px`, line-height `1.5`–`1.65`.
- Small labels / eyebrows use `10px`–`12px`, `700`–`900`, and modest uppercase letter spacing.

### Core tokens

Use the existing variables in `src/index.css` first. When a direct value is needed, these are the established visual anchors:

| Purpose | Token / value |
| --- | --- |
| Primary purple | `--primary` / `#825ef5` |
| Dark purple | `--primary-dark` / `#6d28d2` |
| Ink / main text | `--ink` / `#0f172a` |
| Supporting text | `--muted` / `#64708a` |
| Page surface | `--surface` / `#f7f9fc` or warm `#f8f7f4` |
| Standard line | `--line` / `#e4eaf4` |
| Warm highlight | `#f3c95b` or `#f8d568` |
| Success accent | `#168c76` |
| Tactile ink border | `#211b36` / near-black |

Purple is the main action and identity color. Do not introduce a competing blue primary in new screens.

### Radius and elevation

- Default soft UI radius: `10px`–`16px`.
- Important editorial cards / hero cards: `16px`–`20px`.
- Pills are reserved for status, category or compact metadata.
- For key cards and primary actions, use the project’s tactile treatment:

```css
border: 1.5px solid #211b36;
box-shadow: 3px 3px 0 #211b36;
```

- On hover, shift an interactive tactile surface `-1px` to `-2px` up/left and increase the offset shadow slightly.
- Do not apply a heavy black border and offset shadow to every minor control. Use it to establish hierarchy.

## Layout rules

### Public marketing pages

- Use a broad centered container (about `1180px` max-width) with generous but purposeful whitespace.
- Prefer asymmetrical grids: an expressive purple content block paired with a practical white card or image.
- Keep primary sections grounded in course discovery, study flow, trainer expertise, or measurable learning progress.

### Application pages

- Make the task title, context, and primary action visible immediately.
- Use a quiet page background and reserve white cards for grouped content or decisions.
- Keep controls aligned to an obvious grid. Use descriptive empty states and error messages.

### Authentication pages

Authentication uses a split editorial layout on desktop and a focused single-column layout on mobile:

- Left panel: solid purple, small ink-grid texture, concise learning-focused message, and a CSS-built learning preview. It should explain the product in one glance.
- Right panel: warm off-white background and a centered white form card.
- Form card: ink border, modest offset shadow, clear labels, and one unmistakable primary button.
- Mobile (`<= 900px`): hide the editorial panel, retain the logo and a `Back to home` link.
- Authentication pages are implemented through `src/features/auth/components/AuthCard.jsx` and `AuthCard.css`; extend that shared shell instead of creating a one-off layout.

## Components and interaction

### Buttons

- One primary action per decision area, using purple fill, white text, ink border, and small offset shadow.
- Secondary actions are white/very-light surfaces with a quiet border.
- Use verb-first labels: `Sign in`, `Create course`, `Continue learning`, `Save changes`.
- Never rely on color alone for meaning; loading, disabled, success, and error states need clear text or icon support.

### Forms

- Always show visible labels; placeholders are examples, not labels.
- Inputs are about `46px`–`48px` high, with a moderate rounded corner and a clear focus ring in purple.
- Provide field-level validation close to the relevant control.
- Keep password requirements compact; reveal them progressively while the user types.

### Cards

- A card must group a real decision or coherent information, not merely decorate a heading.
- Put the most important fact/action first.
- Use thumbnail, icon, badge, or color block only when it communicates category, status, or content type.
- Avoid nested cards unless the inner surface is a clearly separate task.

### Status and feedback

- Success: muted green surface and dark green text.
- Error: pale warm-red surface and dark red text.
- Informational state: pale purple surface and dark purple text.
- Keep feedback direct and actionable; avoid generic “Something went wrong” where a useful next step is known.

### Motion

- Use short transitions (`150ms`–`250ms`) for hover, focus and collapsible content.
- Motion should confirm an interaction, never compete with the learning content.
- Do not add looping decorative animation by default.

## Content style

- Prefer specific, plain-English copy: “Finish the next lesson” instead of “Unlock your potential.”
- Talk about courses, lessons, practice, progress, trainers, and training centers.
- Mention AI only where it is a real function and describe the result it provides.
- Avoid unsupported social proof and inflated marketing statements.

## Implementation conventions

- Reuse components from `src/shared/components/ui` before making a new primitive.
- Use `lucide-react` for icons; keep icons at a consistent stroke weight and avoid mixing icon libraries.
- Keep styles scoped with feature/page class names (for example, `.course-detail__...` or `.auth-...`).
- Check desktop, tablet, and mobile layouts before handing off a UI change.
- Preserve accessibility: semantic headings, button labels, visible focus states, form labels, and adequate contrast.

## Do / avoid checklist

| Do | Avoid |
| --- | --- |
| Use purple + ink + off-white as the base visual system | Adding a new blue gradient as the primary identity |
| Make one action visually dominant | Giving every button the same visual weight |
| Build compact, data-like previews from real learning concepts | Using generic AI art, robot imagery, or stock illustration |
| Use borders and offset shadows selectively | Turning every surface into neo-brutalism |
| Write specific, useful learning copy | Vague motivational or AI-hype copy |
| Design mobile as a deliberate simplified state | Shrinking desktop panels until they barely fit |

## Reference files

- `src/features/home/HomePage.jsx` — public homepage composition and product narrative.
- `src/features/course/pages/CourseDetailPage.jsx` and `CourseDetailPage.css` — purple hero cards, tactile sidecard, hierarchy, and interactions.
- `src/features/auth/components/AuthCard.jsx` and `AuthCard.css` — current auth shell and form treatment.
- `src/index.css` — global color, radius, and elevation variables.

