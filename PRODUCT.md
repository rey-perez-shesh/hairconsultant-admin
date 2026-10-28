# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Three audiences share one admin dashboard:

- **Owner / developer**: checks usage stats, manages admins, fixes data, mostly on desktop.
- **Salon staff**: non-technical, manage the haircut catalogue and read customer feedback day to day, sometimes from a phone or tablet in the shop.
- **Thesis / demo panel**: evaluators shown the system. The first impression and how clearly the dashboard explains the app's mechanism both count.

## Product Purpose

HairConsultant is an Android app that classifies a user's face shape (live scan or photo upload), recommends haircuts from a catalogue, lets them try styles on in AR, and offers a Gemini-backed AI stylist. This dashboard is the app's control room: it edits the catalogue live (no new APK needed), moderates users, reads feedback, and shows how the app is used. Success: staff can keep the catalogue right without help, and anyone can see at a glance whether the app is being used and liked.

## Positioning

The catalogue is driven by face-shape analysis. Each style carries face shapes, hair length and texture, and an AR try-on asset, and usage data reports back by face shape, classifier confidence and favourites. The dashboard shows that loop from face shape to style to rating, not just generic CRUD.

## Constraints

- Next.js static export on Firebase Hosting; shadcn/Base UI components, Tailwind v4, recharts, lucide icons.
- Dates shown in Philippine time.
- Light and dark themes are both supported today.
- Destructive actions (delete user, revoke admin) must stay confirmed and audited.
