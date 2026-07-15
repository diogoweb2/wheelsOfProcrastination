# 🦥 Wheels of Procrastination

A mobile-first PWA that kills small-task procrastination with a wheel of fortune, a
Duolingo-style streak/gem economy, and a sloth with opinions.

**The rules of the game live in [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md) — keep it updated when anything changes.**

## Run it

```bash
npm install
npm run dev        # local dev
npm run build      # production build (PWA, service worker, manifest)
npm run preview    # serve the production build
```

Install on Android: open the served URL in Chrome → menu → *Add to Home screen*.

## Tour

- **Spin** — pick an effort filter (low/med/high/all), spin, do the task, tap complete. Re-spins cost gems (cheap once/day, painful after).
- **Tasks** — add/edit tasks. Urgent tasks can be hand-picked for free; hand-picking a non-urgent one costs more than it pays. On purpose.
- **Map** — Duolingo-style path of everything you completed (colored by effort, ⚡ for urgent, 🧊 for frozen days).
- **Habits** — per-habit streaks, 30-day strips, weekly bars.
- **Me** — streak hero, streak goal (+50 💎), freeze shop (150 💎, max 2), trophy shelf, reminder settings.

## Architecture notes

- React + Vite + TypeScript + zustand; `vite-plugin-pwa` (auto-update SW).
- All persistence goes through `src/store/storage.ts` (localStorage today) — swap that file for Firestore when Firebase lands.
- Economy/wheel/streak rules are pure functions in `src/logic/` mirrored 1:1 by the BRD.
- Sounds are WebAudio-synthesized (`src/audio.ts`); the mascot is hand-coded SVG (`src/components/Sloth.tsx`). No binary assets except PWA icons.
- 4-digit PIN hashed (SHA-256 + salt) in localStorage; unlock is per browser session.
- Daily reminders are best-effort local notifications until Firebase Cloud Messaging is wired.

## Planned (not built yet)

Firebase: Auth (multiuser), Firestore sync, FCM push reminders.
