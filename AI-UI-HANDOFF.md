# Smart Learnly — AI UI Handoff

Use this file when moving UI work to a new AI conversation or a different AI tool.

## Paste this prompt

```text
You are working in the Smart Learnly frontend repository.

Before making any UI decision or editing code:
1. Read AGENTS.md.
2. Read DESIGN_LANGUAGE.md in full; it is the canonical design source of truth.
3. Read AI-RULE-FE.md.
4. Inspect the target JSX/CSS and the closest reference page listed in DESIGN_LANGUAGE.md.
5. Check git status and preserve unrelated existing changes.

Current direction: simple, flat, professional e-learning UI inspired by established products such as Udemy, without copying them. Use Lato, white surfaces, gray 1px borders, 4px controls, 8px cards, restrained purple accents, Lucide icons, 44px targets, and subtle 150–250ms state transitions. Do not use neo-brutalism, offset black shadows, hover translation, decorative gradients, glassmorphism, emoji icons, or colorful icon boxes.

Preserve role layouts:
- Trainee: home-style header, no sidebar, search + Categories + notification + user, welcome area, horizontal trainee navigation.
- Admin/staff: compact header, dark collapsible sidebar that previews on hover/focus, and the existing subtle grid background.

Do not change routes, permissions, API contracts, or working behavior unless the task explicitly requires it. For API lists, verify filters operate before pagination. Reuse shared UI components. Implement loading, error, empty, responsive, and keyboard states. Run targeted ESLint and npm run build.

Task: [PASTE THE NEW TASK HERE]
```

## Include this context when work is unfinished

- Goal and chosen wireframe/option.
- Files already changed.
- Behavior that must remain unchanged.
- API endpoints and response fields involved.
- Verification already run and remaining failures.
- Screenshots or reference images, when relevant.

## Handoff template

```text
Goal:
Chosen design direction:
Completed:
Remaining:
Files changed:
API/data assumptions:
Known issues:
Checks run:
Reference image or page:
```

Do not paste secrets, tokens, `.env` values, or user data into a handoff.
