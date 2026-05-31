# Visual Brief

## Visual Thesis

A quiet local operations console for Codex: precise, readable, and file-system aware without decorative chrome.

Revision direction: the first viewport should answer "is Codex readable, what changed recently, and where do I inspect next?" before showing raw tables.

## Palette And Type

- Palette: near-white workspace, ink text, cool gray separators, blue accent for active navigation and live sync.
- Type: system UI stack for Windows-native feel and predictable rendering.
- Density: compact but readable tables; keep inspectors contextual and avoid squeezing primary content.
- Information hierarchy: group data into Status, Activity, Knowledge, Extensibility, and Diagnostics.

## Asset Plan

- Use a generated `.ico` application icon.
- Use no external photos, logos, or hosted assets.
- Treat all local Codex data as private runtime input, never as bundled assets.

## Toolchain

- Electron main/preload for desktop shell and read-only Codex filesystem access.
- React + TypeScript + Vite for renderer UI.
- `electron-builder` NSIS + portable targets for Windows distribution.

## QA Plan

- `npm run doctor` against local or fixture Codex home.
- `npm run test`, `npm run build`, and `npm run secret:scan`.
- Rendered QA must check no first-viewport horizontal table scroll or text overlap at 1360x860 and 1120x760.
- Build installer with `npm run dist:win`; verify desktop shortcut manually after installation.
