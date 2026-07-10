# Figma to Code - Complete Setup

## Project Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Components**: `@/shared/components/ui/*`
- **Icons**: lucide-react
- **Forms**: react-hook-form + zod
- **Utilities**: class-variance-authority, clsx, tailwind-merge

## Figma MCP Tools Available

### get_design_context
Get full design context from a Figma node (LAYOUT, COLORS, TYPOGRAPHY, SPACING).

```
Parameters:
- nodeId: "123:456" (from Figma URL)
- artifactType: "REUSABLE_COMPONENT" | "COMPONENT_WITHIN_A_WEB_PAGE_OR_APP_SCREEN"
```

### get_metadata
Get only structure overview (IDs, types, names, positions). Use for exploring.

### get_screenshot
Get screenshot of the design.

### get_variable_defs
Get Figma Variables for colors/spacing tokens.

## Workflow

```
1. Open Figma → Select a FRAME/COMPONENT → Copy URL
2. In Cursor: "Generate code from this Figma design: [paste URL]"
3. AI calls get_design_context(nodeId)
4. AI generates React/Tailwind code using your UI components
5. Review and refine
```

## Design System Components

Available in `@/shared/components/ui/`:
- `Button` - variants: primary, secondary, outline, ghost, danger, success
- `Input` - variants: default, error; sizes: sm, md, lg
- `Badge` - variants: default, success, warning, error, info
- `Modal`
- `Card`
- `Avatar`
- `Select`
- `Checkbox`
- `Tabs`

## Design Best Practices for Figma

### MUST HAVE ✅
- **Auto Layout** on all frames
- **Figma Variables** for colors (semantic naming)
- **Component Properties** for variants

### AVOID ❌
- Frames without Auto Layout
- Hardcoded colors (use Variables)
- Grouped layers instead of components
