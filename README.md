# HairConsultant Admin

Web dashboard and Firebase backend for the HairConsultant Android app (`AndroidStudioProjects/HairConsultant`).

| Folder | What it is |
|---|---|
| `web/` | Next.js dashboard (static export, served by Firebase Hosting) |
| `functions/` | Cloud Functions: admin roles, user disable/delete, stats counters, Gemini proxy |
| `firestore.rules`, `storage.rules`, `firestore.indexes.json` | Security rules and indexes for the whole project (app + dashboard) |
| `rules-tests/` | Emulator tests for the security rules |

## Dashboard features

- **Overview**: users, consultations, satisfaction, active styles, consultations per day, latest feedback.
- **Catalogue**: list/filter styles, show/hide, reorder, create/edit/delete. Upload thumbnails and AR try-on files (`.deepar` effects or `.glb` models with fit values and a live 3D preview). The app picks changes up the next time Home loads; no new APK is needed.
- **Users**: search by email, profile with consultation history and reviews, disable/enable, permanently delete a user and all their data.
- **Feedback**: rating distribution, daily average, filterable reviews, CSV export.
- **Analytics**: daily trends, face shape / length / texture / gender breakdowns, most chosen and most favorited styles, classifier confidence, AI stylist usage.
- **Admins & audit**: grant/revoke admin access; every admin change is logged.

## Run it locally (emulators, no real data touched)

Needs Node 22+ and Java 11+ (Android Studio's bundled JBR works).

```bash
# one-time installs
cd functions && npm install && npm run build && cd ..
cd web && npm install && cd ..
cd rules-tests && npm install && cd ..          # also provides the firebase CLI

# local-only settings (git-ignored)
echo "BOOTSTRAP_ADMIN_EMAIL=owner@demo.test" > functions/.env.local
echo "GEMINI_API_KEY=emulator-placeholder"  > functions/.secret.local

# terminal 1: emulators
npx --prefix rules-tests firebase emulators:start --project demo-hairconsultant --only auth,firestore,storage,functions

# terminal 2: sample data, then the dashboard
npm --prefix functions run seed:emulator
cd web && NEXT_PUBLIC_USE_EMULATORS=true npm run dev
```

Open http://localhost:3000 and sign in as `admin@demo.test` / `password123`. The emulator UI is at http://127.0.0.1:4000.

> If the emulator prints "Failed to load function definition ... Timeout after 10000" on its first start, run `touch functions/lib/index.js` (it reloads and loads fine).

Tests:

```bash
cd functions && npm test               # stats bookkeeping
cd rules-tests && npm test             # security rules (starts its own emulators)
```

## First deploy to the real project (`hiarconsultant`)

Do these **in order** — the rules must be live before the catalogue is upgraded, because older app versions still try to rewrite the catalogue on launch (the new rules block them).

1. **Firebase console**
   - Upgrade the project to the **Blaze** plan (Cloud Functions require it; normal use stays inside the free tier).
   - Project settings → Your apps → **Add app → Web**. Copy the config into `web/.env.local` (see `web/.env.example`).
   - Firestore → note the database **location**.
2. **`functions/.env`**: set `FUNCTIONS_REGION` to match that location (e.g. `asia-southeast1`; use `us-central1` for `nam5`) and `BOOTSTRAP_ADMIN_EMAIL` to your own email. Set `NEXT_PUBLIC_FUNCTIONS_REGION` in `web/.env.local` to the same region.
3. **CLI**:
   ```bash
   npx --prefix rules-tests firebase login
   npx --prefix rules-tests firebase functions:secrets:set GEMINI_API_KEY      # paste the key from the app's local.properties
   npx --prefix rules-tests firebase deploy --only firestore,storage,functions
   cd web && npm run build && cd ..
   npx --prefix rules-tests firebase deploy --only hosting
   ```
   The dashboard is then at `https://hiarconsultant.web.app`.
4. **Become the first admin**: your email must be a Firebase Auth account (register it in the app, or add it under Authentication → Users). Sign in to the dashboard, press **Send verification email**, open the link, then **Claim first admin role**. Add other admins from *Admins & audit*.
5. **Catalogue setup** (Catalogue page): click **Upgrade**, then **Choose files** and select every `thumb_*.png` from `HairConsultant/app/src/main/res/drawable`.
6. **Stats**: click **Recalculate stats** once so data from before the deploy is counted.
7. **Android app** (`admin-dashboard-backend` branch): in `local.properties` set
   `GEMINI_PROXY_URL=https://<FUNCTIONS_REGION>-hiarconsultant.cloudfunctions.net/geminiProxy`
   and remove `GEMINI_API_KEY`, then rebuild and install. Rotate the old Gemini key in Google AI Studio afterwards: it shipped inside earlier APKs.
8. **Optional: App Check**: register the Android app (Play Integrity) and the debug token printed in Logcat under App Check, and add a reCAPTCHA provider for the web app before enforcing.

## How the pieces fit

- The app reads the catalogue from Firestore `haircuts` (cached in Room, with the bundled `SampleData` as a fresh-install fallback). Only accounts with the `admin` custom claim can write it.
- Uploaded AR files live in Storage at `haircuts/{id}/effect-<n>.deepar` or `model-<n>.glb`. The app downloads each version once into its private storage. Styles left on **Bundled in app** keep using the AR assets inside the APK.
- `stats/global` and `statsDaily/{YYYY-MM-DD}` (Philippine time) are kept up to date by Firestore triggers; **Recalculate stats** rebuilds them from scratch.
- The app calls Gemini through `geminiProxy`, which checks the user's Firebase sign-in (disabled accounts are refused), rate-limits each user (30/min, 500/day) and keeps the API key on the server.
- Admins can see users, consultations and feedback, but not AI chat transcripts (only usage counts).
