# Smart Learnly - Figma Design System

> **Source of Truth:** Đồng bộ 1-1 với `src/index.css`
> **Cập nhật:** Sync file này mỗi khi thay đổi CSS variables

---

## 🎨 1. Colors

### Core Palette

| Token Name | CSS Variable | Hex | RGB | Usage |
|------------|--------------|-----|-----|-------|
| `ink` | `--ink` | `#14213d` | `20, 33, 61` | Headings, primary text |
| `ink/secondary` | `--ink` 80% | - | - | Secondary text |
| `muted` | `--muted` | `#64708a` | `100, 112, 138` | Body, descriptions |
| `blue` | `--blue` | `#2768ee` | `39, 104, 238` | Primary actions, links |
| `blue-dark` | `--blue-dark` | `#1d4ed8` | `29, 78, 216` | Hover/active states |
| `blue-soft` | `--blue-soft` | `#edf4ff` | `237, 244, 255` | Tints, badges bg |
| `line` | `--line` | `#e7ecf4` | `231, 236, 244` | Borders, dividers |
| `surface` | `--surface` | `#f7f9fc` | `247, 249, 252` | Card backgrounds |
| `violet` | `--violet` | `#7559e8` | `117, 89, 232` | Accent, gradients |
| `teal` | `--teal` | `#11a99a` | `17, 169, 154` | Success accent |

### Semantic Colors (cho Badge, Toast)

| Semantic | Hex | Usage |
|----------|-----|-------|
| Success | `#11a99a` (teal) | Success badge, "Pass" status |
| Warning | `#f59e0b` | Warning state |
| Error | `#ef4444` | Error state, validation |
| Info | `#2768ee` (blue) | Info badge |

### Backgrounds

| Token | Hex | Notes |
|-------|-----|-------|
| `bg/page` | `#ffffff` | Page background |
| `bg/surface` | `#f7f9fc` | Card/section background |
| `bg/glass` | `rgba(255,255,255,0.7)` | Glassmorphism layer |
| `bg/blue-soft` | `#edf4ff` | Highlighted bg |

---

## 🔤 2. Typography

### Font Families

```css
/* Body / UI */
font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;

/* Headings accent (italic display) */
font-family: 'Instrument Serif', serif;  /* font-style: italic */

/* Marketing / Hero emphasis */
font-family: 'Manrope', sans-serif;  /* weight: 700-800 */
```

### Type Scale

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| `display/hero` | Instrument Serif (italic) | 64px / 4rem | 400 | 1.1 | -0.02em |
| `h1` | Manrope | 48px / 3rem | 800 | 1.15 | -0.01em |
| `h2` | Manrope | 36px / 2.25rem | 700 | 1.2 | -0.01em |
| `h3` | Manrope | 24px / 1.5rem | 700 | 1.3 | 0 |
| `h4` | DM Sans | 20px / 1.25rem | 600 | 1.4 | 0 |
| `body/lg` | DM Sans | 18px / 1.125rem | 400 | 1.6 | 0 |
| `body/base` | DM Sans | 16px / 1rem | 400 | 1.5 | 0 |
| `body/sm` | DM Sans | 14px / 0.875rem | 400 | 1.5 | 0 |
| `caption` | DM Sans | 12px / 0.75rem | 500 | 1.4 | 0.02em |
| `eyebrow` | DM Sans | 13px / 0.8125rem | 600 | 1.3 | 0.08em UPPERCASE |

---

## 📏 3. Spacing Scale

Dựa trên 4px base unit:

| Token | px | rem | Common usage |
|-------|----|----|--------------|
| `space/0` | 0 | 0 | Reset |
| `space/1` | 4 | 0.25 | Icon padding |
| `space/2` | 8 | 0.5 | Tight stack |
| `space/3` | 12 | 0.75 | Input padding |
| `space/4` | 16 | 1 | Default gap |
| `space/5` | 20 | 1.25 | Card padding |
| `space/6` | 24 | 1.5 | Section gap |
| `space/8` | 32 | 2 | Container gap |
| `space/10` | 40 | 2.5 | Section padding |
| `space/12` | 48 | 3 | Hero padding |
| `space/16` | 64 | 4 | Page section |
| `space/20` | 80 | 5 | Page section (lg) |

### Container widths

| Token | px | Usage |
|-------|----|----|
| `container/sm` | 640 | Mobile |
| `container/md` | 768 | Tablet |
| `container/lg` | 1024 | Desktop |
| `container/xl` | 1200 | Max content |
| `container/2xl` | 1320 | Wide |

---

## 🔲 4. Radius

| Token | px | Usage |
|-------|----|----|
| `radius/sm` | 10 | Buttons, inputs, badges |
| `radius/md` | 14 | Cards, modals |
| `radius/lg` | 18 | Hero cards, large cards |
| `radius/xl` | 24 | Section cards, hero glow |
| `radius/full` | 9999 | Avatars, pills |

---

## 🌑 5. Elevation (Island UI)

Box shadows theo 3 cấp độ:

### `island-1` - Subtle (cards, inputs default)
```css
0 1px 2px rgba(20, 33, 61, 0.04),
0 2px 4px rgba(20, 33, 61, 0.04);
```

### `island-2` - Floating (hover, dropdowns)
```css
0 4px 8px rgba(20, 33, 61, 0.06),
0 8px 16px rgba(20, 33, 61, 0.04);
```

### `island-3` - Modal (modals, popovers)
```css
0 8px 16px rgba(20, 33, 61, 0.08),
0 16px 32px rgba(20, 33, 61, 0.08);
```

### Special shadows
```css
/* Search button 3D tilt effect */
${centerX - x / 4}px ${centerY - y / 4}px 20px rgba(47, 104, 221, 0.4);

/* Hero glow */
.hero-glow {
  filter: blur(80px);
  opacity: 0.4;
}
```

