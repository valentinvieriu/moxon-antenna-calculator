# Moxon Antenna Calculator

A small Next.js app for calculating **Moxon rectangle antenna dimensions** from frequency and wire size.

It provides:
- Instant dimension calculations (A, B, C, D, E)
- Wire cut lengths for driven element and reflector
- Multiple input/output units
- Optional insulated-wire velocity-factor correction
- 2D diagram + interactive 3D preview
- One-click export of a **3D-printable STL frame** for building

## Features

- **Cebik-based geometry math** for Moxon dimensions.
- **Input units**: mm, inches, AWG, and wavelength fraction.
- **Output units**: wavelengths, feet, inches, meters, millimeters.
- **Practical build outputs** including cut lengths (`A + 2×B`, `A + 2×D`).
- **Insulated wire mode** (default VF correction: 0.97).
- **STL generator** with configurable channel tolerance, wall/floor thickness, chamfers, bridges, and mounting tail/hole.

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Radix UI components
- React Three Fiber / Drei (3D preview)

## Getting Started

### Prerequisites

- Node.js 18+ (or newer)
- npm

### Install

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

### Production build

```bash
npm run build
npm run start
```

## How to Use

1. Enter operating **frequency (MHz)**.
2. Enter **wire diameter** and choose its unit.
3. Optionally enable **insulated wire**.
4. Review calculated dimensions and cut lengths.
5. Switch display units as needed.
6. (Optional) download STL for a printable support frame.

The app defaults to an EU868 Meshtastic example (869.525 MHz, 1.38 mm conductor).

## Project Structure

- `app/page.tsx` – main calculator page and UI composition
- `lib/moxon-calculator.ts` – core dimension and unit-conversion logic
- `lib/moxon-stl-generator.ts` – binary STL generation utilities
- `components/` – form, diagram, results table, and 3D preview components

## PR Build Previews

Every pull request targeting `main` now triggers the **PR Preview Build** GitHub Actions workflow.

It will:
- install dependencies
- run a production `next build`
- upload a downloadable build artifact (`nextjs-preview-<pr-number>`)

Use this artifact to verify that the app builds successfully before merging.

### Where do I view it?

This workflow does **not** publish a live URL by itself. It produces a downloadable build artifact.

For a PR:
1. Open the PR on GitHub.
2. Go to **Checks** and open **PR Preview Build**.
3. Open the workflow run and download `nextjs-preview-<pr-number>` from the **Artifacts** section.

If you need a clickable preview URL per PR, use a preview-deploy platform (for example Vercel/Netlify) in addition to this build check.

## Notes

- This tool helps with dimensioning and prototyping; real-world performance still depends on materials, assembly quality, nearby objects, and tuning/measurement.
- Algorithm attribution in code: L.B. Cebik, W4RNL.

## License

No license file is currently included in this repository.
