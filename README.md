# Swim Land Training

A super simple mobile-first land training tracker for gym, mobility, and flexibility work. It is a static React + Vite + TypeScript app designed to run for free on GitHub Pages with all version 1 data stored in browser `localStorage`.

## Tech Stack

- React
- Vite
- TypeScript
- Plain CSS
- Browser `localStorage`
- GitHub repository JSON sync
- GitHub Pages and GitHub Actions

No backend API, database, server-side hosting, or paid service is required. GitHub sync uses the GitHub Contents API from the browser when you enter a fine-grained token.

## Run Locally

```bash
npm install
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173/`.

## Build

```bash
npm run build
```

The static site is generated in `dist/`.

## Deploy to GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml`.

1. Push the app to the `main` branch.
2. In GitHub, open the repository settings.
3. Go to **Pages**.
4. Set **Build and deployment** to **GitHub Actions**.
5. Push to `main` or run the workflow manually.

The workflow installs dependencies, runs `npm run build`, uploads `dist`, and deploys it to GitHub Pages.

## Vite Base Path

The current repository is `GymApp`, so `vite.config.ts` uses:

```ts
base: '/GymApp/'
```

If the repository name changes, update this value to match the new GitHub Pages path:

```ts
base: '/NEW_REPOSITORY_NAME/'
```

Also update these files if the repo path changes:

- `public/manifest.webmanifest`
- `public/sw.js`

For a custom domain at the web root, use:

```ts
base: '/'
```

## How Data Works

The app saves first to browser `localStorage` so the workout flow remains fast and resilient.

The app stores:

- Program definitions, including Program A, Program B, and Flexibility
- Exercise definitions
- Workout history
- Most recent value per exercise

The storage code lives in `src/services/storageService.ts` so localStorage access is not scattered through the app.

After finishing a program, the app also attempts to sync the complete export to this repository:

```text
data/workout-data.json
data/codex-land-training-summary.json
```

The sync uses a fine-grained GitHub token for `PaulNichols/GymApp` with **Contents: Read and write** permission. The token is prompted for on first sync on a device and stored only in that browser's local storage, not in source code or the repository. Use **Forget token** on the GitHub Sync page to remove it from that browser.

The repository summary avoids raw notes and is the preferred file for weekly Codex coaching. The full `workout-data.json` remains available when deeper review is needed.

Privacy note: this repository is public, so committed workout data is publicly readable.

## Use the App

1. Open the app on your phone.
2. Choose **Program A**, **Program B**, or **Flexibility**.
3. Work through one exercise at a time.
4. Check the visual cue card or tap **Watch form videos** for YouTube form search results.
5. Enter today’s value and optional notes.
6. Tap **Save and Next**.
7. Tap **Finish Program** on the final exercise.

Each exercise shows the most recent saved value, for example `Last time: 35 kg`. If there is no history, it shows `No previous entry`.

Each default exercise also includes a short swimming transfer note explaining how it helps and which stroke it supports.

## Edit Programs

Open **Admin / Edit Programs** to:

- View Program A or Program B
- Add exercises
- Edit exercise name, equipment, unit, category, and image URL
- Edit YouTube URL and visual cue text
- Edit the swimming transfer description
- Delete exercises
- Move exercises up or down
- Reset back to the default programs

Program edits are stored in `localStorage`.

## Sync Data

Open **GitHub Sync** and tap **Sync to GitHub** to push the current local programs and workout history to the repository.

The app also syncs after **Finish Program**. If you cancel the token prompt or GitHub rejects the token, the session remains saved locally and the app shows the sync error.

To rebuild the Codex summary locally:

```bash
npm run summarise:workouts
```

## Default Programs

Program A is Pull, legs, core.

Program B is Swim power, back, hips, shoulders.

Flexibility is a 10-15 minute land mobility routine for evenings, after a walk, or after a shower. It includes cat-camel, child's pose, lower-back rotations, hip flexor, glute, hamstring, calf, forward fold, and thoracic rotation work.

The routine also includes three gentle upper-body options: a seated chest opener (5-10 seconds, 5 times), a cross-body shoulder stretch (20-30 seconds once each side), and a seated upper-back twist (5-second holds, 5 times each side). Allow a few extra minutes if doing all three. The cues use an easy, pain-free range, relaxed breathing, and no bouncing, pressure on the elbow, or pulling on the wrist/chair. Stop any movement that hurts; these are general flexibility options, not an injury rehabilitation programme. If pain persists or you are unsure about a movement, check with a physiotherapist or GP.

Guidance checked on 6 October 2026: [NHS sitting exercises](https://www.nhs.uk/live-well/exercise/sitting-exercises/) for the chest opener and upper-body twist, and [AAOS shoulder conditioning](https://www.orthoinfo.org/recovery/rotator-cuff-and-shoulder-conditioning-program/) for the cross-body stretch and avoiding elbow pressure. The shoulder stretch uses a shorter, optional single round rather than the full AAOS rehabilitation programme.

Existing September routines receive only these three additions once. July routines also receive the earlier bird-dog and glute-bridge additions. Existing exercise edits, order, workout history, and deletions outside the applicable additions are preserved; a new stretch deleted after migration stays deleted.

The included default exercises match the first version requirements and use sensible default units such as `kg` and `seconds`.

Each default exercise also includes short form cues and a YouTube search link. The app does not bundle copyrighted exercise photos or videos.

## PWA Support

The app includes a web app manifest, placeholder icon, theme colour, and a small service worker for basic offline caching after the production site has loaded once.

On iPhone, open the deployed GitHub Pages site in Safari and use **Add to Home Screen**.

## Future Improvements

- Cloud sync
- User login
- Charts
- Personal bests
- Exercise images
- Rest timer
- Apple Health integration
- Multiple users
- Supabase backend option
- Firebase backend option
- Azure Static Web Apps option
- Azure Functions and Table Storage backend option for later cloud storage
- Ability to track reps and sets properly
- Ability to record perceived effort
- Ability to record bodyweight
- Ability to export CSV
