# Flag Maker — UI Style Guide

This document defines the visual layout, interaction rules, and design constraints for the Flag Maker application UI. All UI implementation must follow these rules. Reference the attached screenshot of [Flag Creator](https://flag-creator.com/) as a visual benchmark for layout proportions and dark-theme styling.

---

## Global Layout

The app uses a **fixed full-viewport layout** with four sections arranged in a single screen — no global scrolling (individual section scrolling is still permitted), no overflow, no content extending beyond the viewport on any axis.

```text
┌──────────────────────────────────────────────────────┐
│               Application Settings (topbar)          │
├─────────┬─────────────────────────────────────┬──────┤
│         │                                     │ Dyn. │
│  Flag   │           Flag Canvas               │Tools │
│ Editor  │        (centered, dynamic)          │(right│
│(leftbar)│                                     │ bar) │
│         │                                     │      │
│         │           ┌──────────────┐          │      │
│         │           │ Zoom Level   │          │      │
│         │           │  (botbar)    │          │      │
│         │           └──────────────┘          │      │
├─────────┴─────────────────────────────────────┴──────┤
```

All five sections — Application Settings (topbar), Flag Editor (leftbar), Flag Canvas, Zoom Level (botbar), and Dynamic Tools (rightbar) — are **position-fixed or fit within a fixed flex/grid layout** so nothing ever scrolls (individual section scrolling is still permitted). The Zoom Level (botbar) floats over the canvas area near the bottom center. The Dynamic Tools (rightbar) is always visible, floating at the right edge. Its contents are dynamic and contextual -- tool buttons appear and change based on the current editing context.

---

## 1. Application Settings (topbar)

- **Style:** Windows 11–inspired — clean, minimal, flat, with subtle backdrop blur.
- **Height:** Compact fixed height (~40–48px). Must not grow or shrink.
- **Background:** Dark (near-black, e.g. `#1e1e2e` or similar) in dark mode; light (white/near-white) in light mode.
- **Contents (left to right):**
  - App name / logo: "Flag Maker" in a clean sans-serif font.
  - Spacer (flex-grow).
  - Global action buttons (icon + optional label): Dark/Light mode toggle, Reset, Save, Export (SVG/PNG dropdown).
- **Button style:** Small, pill-shaped or rounded-rect buttons with subtle hover highlights. Icons preferred over text where meaning is clear.
- **Responsive:** On small screens, button labels collapse to icon-only. App name may shorten to an icon/logo.

---

## 2. Flag Editor (leftbar)

- **Position:** Fixed left edge, full height below the topbar.
- **Width:** ~200–240px on desktop. On mobile/tablet landscape, collapses to an icon-only strip (~48px) with a slide-out panel on tap.
- **Background:** Same dark/light theme as the topbar, slightly differentiated (e.g. 1–2 shades lighter/darker).
- **Contents:** Vertically stacked sections for current flag editing options:
  - **Aspect Ratio selector** — list of common ratios (1:1, 2:3, 3:5, 10:19, etc.) with a "Custom" option for manual width/height input. Selecting a ratio immediately updates the flag canvas proportions.
  - **Stripe / Division controls** — stripe count, orientation, color pickers for each stripe.
  - **Overlay controls** — add/edit overlays (shapes, symbols, emblems). Each overlay gets a mini row with visibility toggle, lock, delete.
  - **Template picker** — grid or list of template thumbnails (Per Pale, Per Fess, Nordic Cross, etc.).
  - **Symbol browser** — searchable grid of symbols/emblems. Categories as filter tabs.
- **Scrolling within leftbar:** If leftbar content exceeds its height, use an **internal overflow-y: auto** scroll container — but only within the leftbar panel itself, never the page. Use a thin custom scrollbar or hide scrollbar visuals (CSS `scrollbar-width: none` / `::-webkit-scrollbar { display: none }`). The leftbar's outer shell remains fixed.
- **Responsive:** On narrow viewports, collapse to icon tabs. Tapping an icon opens a slide-out panel overlay. Panel closes on outside tap or explicit close button.

---

## 3. Flag Canvas

- **Position:** Fills the remaining viewport space to the right of the Flag Editor (leftbar) and below the Application Settings (topbar).
- **Background:** Neutral mid-gray (`#d0d0d0` light mode / `#2a2a2a` dark mode) — never white or black, so flag edges are always visible regardless of flag colors.
- **Flag rendering:** The flag SVG is centered both horizontally and vertically within the canvas area. It scales to fit the available space with padding/margin (~24–48px from edges), maintaining the selected aspect ratio. It must **never** overflow the canvas bounds.
- **Aspect ratio:** Controlled by the Flag Editor's ratio selector. When the ratio changes, the flag resizes fluidly with a CSS transition (~150ms ease).
- **Interaction:** The canvas supports:
  - Click-to-select overlays.
  - Drag-to-reposition overlays (pointer events on overlay handles).
  - No pan/scroll of the canvas itself — the flag is always fully visible.
- **Drop shadow:** The flag element has a subtle drop shadow to lift it off the canvas background (e.g. `box-shadow: 0 4px 24px rgba(0,0,0,0.25)`).

---

## 4. Zoom Level (botbar)

- **Shorthand:** botbar (use in code identifiers, filenames, and Copilot chat).
- **Official name:** Zoom Level (use in UI labels and user-facing text).
- **Naming in attributes:** Accessibility attributes (`aria-label`, `role` descriptions) and any other user-facing/screen-reader-visible text must always use the **official name**, never the shorthand. For example, use `aria-label="Zoom Level"`, not `aria-label="botbar"`. The same rule applies to all named sections (topbar, leftbar, rightbar).
- **Position:** In-flow inside the canvas area, centered horizontally below the flag. Does not overlay the flag -- sits beneath it with a small gap (~12px). The botbar and flag are stacked vertically as a centered group within the canvas.
- **Style:** Small pill-shaped container with rounded corners, semi-transparent dark background with backdrop blur (like a macOS/Windows 11 floating toolbar).
- **Contents:** Three small elements in a row:
  - **Zoom Out button** (−) — decreases zoom level by 10% per click.
  - **Zoom level display** — shows current zoom as percentage (e.g. "75%"). Optionally clickable to type a custom value.
  - **Zoom In button** (+) — increases zoom level by 10% per click.
- **Zoom range:** Minimum 10%, **maximum 100%**. The flag must never be zoomed beyond its natural rendered size. Default zoom should be "fit to canvas" (auto-calculated so the flag fills the available space).
- **Behavior:** When zoom < 100%, the flag appears smaller within the canvas. The flag always remains centered. No scroll-to-pan behavior.

---

## 5. Dynamic Tools (rightbar)

- **Shorthand:** rightbar (use in code identifiers, filenames, and Copilot chat).
- **Official name:** Dynamic Tools (use in UI labels and user-facing text).
- **Default state:** Always visible. The rightbar is permanently shown as a floating toolbar. It includes a drag handle so the user can reposition it anywhere on screen.
- **Position:** Floating bar, initially at the right edge of the screen, vertically centered. Does not push layout -- overlays the canvas area. User-draggable to any position within the viewport.
- **Style:** Same pill/floating aesthetic as the botbar -- semi-transparent background with backdrop blur, rounded corners, slight drop shadow.
- **Width:** Narrow (~48--56px), icon-based tool buttons stacked vertically.
- **Behavior:** The rightbar is dynamic and contextual -- its tool buttons change based on the current editing context (e.g. grid overlay tools are always present; alignment tools appear when an overlay is selected). Even when no overlay is selected, the bar remains visible with its base tools (e.g. grid toggle).
- **Contents:** Context-dependent tool buttons. Examples of current and future tools:
  - Alignment tools (align overlay left/center/right/top/middle/bottom).
  - Flip/mirror controls.
  - Duplicate / delete overlay shortcuts.
  - Color eyedropper.
- **Animation:** Slides in from the right edge with a brief CSS transition (~150ms ease) when activated, slides out when deactivated.
- **Responsive:** Hidden on mobile (< 768px). On tablet (768--1279px), same floating behavior as desktop.
- **Accessibility:** All tool buttons must have `aria-label` attributes. The bar container should have `role="toolbar"` and `aria-label="Dynamic Tools"`.

---

## Interaction Constraints

### No Global Scrollbars

- `html, body` must have `overflow: hidden` at all times.
- No element should produce global scrollbars on desktop or mobile (individual section scrolling is still permitted).

### No Text Selection

- All UI elements must have `user-select: none` applied globally.
- Apply via Tailwind (`select-none` on the root) or CSS:

  ```css
  *, *::before, *::after {
    -webkit-user-select: none;
    user-select: none;
  }
  ```

- Exception: text input fields (`<input>`, `<textarea>`) should allow selection for usability.

### No Mobile Swiping / Pull-to-Refresh

- Disable touch-based scrolling and browser gestures on the app shell (individual section scrolling is still permitted):

  ```css
  html, body {
    overscroll-behavior: none;
    touch-action: none;
  }
  ```

- Individual interactive elements (color pickers, sliders, drag handles) should re-enable `touch-action: manipulation` or `touch-action: pan-y` as needed for their specific interactions.

### Fixed Layout — No Reflow on Resize

- The layout is a CSS Grid or Flexbox shell that fills `100dvh × 100dvw`.
- Use `dvh` (dynamic viewport height) to account for mobile browser chrome.
- On window resize, all sections reflow within their constraints — no content is lost or hidden.

---

## Theming

Theming is managed by **DaisyUI 5 custom themes** defined in `src/index.css`. Two themes are configured:

- `flagmaker-dark` (default, `--prefersdark true`)
- `flagmaker-light` (`--prefersdark false`)

Theme switching sets both `data-theme="flagmaker-dark"` / `data-theme="flagmaker-light"` on `<html>` (for DaisyUI) and `class="dark"` / `class="light"` (for backward-compatible legacy CSS).

### Dark Mode (Default) — `flagmaker-dark`

| DaisyUI Variable | Hex Value | Usage |
| --- | --- | --- |
| `--color-base-100` | `#2a2a2a` | Canvas background |
| `--color-base-200` | `#252535` | Leftbar background |
| `--color-base-300` | `#1e1e2e` | Topbar background, borders |
| `--color-base-content` | `#e0e0e0` | Primary text |
| `--color-primary` | `#4a9eff` | Accent / highlights |
| `--color-primary-content` | `#ffffff` | Text on primary color |
| `--color-secondary` | `#888888` | Secondary text |
| `--color-neutral` | `#1e1e2e` | Floating bars (botbar, rightbar) |

### Light Mode — `flagmaker-light`

| DaisyUI Variable | Hex Value | Usage |
| --- | --- | --- |
| `--color-base-100` | `#d0d0d0` | Canvas background |
| `--color-base-200` | `#f5f5f5` | Leftbar background |
| `--color-base-300` | `#ffffff` | Topbar background, borders |
| `--color-base-content` | `#1a1a1a` | Primary text |
| `--color-primary` | `#0066cc` | Accent / highlights |
| `--color-primary-content` | `#ffffff` | Text on primary color |
| `--color-secondary` | `#666666` | Secondary text |
| `--color-neutral` | `#ffffff` | Floating bars (botbar, rightbar) |

### Legacy CSS Custom Properties

The following CSS custom properties are still defined in both `.dark` and `.light` class blocks in `src/index.css` for backward compatibility. **New code should use DaisyUI semantic color classes or oklch variables instead.**

| Property | Dark Value | Light Value |
| --- | --- | --- |
| `--topbar-bg` | `#1e1e2e` | `#ffffff` |
| `--toolbar-bg` | `#252535` | `#f5f5f5` |
| `--canvas-bg` | `#2a2a2a` | `#d0d0d0` |
| `--text-primary` | `#e0e0e0` | `#1a1a1a` |
| `--text-secondary` | `#888` | `#666` |
| `--accent` | `#4a9eff` | `#0066cc` |
| `--btn-hover` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.05)` |
| `--divider` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` |

