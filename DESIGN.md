---
name: HairConsultant Admin
description: Apple's own product language applied to a salon's control room for catalogue, users, feedback and usage.
colors:
  system-indigo: "#5856d6"
  on-indigo: "#ffffff"
  indigo-tint: "rgb(88 86 214 / 0.1)"
  indigo-ink: "#4b49c4"
  focus-indigo: "rgb(88 86 214 / 0.45)"
  system-orange: "#ff9500"
  orange-tint: "rgb(255 149 0 / 0.14)"
  orange-ink: "#c45f00"
  system-green: "#34c759"
  system-red: "#ff3b30"
  grouped-ground: "#e9e9ef"
  group-white: "#ffffff"
  label: "#1d1d1f"
  secondary-label: "#636366"
  gray-fill: "rgb(118 118 128 / 0.12)"
  gray-fill-quiet: "rgb(118 118 128 / 0.08)"
  separator: "rgb(60 60 67 / 0.13)"
  field-stroke: "rgb(60 60 67 / 0.18)"
  chart-grid: "rgb(60 60 67 / 0.1)"
  sidebar-vibrancy: "rgb(246 246 249 / 0.72)"
  face-oval: "#007aff"
  face-round: "#a2845e"
  face-square: "#30b0c7"
  face-heart: "#ff2d55"
  face-diamond: "#34c759"
  dark-ground: "#000000"
  dark-group: "#1c1c1e"
  dark-elevated: "#2c2c2e"
  dark-label: "#f5f5f7"
  dark-secondary-label: "#98989d"
  dark-indigo: "#5e5ce6"
  dark-indigo-ink: "#a5a4f5"
  dark-orange: "#ff9f0a"
  dark-orange-ink: "#ffb340"
  dark-green: "#30d158"
  dark-red: "#ff453a"
  dark-separator: "rgb(84 84 88 / 0.6)"
  dark-sidebar-vibrancy: "rgb(28 28 30 / 0.72)"
typography:
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.022em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\" 1"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.01em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: "-0.006em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  mono:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  icon-small: "7px"
  icon-large: "18px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  header: "28px"
  xl: "32px"
  sidebar: "240px"
  rail: "384px"
components:
  button-primary:
    backgroundColor: "{colors.system-indigo}"
    textColor: "{colors.on-indigo}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-gray:
    backgroundColor: "{colors.gray-fill}"
    textColor: "{colors.label}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    textColor: "{colors.label}"
    rounded: "{rounded.lg}"
    size: "32px"
  button-destructive:
    textColor: "{colors.system-red}"
    rounded: "{rounded.lg}"
    height: "32px"
  input:
    backgroundColor: "{colors.group-white}"
    textColor: "{colors.label}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
  card:
    backgroundColor: "{colors.group-white}"
    textColor: "{colors.label}"
    rounded: "{rounded.xl}"
    padding: "16px"
  stat-cell:
    backgroundColor: "{colors.group-white}"
    typography: "{typography.figure}"
    padding: "16px 20px"
  nav-item:
    textColor: "{colors.label}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "32px"
  nav-item-active:
    backgroundColor: "{colors.system-indigo}"
    textColor: "{colors.on-indigo}"
  badge-gray:
    backgroundColor: "{colors.gray-fill}"
    textColor: "{colors.label}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  badge-attention:
    backgroundColor: "{colors.orange-tint}"
    textColor: "{colors.orange-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  switch-on:
    backgroundColor: "{colors.system-green}"
    rounded: "{rounded.full}"
    width: "32px"
    height: "18.4px"
  today-chip:
    backgroundColor: "{colors.group-white}"
    textColor: "{colors.secondary-label}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 12px 0 10px"
    height: "32px"
  app-icon:
    backgroundColor: "{colors.system-indigo}"
    textColor: "{colors.on-indigo}"
    rounded: "{rounded.icon-large}"
    size: "64px"
---

# Design System: HairConsultant Admin

## Overview

**Creative North Star: "Settings, for a Salon"**

The admin reads like a first-party Apple app: macOS Settings, Music, App Store Connect. A grouped gray ground holds borderless white inset groups; a translucent vibrancy sidebar sits beside them with a filled indigo selection and white text. Every colour is an Apple system colour, in hex, with its own dark-mode counterpart. systemIndigo is the accent, systemOrange the one highlight, systemGreen the "on" state, and five more system hues name the face shapes.

