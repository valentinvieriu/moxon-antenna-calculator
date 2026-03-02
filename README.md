# Moxon Antenna Calculator

A small Next.js app for calculating **Moxon rectangle antenna dimensions** from frequency and wire size.

It provides:
- Instant dimension calculations (A, B, C, D, E)
- Wire cut lengths for driven element and reflector
- Multiple input/output units
- Optional insulated-wire velocity-factor correction
- 2D diagram + interactive 3D preview
- One-click export of a **3D-printable STL frame** for building

## Calculation Method (Deep Dive)

This project implements a **Cebik-style polynomial method** to estimate practical Moxon rectangle dimensions from two primary inputs:

1. Operating frequency in MHz
2. Conductor diameter (mm, inches, AWG, or wavelengths)

### 1) Convert to electrical diameter

The original formulas are based on conductor diameter in **wavelengths** (`dw`), so all diameter inputs are normalized first:

- `dw = diameter / wavelength_in_same_units`
- with `wavelength = c / f` expressed in feet, inches, meters, or millimeters per MHz

For AWG input, we first convert gauge to diameter in inches:

- `diameter_in = 0.005 * 92^((36 - AWG) / 39)`

Then convert inches to wavelengths.

### 2) Use `log10(dw)` as the polynomial variable

The Cebik fit equations use base-10 logarithm of electrical diameter:

- `x = log10(dw)`

In code this is computed via natural log as:

- `x = 0.4342945 * ln(dw)`

### 3) Evaluate fitted geometry equations

The app calculates the four primary geometry terms in wavelengths (`A`, `B`, `C`, `D`) using the fitted coefficients:

- `A = -0.0008571428571*x^2 - 0.009571428571*x + 0.3398571429`
- `B = -0.002142857143*x^2 - 0.02035714286*x + 0.008285714286`
- `C =  0.001809523381*x^2 + 0.01780952381*x + 0.05164285714`
- `D =  0.001*x + 0.07178571429`

Where:

- `A`: full horizontal element span
- `B`: driven element bent tail length
- `C`: inner gap between tip ends
- `D`: reflector bent tail length

Then the total depth is derived:

- `E = B + C + D`

### 4) Apply practical build correction factors

After the baseline geometry is computed, dimensions are scaled by a combined factor:

- `velocityFactor = sleeveFactor * materialFactor`

Current defaults:

- sleeve off: `1.0`
- sleeve on: `0.97`
- copper material: `1.0`
- stainless material: `0.992`

This keeps the model practical for common hobby builds where insulation and conductor choice can shift effective electrical length.

### 5) Compute cut lengths

To support construction directly, the app computes total conductor lengths to cut:

- Driven element: `A + 2*B`
- Reflector element: `A + 2*D`

These are reported in all output unit systems.

### 6) Convert wavelengths to requested units

Each wavelength-domain result is multiplied by one-wavelength length at the chosen frequency:

- feet: `983.5592 / f_MHz`
- inches: `11802.71 / f_MHz`
- meters: `299.7925 / f_MHz`
- millimeters: `299792.5 / f_MHz`

This allows exact unit switching in UI without recomputing the core geometry.

### Validity and reliability notes

- The model is very fast and ideal for first-pass design and printable fixtures.
- A warning is emitted when `log10(dw)` falls outside a practical range (`< -6` or `> -2`), since extrapolated polynomial fits may become less reliable.
- Real-world resonance still depends on nearby materials, construction accuracy, feed arrangement, and installation environment. Final trimming and measurement (e.g., VNA/SWR) are recommended.

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

## Notes

- This tool helps with dimensioning and prototyping; real-world performance still depends on materials, assembly quality, nearby objects, and tuning/measurement.
- Algorithm attribution in code: L.B. Cebik, W4RNL.

## License

No license file is currently included in this repository.
