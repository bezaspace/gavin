# Tactical HUD Design System

A flexible design specification for building applications with a military-grade tactical HUD aesthetic. This document captures the visual language, colors, typography, and UI patterns without prescribing specific app structures.

---

## Design Overview

**Key Design Characteristics:**

- **Military HUD Aesthetic** - Deep black backgrounds (#0a0c0e), ultra-subtle 0.5px borders, monospace typography throughout. Creates that command-center, mission-control vibe.

- **Financial Terminal Styling** - Color-coded data states (green for positive/success, red for negative/error, yellow for warnings), dense information layout, grid-based organization. Think Bloomberg Terminal meets sci-fi interface.

- **Technical Precision** - JetBrains Mono font ensures perfect number alignment, tabular figures, uppercase labels with wide letter-spacing (0.15em), light font weights (300) for large numbers. Every pixel serves a purpose.

- **Dark & Immersive** - Designed for extended use in low-light environments. No pure white, no harsh contrasts. Muted teal-grey primary (#7a9ba8) that's easy on the eyes.

- **High Information Density** - Pack data efficiently without feeling cluttered. Tables, metrics, and charts work together to present complex information at a glance.

---

## 1. Design Philosophy

**Aesthetic:** Military command-center meets sci-fi interface. Think: Bloomberg Terminal + Iron Man's HUD + Tactical display.

**Core Principles:**
- Dark, immersive environment
- High information density
- Color-coded data states
- Technical/monospace typography
- Subtle structural lines (0.5px)
- No decorative elements
- Everything serves a purpose

**Mood:** Professional, precise, serious, data-driven

---

## 2. Color System

### 2.1 Background Colors

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Deep Black | `#0a0c0e` | `--bg-primary` | Main background |
| Panel Black | `#0d1012` | `--bg-panel` | Cards, panels, modals |

### 2.2 Primary Accent

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Cyan-Grey | `#7a9ba8` | `--accent-primary` | Primary interactive elements, links, borders |

### 2.3 Text Colors

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Primary Text | `#7a9ba8` | `--text-primary` | Body text, labels |
| Bright Text | `#c8dce4` | `--text-bright` | Headings, important data |
| Dim Text | `#4a5a62` | `--text-dim` | Secondary info, hints |

### 2.4 Semantic Colors (Status/Data)

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Green | `#4a9868` | `--status-success` | Positive, active, gains, success |
| Yellow | `#b89848` | `--status-warning` | Warning, neutral, crypto |
| Red | `#b84848` | `--status-error` | Negative, losses, errors |
| Purple | `#8a6ab8` | `--status-purple` | Special features, options |
| Cyan | `#5a9ab8` | `--status-cyan` | Alternative accent, crypto |
| Blue | `#5a7ab8` | `--status-blue` | General accent |

### 2.5 Border Colors

| Color | Value | CSS Variable | Usage |
|-------|-------|--------------|-------|
| Subtle Line | `rgba(122, 155, 168, 0.15)` | `--border-subtle` | Dividers, separators |
| Input Border | `rgba(122, 155, 168, 0.2)` | `--border-input` | Form elements |

---

## 3. Typography

### 3.1 Font Family

**Primary:** `JetBrains Mono`, `SF Mono`, `Consolas`, `monospace`

Use monospace throughout for technical consistency and number alignment.

### 3.2 Base Settings

```css
html {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.05em;
}
```

### 3.3 Type Scale

| Level | Size | Weight | Letter-Spacing | Transform | Usage |
|-------|------|--------|----------------|-----------|-------|
| **Display** | 36px | 300 | -0.02em | none | Hero numbers, main metrics |
| **Heading 1** | 24px | 300 | -0.01em | none | Section headers |
| **Heading 2** | 18px | 400 | 0 | none | Sub-sections |
| **Body Large** | 14px | 400 | 0 | none | Primary content |
| **Body** | 11px | 400 | 0 | none | Standard text |
| **Label** | 8px | 400 | 0.15em | UPPERCASE | Field labels, headers |
| **Caption** | 9px | 400 | 0 | none | Fine print, timestamps |

### 3.4 Typography Rules

- **Labels are ALWAYS uppercase** with wide letter-spacing (0.15em)
- **Large numbers use light weight (300)** for elegance
- **Never use bold** - create hierarchy through size and color
- **Tabular lining figures** - monospace ensures alignment

---

## 4. Spacing System

### 4.1 Base Unit

**4px** is the base unit. All spacing is multiples of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight spacing, inline gaps |
| `space-2` | 8px | Small gaps, icon padding |
| `space-3` | 12px | Panel internal padding |
| `space-4` | 16px | Standard gaps, container padding |
| `space-6` | 24px | Large gaps, section separation |
| `space-8` | 32px | Major sections |

### 4.2 Container

- **Max width:** 1920px
- **Padding:** 16px (space-4)
- **Responsive:** 4-column (mobile) → 8-column (tablet) → 12-column (desktop)

---

## 5. Borders & Lines

### 5.1 Border Widths

- **Standard:** 0.5px (very subtle)
- **Inputs:** 0.5px
- **Dividers:** 0.5px
- **Focus:** 0.5px (color change, not width)

### 5.2 Border Radius

- **Sharp:** 0px (panels, tables)
- **Subtle:** 2px (small tags, badges)
- **Inputs:** 0px (sharp, technical feel)

---

## 6. Component Patterns

### 6.1 Panels / Cards

```
┌──────────────────────────────────┐
│ PANEL TITLE            Value     │  ← Header: border-bottom
├──────────────────────────────────┤
│                                  │
│    Content area                  │
│    with padding: 12px            │
│                                  │
└──────────────────────────────────┘
```

**Specs:**
- Background: `--bg-panel`
- Border: 0.5px solid `--border-subtle`
- No border-radius (sharp corners)
- Header: flex row, space-between
- Header border: 0.5px solid `--border-subtle`
- Header padding: 8px 16px
- Content padding: 12px

### 6.2 Data Displays

**Metric Block:**
```
LABEL
$100,000.00
```
- Label: 8px, uppercase, letter-spacing 0.15em, `--text-dim`
- Value: 36px or 24px, weight 300, `--text-bright`
- Gap between: 4px

**Inline Metric:**
```
LABEL      Value
```
- Label: 8px, uppercase
- Value: 11px
- Gap: 8px
- Align: baseline

### 6.3 Status Indicators

**Status Dot:**
- Size: 8px diameter
- Shape: Circle
- Colors: Green (active), Red (error), Yellow (warning), Dim (inactive)

**Pulsing Active State:**
```css
animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
```
- Creates radar-like pulse effect
- Used for live data, active connections

### 6.4 Tables

**Structure:**
```
Col 1    Col 2    Col 3    Col 4
──────────────────────────────────
Data     Data     Data     Data
Data     Data     Data     Data
```

**Specs:**
- Header: 8px uppercase labels
- Header border: 0.5px, 50% opacity
- Rows: 11px regular text
- Row border: 0.5px, 20% opacity
- Row hover: Background at 10% opacity
- Cell padding: 8px vertical, 8px horizontal

### 6.5 Form Inputs

**Text Input:**
```css
background: var(--bg-primary);
border: 0.5px solid var(--border-subtle);
color: var(--text-primary);
font-size: 11px;
padding: 6px 10px;
transition: border-color 0.2s;
```

**Focus State:**
- Border color changes to `--accent-primary`
- No outline
- No shadow

**Checkbox:**
- Native checkbox styled with `accent-color: var(--accent-primary)`
- Size: 16px

### 6.6 Buttons

**Outline Button:**
```css
background: transparent;
border: 0.5px solid var(--accent-primary);
color: var(--accent-primary);
font-size: 10px;
text-transform: uppercase;
letter-spacing: 0.1em;
padding: 8px 16px;
transition: all 0.2s;
```

**Hover State:**
```css
background: var(--accent-primary);
color: var(--bg-primary);
```

**Text Button Pattern:**
```
[ACTION]
```
- Uppercase in brackets
- Hover: text color changes to `--accent-primary`

### 6.7 Charts

**Line Chart:**
- Stroke: 1.5px
- Colors: Based on data type (green for positive, red for negative)
- Area fill: Gradient from color (20% opacity) to transparent
- Grid: 0.5px lines at 30% opacity
- Axis labels: 9px, `--text-dim`

**Sparkline (Mini Chart):**
- Width: 60-80px
- Height: 20-24px
- Stroke: 1px
- Color: Green (positive) or Red (negative)
- No fill, no axis

### 6.8 Tooltips

```
┌─────────────────────┐
│ TOOLTIP TITLE       │  ← border-bottom, accent color
├─────────────────────┤
│ Label        Value  │
│ Label        Value  │
│                     │
│ Description text    │  ← 10px, dim color
└─────────────────────┘
```

**Specs:**
- Background: `--bg-panel`
- Border: 0.5px solid `--border-subtle`
- Padding: 8px 12px
- Font size: 11px
- Max-width: 320px
- Title: 8px uppercase, accent color

### 6.9 Scrollbars

```css
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--text-dim);
  border-radius: 2px;
}
```

Minimal, thin scrollbars that blend into the dark background.

---

## 7. Icons & Symbols

### 7.1 Icon Style

- **Stroke-based** (not filled)
- **Stroke width:** 1.5px
- **Size:** 16px standard
- **Color:** Inherits text color

### 7.2 Common Icons

**Notification Bell:**
```svg
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
</svg>
```

**Status Icons:**
- Use filled circles (8px) with semantic colors
- No complex iconography needed

### 7.3 Special Symbols

**Crypto Indicator:** `₿`
- Unicode Bitcoin symbol
- Color: Yellow (`--status-warning`)
- Use before crypto-related items

**Checkmark:** `✓`
- Unicode checkmark
- Color: Green
- For success states

---

## 8. Animation Guidelines

### 8.1 Timing

| Animation Type | Duration | Easing |
|----------------|----------|--------|
| Hover states | 200ms | ease |
| Focus states | 200ms | ease |
| Modal/overlay | 200ms | ease |
| Data updates | 300ms | ease |
| Chart drawing | 1200ms | ease-out-quad |
| Tooltip | 100ms | ease |

### 8.2 Patterns

**Fade In:**
```css
opacity: 0 → 1
```

**Slide In:**
```css
transform: translateX(-10px) → translateX(0)
opacity: 0 → 1
```

**Scale:**
```css
transform: scale(0.95) → scale(1)
opacity: 0 → 1
```

**Pulse (Active State):**
```css
animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
```

### 8.3 Principles

- Keep animations subtle and fast
- Never more than 300ms for UI feedback
- Use opacity + transform (GPU accelerated)
- No bounce or playful easing

---

## 9. Layout Patterns

### 9.1 Header Pattern

```
┌──────────────────────────────────────────────────────────────┐
│ APP NAME          [STATUS]    Metric 1  Metric 2  [ICON] Time│
└──────────────────────────────────────────────────────────────┘
```

- Border-bottom: 0.5px
- Height: ~60px
- Items centered vertically
- Right-aligned: Time, icons, status

### 9.2 Dashboard Grid

Use CSS Grid with 12 columns on desktop:

```css
grid-template-columns: repeat(12, 1fr);
gap: 16px;
```

**Panel Sizing:**
- Small panel: 3-4 columns
- Medium panel: 5-6 columns  
- Large panel: 8-12 columns

### 9.3 List Patterns

**Activity Feed:**
```
[Time] [Category]     Action
```
- Time: 9px, dim, fixed width
- Category: 11px, colored by type
- Action: 11px, primary text

**Data List:**
```
Label                          Value
```
- Flex row, space-between
- Label: left, dim
- Value: right, bright or colored by state

---

## 10. Content Formatting

### 10.1 Numbers

**Currency:**
- Format: `$12,345.67`
- Always 2 decimal places
- Commas for thousands

**Percentages:**
- Format: `+5.25%` or `-3.10%`
- Always show sign
- 2 decimal places

**Compact:**
- `$15.2k` for thousands
- `$1.5M` for millions

### 10.2 Time

**Timestamps:**
- Format: `14:23:45` (24-hour)
- No AM/PM
- Include seconds for live data

**Relative:**
- Format: `2h` or `3d`
- Single letter unit

### 10.3 Tags/Badges

```
[STATUS]  [ON]  [READY]  [24/7]
```

- Background: Color at 20% opacity
- Text: Full color
- Border: Color at 30% opacity
- Padding: 2px 6px
- Border-radius: 2px
- Font: 9px uppercase

---

## 11. Implementation Notes

### 11.1 CSS Variables Setup

```css
:root {
  /* Backgrounds */
  --bg-primary: #0a0c0e;
  --bg-panel: #0d1012;
  
  /* Accents */
  --accent-primary: #7a9ba8;
  
  /* Text */
  --text-primary: #7a9ba8;
  --text-bright: #c8dce4;
  --text-dim: #4a5a62;
  
  /* Status */
  --status-success: #4a9868;
  --status-warning: #b89848;
  --status-error: #b84848;
  --status-purple: #8a6ab8;
  --status-cyan: #5a9ab8;
  --status-blue: #5a7ab8;
  
  /* Borders */
  --border-subtle: rgba(122, 155, 168, 0.15);
  --border-input: rgba(122, 155, 168, 0.2);
}
```

### 11.2 Required Fonts

Load JetBrains Mono from Google Fonts:

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet">
```

### 11.3 Technology Agnostic

This design system works with:
- **React/Vue/Svelte/Angular** - Any framework
- **Tailwind CSS** - Use custom config
- **Plain CSS** - Use CSS variables
- **CSS-in-JS** - Styled-components, emotion, etc.

---

## 12. Quick Reference Card

### Colors
```
Background:     #0a0c0e / #0d1012
Primary:        #7a9ba8
Text:           #7a9ba8 (normal) / #c8dce4 (bright) / #4a5a62 (dim)
Success:        #4a9868
Warning:        #b89848
Error:          #b84848
Purple:         #8a6ab8
Cyan:           #5a9ab8
```

### Typography
```
Font:           JetBrains Mono
Base:           10px
Display:        36px light
Heading:        24px light
Body:           11px regular
Label:          8px uppercase (letter-spacing: 0.15em)
```

### Spacing
```
Base unit:      4px
Panel padding:  12px
Gap:            16px
```

### Borders
```
Width:          0.5px
Color:          rgba(122, 155, 168, 0.15)
Radius:         0px (sharp)
```

---

*Use this design system as a foundation. Adapt layouts, components, and structures to fit your specific application needs while maintaining the visual aesthetic.*