Hierarchy comes from Apple's type rhythm, not from lines: a bold large title at -0.022em on every page, semibold 15px group titles, 14px body with a hair of negative tracking, and gray secondary labels. The font stack asks for SF Pro through -apple-system and falls back to Inter where the system face is missing. Density is comfortable: 24px between groups, 16px inside them.

The system replaces the earlier "accent ladder" world (Archivo, OKLCH indigo tints, hairline-bordered cards, a tinted active nav row). None of those devices carry over. The outlined-card SaaS kit is rejected: groups have no border, secondary buttons are gray fills, not outlines.

**Key Characteristics:**
- Grouped gray ground, borderless white groups, depth by tone alone.
- Translucent sidebar (blur plus saturate) with a filled indigo selection.
- systemIndigo accent, systemOrange as the single highlight, systemGreen for "on".
- Capsule badges and chips, gray-fill secondary buttons, white-knob switches.
- Bold large titles; SF Pro first, Inter as stand-in; sentence case throughout.
- Light and dark are both first-class, each with Apple's own dark system values.

## Colors

Apple's system palette, used the way Apple uses it: neutral grays and white for structure, one tint colour, one attention colour, and semantic system hues for state and category. Values are hex or alpha `rgb()`, the source format in `globals.css`.

### Primary
- **System Indigo** (system-indigo; dark-indigo in dark): the tint colour. Primary button fill, the selected sidebar row (filled, white text and icon), resting sidebar icons, the app-icon tile, the single chart series, links, caret and `accent-color`.
- **Indigo Tint / Indigo Ink** (indigo-tint, indigo-ink): the area form of the tint. Table row hover (at 60%) and selection, accent surfaces.
- **Focus Indigo** (focus-indigo): focus rings, drawn as a 3px ring at half strength.

### Secondary
- **System Orange** (system-orange; dark-orange in dark): the one highlight. Today's bar in the daily chart, today's point on a line, the date dot in the Overview chip, filled stars.
- **Orange Tint / Orange Ink** (orange-tint, orange-ink): the attention badge for states that need a look (Hidden style, Disabled user).

### Tertiary
- **System Green** (system-green; dark-green): switch "on" and success.
- **System Red** (system-red; dark-red): destructive actions, as a 10% tint with red text.
- **Face-shape hues** (face-oval systemBlue, face-round systemBrown, face-square teal, face-heart systemPink, face-diamond systemGreen): fixed per shape on tags, the split bar and category bars. None of them is the indigo accent or the orange highlight.

### Neutral
- **Grouped Ground** (grouped-ground; dark-ground pure black): page background, the systemGroupedBackground role.
- **Group White** (group-white; dark-group): cards, figure cells, inputs, the today chip. Popovers and dialogs use white in light and dark-elevated in dark.
- **Label / Secondary Label** (label, secondary-label; dark-label, dark-secondary-label): primary text; sublines, descriptions, table heads, figure labels and hints, axis ticks.
- **Gray Fill / Quiet Gray Fill** (gray-fill, gray-fill-quiet): gray buttons, gray badges, segmented-control track, ghost hover.
- **Separator / Field Stroke / Chart Grid** (separator, field-stroke, chart-grid; dark-separator): hairlines between rows and figure cells, input strokes, chart gridlines.
- **Sidebar Vibrancy** (sidebar-vibrancy; dark-sidebar-vibrancy): the 72% translucent sidebar material.

### Named Rules
**The System Colour Rule.** Every colour is an Apple system colour with its Apple dark-mode value. No custom hue enters the palette.

**The One Highlight Rule.** Orange means "today" or "needs attention". It never decorates, never fills a button, and never stands in for a face shape.

**The Fixed Hue Rule.** Each face shape has one system hue, used identically in tags, the split bar, charts and filters, in both themes.

## Typography

**Display Font:** -apple-system / SF Pro Text (with Inter via next/font, then system-ui)
**Body Font:** the same stack; one family carries everything.
**Label/Mono Font:** ui-monospace, Cascadia Mono, Consolas, for style ids and literal strings.

**Character:** Apple's own text face where it exists, Inter where it doesn't. Hierarchy comes from size and weight steps (400, 500, 600, 700) and tightening tracking as size grows, never from case.

