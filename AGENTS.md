# GhostMark Agent Guide

## Project Overview

GhostMark is a professional, privacy-first, browser-only PDF watermarking app.

Product positioning:

> Professional PDF watermarking. Private by design.

Main privacy message:

> Your document never leaves your device.

The app must feel like serious paid software while remaining free and open-source.

## Repository Structure

```text
src/
  main.tsx
  app/
    App.tsx
    AppProviders.tsx
  components/
    layout/
    ui/
    language/
    pdf/
    watermark/
    security/
    export/
  features/
    pdf/
    watermark/
    security/
    i18n/
  types/
  styles/
public/
  icons/
  fonts/
.github/workflows/deploy.yml
```

## Install Dependencies

```bash
npm install
```

## Run Development Server

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Typecheck

```bash
npm run typecheck
```

## Coding Conventions

- Use strict TypeScript.
- Keep React components small and focused.
- Put reusable app logic in `src/features`.
- Put shared type definitions in `src/types`.
- Keep product copy in i18n dictionaries where practical.
- Default visible UI text, README text, comments, and documentation must be English.
- Spanish text belongs only in the Spanish translation file.
- Add comments only when they clarify non-obvious behavior or constraints.
- Do not add backend assumptions, network calls, or persistence features.

## Privacy And Security Constraints

GhostMark must remain:

- Browser-only.
- Backend-free.
- Database-free.
- Telemetry-free.
- Analytics-free.
- Cookie-free.
- Account-free.
- CDN-free.
- Offline-build friendly.

PDF files must be processed locally through browser memory. Do not add file upload endpoints, remote processing, cloud sync, document history, recent documents, autosave, or automatic document persistence.

Hosted deployments may still create hosting-provider access logs. Keep the copy honest and avoid claims of guaranteed anonymity or certified classified handling.

## Design Constraints

GhostMark should feel:

- Mature.
- Serious.
- Enterprise-grade.
- Document-control oriented.
- Security-software inspired.
- Calm and trustworthy.
- Closer to a desktop application than a marketing site.

Avoid:

- Excessive gradients.
- Glassmorphism.
- Neon colors.
- Floating abstract blobs.
- Generic purple or blue AI styling.
- Toy-like icons.
- Fake futuristic effects.
- Excessive animation.
- Generic startup landing-page sections.

Use restrained graphite, navy-black, muted steel, document off-white, pale amber, muted green, and muted red tones.

## Prohibited Dependencies And Features

Do not add:

- Google Analytics.
- Plausible.
- Matomo.
- Sentry.
- LogRocket.
- PostHog.
- Telemetry SDKs.
- Cookie libraries.
- Login systems.
- Databases.
- Upload endpoints.
- Remote API calls.
- CDN-hosted scripts.
- CDN-hosted fonts.
- Automatic document persistence.
- Recent documents.
- Cloud sync.

## GitHub Pages

Vite must keep:

```ts
base: "/GhostMark/"
```

The deployment workflow should use official GitHub Pages actions and deploy the `dist` artifact.

## Acceptance Criteria Before Committing Changes

Before committing, run:

```bash
npm run typecheck
npm run test
npm run build
```

Also verify:

- PDF import remains local.
- PDF export creates a local Blob download.
- No remote calls, analytics, cookies, or telemetry were introduced.
- Classified Mode does not persist language selection.
- New user-visible strings are in the i18n dictionaries where practical.
- Scaffolded features are clearly marked as planned or coming soon.
- The UI still looks like a professional document-control application.
