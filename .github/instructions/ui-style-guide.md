# Flag Maker — UI Style Guide

This document defines the visual layout, interaction rules, and design constraints for the Flag Maker application UI. All UI implementation must follow these rules. Reference the attached screenshot of [Flag Creator](https://flag-creator.com/) as a visual benchmark for layout proportions and dark-theme styling.

---

## Global Layout

The app uses a **fixed full-viewport layout** with four sections arranged in a single screen — no scrolling, no overflow, no content extending beyond the viewport on any axis.

```text
┌──────────────────────────────────────────────────┐
│                  Application Settings (topbar)           │
├─────────┬────────────────────────────────────────┤
│         │                                        │
│  Flag   │           Flag Canvas                  │
│ Editor  │        (centered, dynamic)             │
│(leftbar)│                                        │
│         │                                        │
│         │              ┌──────────┐              │
│         │              │ Zoom Bar │              │
│         │              └──────────┘              │
├─────────┴────────────────────────────────────────┤
```

All four sections — Application Settings (topbar), Flag Editor (leftbar), Flag Canvas, and Zoom Bar — are **position-fixed or fit within a fixed flex/grid layout** so nothing ever scrolls. The Zoom Bar floats over the canvas area near the bottom center.

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

## 4. Zoom Bar

- **Position:** Floating, centered horizontally at the bottom of the canvas area. Overlays the canvas, does not push layout. ~32–40px from the bottom edge.
- **Style:** Small pill-shaped container with rounded corners, semi-transparent dark background with backdrop blur (like a macOS/Windows 11 floating toolbar).
- **Contents:** Three small elements in a row:
  - **Zoom Out button** (−) — decreases zoom level by 10% per click.
  - **Zoom level display** — shows current zoom as percentage (e.g. "75%"). Optionally clickable to type a custom value.
  - **Zoom In button** (+) — increases zoom level by 10% per click.
- **Zoom range:** Minimum 10%, **maximum 100%**. The flag must never be zoomed beyond its natural rendered size. Default zoom should be "fit to canvas" (auto-calculated so the flag fills the available space).
- **Behavior:** When zoom < 100%, the flag appears smaller within the canvas. The flag always remains centered. No scroll-to-pan behavior.

---

## Interaction Constraints

### No Scrollbars — Ever

- `html, body` must have `overflow: hidden` at all times.
- No element should produce visible scrollbars on desktop or mobile.
- Internal overflow within the Flag Editor (leftbar) uses hidden-scrollbar techniques:

  ```css
  .toolbar-scroll {
    overflow-y: auto;
    scrollbar-width: none; /* Firefox */
  }
  .toolbar-scroll::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Edge */
  }
  ```

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

- Disable touch-based scrolling and browser gestures on the app shell:

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

### Dark Mode (Default)

| Element          | Color                    |
| ---------------- | ------------------------ |
| Topbar bg        | `#1e1e2e`                |
| Leftbar bg       | `#252535`                |
| Canvas bg        | `#2a2a2a`                |
| Zoom Bar bg      | `rgba(30,30,46,0.85)`    |
| Text (primary)   | `#e0e0e0`                |
| Text (secondary) | `#888`                   |
| Accent           | `#4a9eff`                |
| Button hover     | `rgba(255,255,255,0.08)` |
| Dividers         | `rgba(255,255,255,0.06)` |

### Light Mode

| Element          | Color                    |
| ---------------- | ------------------------ |
| Topbar bg        | `#ffffff`                |
| Leftbar bg       | `#f5f5f5`                |
| Canvas bg        | `#d0d0d0`                |
| Zoom Bar bg      | `rgba(255,255,255,0.85)` |
| Text (primary)   | `#1a1a1a`                |
| Text (secondary) | `#666`                   |
| Accent           | `#0066cc`                |
| Button hover     | `rgba(0,0,0,0.05)`       |
| Dividers         | `rgba(0,0,0,0.08)`       |

Theme toggling applies a class (`dark` / `light`) on `<html>` and all colors are driven by CSS custom properties or Tailwind's dark mode variants.

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

## Responsive Breakpoints

| Breakpoint | Behavior |
| --- | --- |
| **≥ 1280px** (desktop) | Full layout — expanded leftbar with labels, spacious canvas. |
| **768–1279px** (tablet landscape) | Leftbar collapses to icon strip (~48px). Tap to expand panel as overlay. |
| **< 768px** (mobile landscape) | Icon-only leftbar. Zoom bar shrinks. Flag canvas maximized. Minimal chrome. |

Portrait orientation is **not supported**. Show a "Please rotate your device" overlay in portrait mode.

---

## Z-Index Stack

| Layer | z-index | Element |
| --- | --- | --- |
| Base | 0 | Canvas background |
| Flag | 10 | Flag SVG |
| Zoom Bar | 50 | Floating zoom controls |
| Leftbar Panel | 40 | Flag editor leftbar (and slide-out on mobile) |
| Topbar | 60 | Application settings bar |
| Modals/Dialogs | 100 | Confirm dialogs, export modals |
| Toasts | 110 | Notification toasts |
| Portrait Overlay | 999 | "Rotate device" message |