### Hierarchy
- **Large Title** (700, 28px rising to 32px from 768px, 1.25, -0.022em): one per page in PageHeader and on the login screen, with a 14px gray subline.
- **Headline** (600, 20px, -0.015em): section heads within a page (Analytics sections, Feedback "Reviews").
- **Figure** (600, 24px, -0.025em, tabular): values in the figure strip. Face-shape percentages step down to 18px/600.
- **Title** (600, 15px, -0.01em): group titles, over a 14px gray description; 14px in the small card size.
- **Body** (400, 14px, -0.006em): table cells, nav labels, buttons (at 500), feedback text, descriptions.
- **Label** (500 or 400, 12px): table column heads in gray, figure hints, timestamps, badges, chart ticks.

### Named Rules
**The Large Title Rule.** Every page opens with one bold large title at -0.022em. Nothing else on the page is bold 700.

**The Sentence Case Rule.** Every title, label, column head, button and badge is sentence case. No all-caps labels, no letter-spaced kickers.

## Layout

Two-column shell. From 1024px: a 240px sticky, full-height translucent sidebar (app-icon mark and name at the top, six rows on a 32px row 2px apart, account row at the foot, 20px vertical padding, 24px between those three blocks) beside a fluid canvas with 32px side padding (40px from 1280px) and 32px top padding. Below 1024px the sidebar becomes a 56px sticky top bar, 80% ground with blur, holding the mark and a menu button; the menu drops a full-width sheet with the same rows and account row. Content runs at 16px side margins and 24px top on phones.

PageHeader opens every page: large title and subline left, actions right, bottom-aligned, 28px above the content. Overview: a six-cell figure strip (2 columns on phone, 3 from 768px, 6 from 1280px), then a `1fr | 384px` grid with 24px gaps: charts left, latest feedback rail right; the rail drops below under 1280px. List pages: a row of 32px filter controls, then the table inside one group.

Spacing rhythm: 4 / 8 / 16 / 24 / 32px, with 28px under the page header. 24px between groups, 16px inside them (12px in the small size), 20px by 16px inside figure cells.

## Elevation & Depth

