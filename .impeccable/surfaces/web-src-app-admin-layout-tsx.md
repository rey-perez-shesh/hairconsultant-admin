---
version: 1
slug: "web-src-app-admin-layout-tsx"
primary_target: "web/src/app/(admin)/layout.tsx"
related_targets: ["web/src/app/login/page.tsx"]
---

# Admin dashboard (all pages)

Mode: Operate. Scope: shell, login, Overview, Catalogue (+editor), Users (+detail), Feedback, Analytics, Admins & audit. Third pass (user request, 2026-10-28): "look like it was designed by Apple designers", on top of the modern redesign (rounded cards, date chip on Overview only, sentence case). Data, copy, features, light/dark stay.

## Direction contract

THESIS: Apple's own product language (macOS Settings, Music, App Store Connect) applied to a salon admin: grouped gray ground, borderless white inset groups, a vibrancy sidebar with a filled accent selection. Refuses the outlined-card SaaS kit.
OWN-WORLD: Apple system colours: systemGroupedBackground #f2f2f7 / black, white #fff / #1c1c1e groups with no border, hairline separators rgb(60 60 67 / 0.13). systemIndigo #5856d6 is the accent (primary button, data series, selected sidebar row filled with white text). systemOrange #ff9500 is the one highlight (today's bar, date dot, stars, attention badges). systemGreen switches, capsule badges, gray-fill secondary buttons. Face shapes on systemBlue, systemBrown, teal, systemPink, systemGreen. SF Pro via -apple-system, Inter as the stand-in elsewhere; large bold titles at -0.022em.
STORY: Staff see whether the app is used and liked, then fix the catalogue.
FIRST VIEWPORT: Translucent 240px sidebar (blur + saturate) with app-icon mark, six rows, account row at the foot. Overview: 32px bold large title and gray subline left; capsule date + live PHT chip and a gray "Recalculate stats" button right. Six-cell grouped figure strip with hairline dividers; consultations-per-day bars (today orange) and face-shape split; latest feedback in a 384px rail.
FORM: user-pinned brief (Apple design language; modern layout from the previous Taste accent-ladder deal, seed 1929190988); no impeccable roll.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
