 App Store launch checklist

  ✅ Done

  - App name + bundle ID + slug + scheme set in app.json
  - Production logging gated behind __DEV__
  - ErrorBoundary wrapping the app
  - Account deletion (UI + edge function code) — Apple requirement
  - Forgot-password + set-new-password flow
  - Account screen (sign out + delete)
  - Privacy policy drafted (docs/privacy.md)
  - App Store Connect listing created with bundle ID com.lowliftfitness.app

  🚧 Still required to ship

  1. Deploy the delete-account edge function
  supabase functions deploy delete-account
  Then test from the new Account screen → Delete account.

  2. Host the privacy policy
  Take docs/privacy.md, render it to HTML, host at a stable URL (e.g.
  lowliftfitness.com/privacy). Webflow / Carrd / Cloudflare Pages all work.

  3. App icon — 1024×1024 PNG, no alpha, no rounded corners. Drop into
  app/assets/icon.png. Need adaptive variant for Android too (adaptive-icon.png).

  4. Splash screen — replace app/assets/splash-icon.png with branded asset.

  5. Screenshots — minimum 3 per required device size. Apple requires 6.7" iPhone
  (1290×2796); 6.5" (1242×2688) is also commonly required. Capture from the
  simulator running a clean build with seeded data.

  6. App Store Connect — App Information tab
  - Category: Health & Fitness (primary), Lifestyle (secondary, optional)
  - Content Rights: No
  - Age Rating: complete questionnaire — answer "None" to everything → 4+
  - Privacy Policy URL: paste from step 2

  7. App Store Connect — App Privacy questionnaire
  Declare exactly:
  - Email Address — linked to user, App Functionality (Authentication), no tracking
  - User ID — linked to user, App Functionality, no tracking
  - Product Interaction — linked to user, Analytics + App Functionality, no tracking
  - Everything else: No

  List Supabase as a third-party Service Provider.

  8. App Store Connect — Pricing
  - Price: Free
  - Availability: all countries (or pick)

  9. App Store Connect — App Store tab (this version)
  - Description (long copy)
  - Promotional text (170 char tagline)
  - Keywords (100 char comma-separated list)
  - Support URL (can be the privacy policy host or a contact page)
  - Marketing URL (optional)
  - Version 1.0
  - What's New: "Initial release."
  - Copyright: e.g. © 2026 Taylor Pangilinan

  10. Production build via EAS
  npm i -g eas-cli
  eas login
  cd app
  eas build:configure
  eas build --platform ios --profile production
  First build will take 15–25 minutes on Expo's servers. EAS handles certs and
  provisioning automatically against your Apple Developer account.

  11. Upload + attach build to App Store Connect
  eas submit --platform ios
  Build appears under TestFlight → can be selected as the version 1.0 build in your
  listing.

  12. Test on TestFlight first — install on your real iPhone via TestFlight before
  submitting. Verify:
  - Signup → email confirm → onboarding → dashboard
  - Forgot password → email link → set new password
  - Start session → complete → recent shows
  - Account screen → delete account → goes back to auth, user gone in Supabase

  13. Submit for App Store Review
  In App Store Connect, hit Add for Review. Apple typically reviews in 24–48 hours.
  Common rejection reasons to preempt:
  - Account deletion not working → fix function
  - Privacy policy URL broken → make sure it loads
  - Missing demo credentials → in App Review Information, provide a test email +
  password so the reviewer can sign in
  - Crash on launch → test the exact build TestFlight has

  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth
  method, but reduces signup friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam
  warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk
  you through it.

✻ Baked for 53s

────────────────────────────────────────────────────────────────────────────────────
❯ 
────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)
  provisioning automatically against your Apple Developer account.

  11. Upload + attach build to App Store Connect
  eas submit --platform ios
  Build appears under TestFlight → can be selected as the version 1.0 build in your
  listing.

  12. Test on TestFlight first — install on your real iPhone via TestFlight before
  submitting. Verify:
  - Signup → email confirm → onboarding → dashboard
  - Forgot password → email link → set new password
  - Start session → complete → recent shows
  - Account screen → delete account → goes back to auth, user gone in Supabase

  13. Submit for App Store Review
  In App Store Connect, hit Add for Review. Apple typically reviews in 24–48 hours.
  Common rejection reasons to preempt:
  - Account deletion not working → fix function
  - Privacy policy URL broken → make sure it loads
  - Missing demo credentials → in App Review Information, provide a test email +
  password so the reviewer can sign in
  - Crash on launch → test the exact build TestFlight has

  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth
  method, but reduces signup friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam
  warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk
  you through it.