Flat and tonal. Depth is white on systemGroupedBackground (in dark, #1c1c1e on black, with #2c2c2e for anything floating). Groups carry no border; a soft lift shadow (`--card-shadow`) raises them off the ground. Material, not shadow, separates the sidebar: a 72% translucent fill with a 40px backdrop blur and 150% saturation, held by one separator on its right edge. The phone top bar uses the same material over 80% ground with a 24px blur.

### Shadow Vocabulary
- **Lifted group** (`--card-shadow`: `0 1px 2px rgb(0 0 0 / 0.05), 0 6px 20px -6px rgb(0 0 0 / 0.1)`; in dark `0 1px 2px rgb(0 0 0 / 0.4)`): every card, figure strip and table group, so white reads clearly against the #e9e9ef ground.
- **Floating menu** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` plus a 1px ring of label at 10%): select popups and chart tooltips. Dropdown menus take the larger `shadow-lg` step.
- **Dialog** (1px ring of label at 10%, no drop shadow, over the dimmed overlay).
- **Mobile sheet** (`box-shadow: 0 16px 32px -16px rgb(0 0 0 / 0.2)`): the drop-down nav sheet.
- **Switch knob** (`shadow-sm`): the white knob only.

### Named Rules
**The Borderless Group Rule.** Cards, figure strips and tables have no border. White on the deeper #e9e9ef gray plus the soft lift shadow is the whole depth model; separators live only between rows and cells inside a group.

**The Vibrancy Rule.** Persistent chrome (sidebar, phone top bar) is translucent material with blur and saturation, never an opaque panel and never a dark slab in light mode.

## Shapes

Continuous, generous rounding from one 10px base. Controls (buttons, inputs, selects, segmented-control track) are 10px; sidebar rows and segments are 8px; groups, dialogs and the figure strip are 14px. Badges, the today chip, switches and the face-shape split bar are capsules. App-icon tiles follow Apple's icon proportion: 7px on the 28px sidebar mark, 18px on the 64px login tile. Face-shape swatches are 8px squares at 2px radius; chart bars round their outer end by 4px. Lines are hairlines only, and only inside groups.

## Components

### Buttons
- **Shape:** 10px radius, 32px tall (36px large, 28px small), 14px/500 label, 16px icons.
- **Primary:** systemIndigo fill, white text. One per view at most (New style, Sign in, Save).
- **Hover / Focus:** primary fades to 80%; gray deepens by mixing 6% label into the fill. Focus is a 3px indigo ring at half strength. Press scales to 0.97 over 150ms ease-out, off under reduced motion.
- **Gray (the `outline` variant):** Apple's gray button, gray-fill with label text and no stroke. The standard secondary action (Recalculate stats, Choose files, View all feedback).
- **Ghost:** no fill, gray-fill on hover; icon actions (table edit, chart/table switch, theme toggle, sign out).
- **Destructive:** 10% red tint with red text (20% in dark), never solid.

### Chips
- **Today chip:** capsule, 32px, white with a separator stroke; a 6px orange dot, the date in label at 500, the PHT time in secondary label. Overview only.
- **Badges:** 20px capsules, 12px/500. Gray for neutral states and try-on type; attention (orange tint, orange ink) for Hidden and Disabled.
- **Face-shape tag:** a hue square plus the shape name in 12px, no container.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** group white (dark-group in dark).
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** none.
- **Internal Padding:** 16px (12px small); header is a 15px/600 title over a 14px gray description, with an optional top-right action. Footers sit on quiet gray fill behind a separator.

### Inputs / Fields
- **Style:** 32px, 10px radius, 1px field-stroke, white fill (30% field tint in dark), 14px text, gray placeholder.
- **Focus:** stroke turns focus indigo with a 3px indigo ring at half strength.
- **Error / Disabled:** red stroke with a 20% red ring; disabled at 50% opacity.
- **Switch:** 32 by 18px capsule, systemGreen when on, field-stroke gray when off, white knob with a small shadow.
- **Segmented control (tabs):** 32px quiet-gray track at 10px radius with 3px inset; the selected segment lifts to the ground colour with label text.

### Navigation
- **Style:** rows 32px tall, 8px radius, inset 12px from the sidebar edges, 2px apart. 16px icon at 1.75 stroke in systemIndigo, 14px label in label colour.
- **Hover:** a 6% label wash, 150ms.
- **Active:** filled systemIndigo with white label at 500 and a white icon, as in a macOS sidebar selection. No left bar, no tint.
- **Account row:** at the foot, a 10px-radius quiet wash holding the email, an "Admin" caption, the theme toggle and sign out.
- **Mobile:** the same rows in the drop-down sheet under the 56px translucent top bar.

### Tables
- Sit inside one group. 40px header row with 12px/500 gray sentence-case heads and no fill. Cells 14px with 10px vertical padding, separator rules between rows, hover in indigo tint at 60%. Numbers right-aligned in tabular figures; ids in mono gray under the name.

### Figure Strip (signature)
One 14px-radius group split by 1px separator gaps into equal white cells: 14px gray label, 24px/600 tabular figure, 12px gray hint naming the window. No icons, no coloured tiles.

### Charts (signature)
One systemIndigo series on a faint grid with 12px gray ticks; bar tops rounded 4px. Today's bar, or today's point on a line, is systemOrange. Category bars use the fixed face-shape hues. Every chart group carries a ghost chart/table switch so the numbers read as text.

### App Icon (signature)
The scissors mark on a systemIndigo rounded-square tile: 28px at 7px radius in the sidebar, 64px at 18px radius above the login large title.

## Do's and Don'ts

### Do:
- **Do** set groups white (dark-group in dark), 14px radius, no border, the soft lift shadow, on the grouped gray ground.
- **Do** use Apple system colours with their dark values, from the tokens in `globals.css`.
- **Do** fill the selected sidebar row with systemIndigo and white text and icon.
- **Do** keep the sidebar and phone top bar translucent with blur and saturation.
- **Do** reserve orange for today and attention: today's bar, the date dot, stars, attention badges.
- **Do** use gray-fill buttons for secondary actions and capsules for badges and chips.
- **Do** open every page with one bold large title at -0.022em and a gray subline.
- **Do** give every chart a table view and a description that names its window.
- **Do** keep the date chip on Overview only.

### Don't:
- **Don't** add borders or outlines to cards, figure strips or tables, or outline-stroke secondary buttons.
- **Don't** introduce a non-system hue or a second accent family.
- **Don't** use orange for decoration, buttons or a face shape.
- **Don't** put icons in coloured circles on figure cells.
- **Don't** make the sidebar opaque or dark in light mode.
- **Don't** use all-caps, letter-spaced kickers or condensed caps.
- **Don't** fill destructive buttons solid red; use the red tint.