---

## Typography

- **Font family:** System font stack — `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Base size:** 14px for UI controls and labels.
- **Hierarchy:** Use font weight (medium/semibold) and subtle size differences — not dramatic size jumps. The UI is compact and tool-like, not editorial.

---

## Iconography

- Use a consistent icon set (e.g. Lucide, Phosphor, or Heroicons).
- Icon size: 16–20px for toolbar buttons, 14px for inline indicators.
- Icons should be monochrome, using `currentColor` so they adapt to dark/light theme automatically.

---

## Dropdowns (`<select>`)

All `<select>` dropdown elements throughout the app must use DaisyUI's `select` component classes (e.g. `select select-sm select-ghost`). These provide theme-aware styling automatically through DaisyUI's semantic color system. Additional sizing or variant classes may be combined as needed.

---

## UI Component Framework: DaisyUI 5

The project uses **DaisyUI 5** as its component library on top of Tailwind CSS 4. DaisyUI provides semantic, theme-aware CSS classes for common UI components, reducing the need for custom CSS.

### Installation and Configuration

DaisyUI is installed as a dev dependency and configured in `src/index.css`:

```css
@plugin "daisyui" {
  themes: flagmaker-dark --default, flagmaker-light --prefersdark false;
  logs: false;
}
```

Two custom themes are defined using `@plugin "daisyui/theme"` blocks that map to the app's existing color palette.

### Key Rules for DaisyUI Usage

1. **Use DaisyUI component classes** (`btn`, `navbar`, `dropdown`, `menu`, `select`, `input`, `badge`, `join`, `tabs`, `swap`, `alert`, `divider`, `toggle`) instead of building components from scratch with Tailwind utility classes alone.
2. **Use DaisyUI semantic colors** (`base-100`, `base-200`, `base-300`, `base-content`, `primary`, `secondary`, `accent`, `neutral`, `info`, `success`, `warning`, `error`) instead of hardcoded Tailwind color names. These adapt automatically when themes change.
3. **No `dark:` prefix needed** -- DaisyUI colors respond to the active `data-theme` attribute on `<html>`, not the `dark` class. The `dark` class is kept for backward compatibility, but new code should rely on DaisyUI's theme system.
4. **Theme switching:** Toggle both `class="dark"/"light"` on `<html>` and `data-theme="flagmaker-dark"/"flagmaker-light"`. The `data-theme` attribute controls DaisyUI colors; the class controls any remaining legacy CSS custom properties.
5. **Component class order:** component class first, then part classes, then style/color/size modifiers, then Tailwind utilities. Example: `btn btn-ghost btn-sm btn-square`.
6. **Dropdowns:** Use `<details class="dropdown">` with `<summary>` as trigger and `<ul class="dropdown-content menu">` as the menu. This is the DaisyUI 5 pattern.
7. **Size classes:** The custom themes set `--size-selector` and `--size-field` to `0.21875rem` for a compact, tool-like UI. Avoid overriding these unless necessary.

### DaisyUI Component Mapping

| UI Element | DaisyUI Classes |
| --- | --- |
| Topbar | `navbar bg-base-300` |
| Topbar buttons | `btn btn-ghost btn-sm btn-square` |
| Theme toggle | `btn btn-ghost btn-sm btn-square` with icon swap |
| Export dropdown | `dropdown dropdown-end` (`<details>`) |
| Export menu | `dropdown-content menu bg-base-300 rounded-box` |
| Export size select | `select select-sm select-ghost` |
| Tab strip buttons | `btn btn-ghost btn-sm btn-square toolbar-tab-btn` |
| Leftbar aside | `bg-base-200 border-r border-base-300` |
| Ratio/orient/count buttons | `btn btn-outline btn-xs` |
| Add overlay buttons | `btn btn-outline btn-xs` |
| Category filter buttons | `btn btn-xs` |
| Search input | `input input-sm input-bordered` |
| Botbar container | `join botbar` |
| Botbar buttons | `join-item btn btn-ghost btn-circle btn-sm` |
| Rightbar buttons | `btn btn-ghost btn-sm btn-square rightbar-btn` |
| Grid size menu | `menu bg-base-300 rounded-box shadow-lg` |
| Layer badges | `badge badge-sm` |
| Dividers | `divider divider-horizontal` |
| Error toasts | `alert alert-error` |

### CSS Custom Property References

In `src/index.css`, use DaisyUI's oklch-based CSS variables for colors:

- `oklch(var(--b1))` -- base-100 (canvas background)
- `oklch(var(--b2))` -- base-200 (leftbar background)
- `oklch(var(--b3))` -- base-300 (topbar background, borders)
- `oklch(var(--bc))` -- base-content (primary text)
- `oklch(var(--p))` -- primary (accent color)
- `oklch(var(--sc))` -- secondary-content (secondary text)
- `oklch(var(--n))` -- neutral (floating bar backgrounds)

### Legacy Compatibility

Legacy CSS custom properties (`--topbar-bg`, `--toolbar-bg`, `--canvas-bg`, `--text-primary`, `--text-secondary`, `--accent`, `--btn-hover`, `--divider`) are still defined in `src/index.css` for any remaining custom CSS that has not been migrated to DaisyUI semantic colors. New code should prefer DaisyUI classes and color variables over these legacy properties.

---

## Responsive Breakpoints

| Breakpoint | Behavior |
| --- | --- |
| **≥ 1280px** (desktop) | Full layout — expanded leftbar with labels, spacious canvas. |
| **768–1279px** (tablet landscape) | Leftbar collapses to icon strip (~48px). Tap to expand panel as overlay. |
| **< 768px** (mobile landscape) | Icon-only leftbar. Botbar shrinks. Rightbar hidden. Flag canvas maximized. Minimal chrome. |

Portrait orientation is **not supported**. Show a "Please rotate your device" overlay in portrait mode.

---

## Z-Index Stack

| Layer | z-index | Element |
| --- | --- | --- |
| Base | 0 | Canvas background |
| Flag | 10 | Flag SVG |
| Botbar | 50 | Floating zoom level controls |
| Rightbar | 45 | Dynamic tools (floating, right edge) |
| Leftbar Panel | 40 | Flag editor leftbar (and slide-out on mobile) |
| Topbar | 60 | Application settings bar |
| Modals/Dialogs | 100 | Confirm dialogs, export modals |
| Toasts | 110 | Notification toasts |
| Portrait Overlay | 999 | "Rotate device" message |