---

## 🎭 6. Effects

### Glass
```css
background: rgba(255, 255, 255, 0.7);
border: 1px solid rgba(231, 236, 244, 0.6);
backdrop-filter: blur(12px);
```

### Gradients
```css
/* Hero gradient */
background: linear-gradient(135deg, #2768ee 0%, #7559e8 100%);

/* CTA gradient */
background: linear-gradient(135deg, #14213d 0%, #2768ee 100%);

/* Button primary */
background: linear-gradient(180deg, #2768ee 0%, #1d4ed8 100%);
```

---

## 🧩 7. Components (Figma Layer Structure)

### Button

```
🔘 Button
├── variant: primary | secondary | outline | ghost | danger | success
├── size: sm | md | lg
├── state: default | hover | active | disabled | loading
└── structure:
    Frame (Auto Layout H, gap 8, padding H16 V10)
    ├── Icon (optional, 16-20px)
    ├── Label (DM Sans 14-16px / 600)
    └── Icon-right (optional)
```

### Input

```
📝 Input
├── state: default | focus | error | disabled
├── variant: text | email | password | search
└── structure:
    Frame (V, gap 6)
    ├── Label (DM Sans 14/600)
    ├── Input field (H, padding H14 V10, radius 10, border 1px line)
    │   └── Placeholder text (muted)
    └── Helper text (caption, muted) | Error text (caption, error color)
```

### Card

```
🃏 Card
├── variant: elevated | outlined | filled
└── structure:
    Frame (V, gap 12, padding 20, radius 14, bg white)
    ├── Header (H, justify space-between)
    │   ├── Title (h3)
    │   └── Action (button-ghost)
    ├── Body
    └── Footer (optional)
```

### Badge

```
🏷️ Badge
├── variant: default | success | warning | error | info
└── structure:
    Frame (H, gap 4, padding H8 V4, radius 9999)
    ├── Dot (optional, 6px circle)
    └── Label (caption, uppercase, 12/600)
```

### Modal

```
🪟 Modal
├── size: sm | md | lg | full
└── structure:
    Overlay (rgba(20,33,61,0.5), backdrop-blur 4px)
    └── Dialog (V, radius 14, island-3, padding 24)
        ├── Header (H, justify between)
        │   ├── Title (h3)
        │   └── Close icon (X)
        ├── Body
        └── Footer (H, justify end, gap 8)
            ├── Button (ghost)
            └── Button (primary)
```

---

## 📐 8. Layout Patterns

### Landing Page (Hero pattern)

```
┌─────────────────────────────────────────────┐
│ Top Nav (Logo, links, CTA)                  │  height: 72px
├─────────────────────────────────────────────┤
│                                             │
│         Hero Section                        │
│         (centered, max-width 720)           │  padding: 96px 0
│         - Eyebrow                           │
│         - H1 (display)                      │
│         - Description                       │
│         - Search input                      │
│                                             │
├─────────────────────────────────────────────┤
│ Courses section (12-col grid)               │
├─────────────────────────────────────────────┤
│ Features grid (3-col)                       │
├─────────────────────────────────────────────┤
│ Steps grid (2-col: intro + steps)           │
├─────────────────────────────────────────────┤
│ CTA card (centered, gradient bg)            │
├─────────────────────────────────────────────┤
│ Footer (4-col links)                        │
└─────────────────────────────────────────────┘
```

### Dashboard Layout (AppLayout)

```
┌──────┬──────────────────────────────────────┐
│      │ Top header (search, notifications)   │  height: 64px
│      ├──────────────────────────────────────┤
│ Side │                                      │
│ bar  │  Main content (Outlet)               │
│ 240  │                                      │
│      │                                      │
└──────┴──────────────────────────────────────┘
```

### Card grid

```
12-column grid:
- Desktop: 3-4 cols per card
- Tablet: 2 cols
- Mobile: 1 col

Gap: 24px (space/6)
```

---

## 🎯 9. Iconography

Dùng **Lucide React** library (`lucide-react` package).

Sizes:
- `16` - Inline text icons
- `20` - Button icons
- `24` - Default UI
- `32+` - Feature cards

Stroke width: default (2)

---

## 🔄 10. Naming Convention cho Figma Layers

```
Section/Subsection/Component/Variant/State

Examples:
- Landing/Hero/HeroCopy/Default
- Landing/Hero/SearchInput/Default
- Landing/Features/FeatureCard/01-Default
- Dashboard/Sidebar/NavItem/Active
- Dashboard/Sidebar/NavItem/Hover
- Forms/Login/Input/Email-Focus
- Forms/Login/Button/Primary-Default
```

---

## ✅ 11. Checklist cho mỗi Component trong Figma

```
□ Auto Layout đúng (H/V) với gap & padding rõ ràng
□ Variables thay vì hardcoded values
□ Có variants cho states (default/hover/active/disabled)
□ Spacing tokens được dùng (không pixel ngẫu nhiên)
□ Typography dùng đúng font DM Sans / Manrope / Instrument Serif
□ Colors từ palette trên, không màu lạ
□ Radius từ scale (10/14/18/24)
□ Shadow từ island-1/2/3
□ Tên layer có ý nghĩa (Section/Component/Variant)
```

---

## 🔗 12. Sync Workflow

```
1. Update CSS variables in src/index.css
2. Update FIGMA_DESIGN_SYSTEM.md (this file)
3. Update Figma Variables (Local Variables trong Figma)
4. Update Figma components nếu tokens thay đổi
5. Update code components nếu cần
```

> **Rule:** CSS variables là Single Source of Truth.
> Figma Variables phải map 1-1 với CSS variables.