✻ Baked for 53s

────────────────────────────────────────────────────────────────────────────────────
❯ 
────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)

  11. Upload + attach build to App Store Connect
  eas submit --platform ios
  Build appears under TestFlight → can be selected as the version 1.0 build in your
  listing.

  12. Test on TestFlight first — install on your real iPhone via TestFlight before
  submitting. Verify:
  - Signup → email confirm → onboarding → dashboard
  - Forgot password → email link → set new password
  - Start session → complete → recent shows
  - Account screen → delete account → goes back to auth, user gone in Supabase

  13. Submit for App Store Review
  In App Store Connect, hit Add for Review. Apple typically reviews in 24–48 hours.
  Common rejection reasons to preempt:
  - Account deletion not working → fix function
  - Privacy policy URL broken → make sure it loads
  - Missing demo credentials → in App Review Information, provide a test email +
  password so the reviewer can sign in
  - Crash on launch → test the exact build TestFlight has

  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth
  method, but reduces signup friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam
  warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk
  you through it.

✻ Baked for 53s

────────────────────────────────────────────────────────────────────────────────────
❯ 
────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)
  Common rejection reasons to preempt:
  - Account deletion not working → fix function
  - Privacy policy URL broken → make sure it loads
  - Missing demo credentials → in App Review Information, provide a test email +
  password so the reviewer can sign in
  - Crash on launch → test the exact build TestFlight has

  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth
  method, but reduces signup friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam
  warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk
  you through it.

✻ Baked for 53s

────────────────────────────────────────────────────────────────────────────────────
❯ 
────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)
  - Account deletion not working → fix function
  - Privacy policy URL broken → make sure it loads
  - Missing demo credentials → in App Review Information, provide a test email +
  password so the reviewer can sign in
  - Crash on launch → test the exact build TestFlight has

  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth
  method, but reduces signup friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam
  warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk
  you through it.

✻ Baked for 53s

────────────────────────────────────────────────────────────────────────────────────
❯ 
────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)
  - Privacy policy URL broken → make sure it loads
  - Missing demo credentials → in App Review Information, provide a test email +
  password so the reviewer can sign in
  - Crash on launch → test the exact build TestFlight has

  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth
  method, but reduces signup friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam
  warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk
  you through it.

✻ Baked for 53s

────────────────────────────────────────────────────────────────────────────────────
❯ 
────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)
  - Missing demo credentials → in App Review Information, provide a test email +
  password so the reviewer can sign in
  - Crash on launch → test the exact build TestFlight has

  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth
  method, but reduces signup friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam
  warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk
  you through it.

✻ Baked for 53s

────────────────────────────────────────────────────────────────────────────────────
❯ 
────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)
  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth
  method, but reduces signup friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam
  warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk
  you through it.

✻ Baked for 53s

────────────────────────────────────────────────────────────────────────────────────
❯ 
────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)
  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth method, but reduces signup
  friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk you through it.

✻ Baked for 53s

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
❯ 
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)
  - Crash on launch → test the exact build TestFlight has

  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth method, but reduces signup
  friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk you through it.

✻ Baked for 53s

──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
❯ 
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ accept edits on (shift+tab to cycle)
  - Account screen → delete account → goes back to auth, user gone in Supabase

  13. Submit for App Store Review
  In App Store Connect, hit Add for Review. Apple typically reviews in 24–48 hours. Common rejection reasons to
  preempt:
  - Account deletion not working → fix function
  - Privacy policy URL broken → make sure it loads
  - Missing demo credentials → in App Review Information, provide a test email + password so the reviewer can sign
   in
  - Crash on launch → test the exact build TestFlight has

  📝 Things you can leave for v1.1

  - Sign in with Apple (not strictly required if email/password is the only auth method, but reduces signup
  friction — solid post-MVP add)
  - Push notifications
  - Sound effects (PRD P1-01, P1-02)
  - Smooth movement transitions (P1-04)
  - DMARC record + email reputation polish (only matters if you're seeing the spam warnings still)

  Order I'd tackle today

  1. Deploy edge function (5 min)
  2. Host privacy policy (15 min)
  3. Final icon + splash assets in (depends on design)
  4. Take screenshots from simulator (20 min)
  5. Fill App Store Connect tabs in parallel (1–2 hr)
  6. Run eas build (background, ~20 min)
  7. TestFlight install + smoke test (15 min)
  8. Submit

  Step 1 + 2 unblock the most. Tell me which one you want to start on and I'll walk you through it.
