# Visual Brief

## Visual Thesis

A quiet local operations console for Codex: precise, readable, and file-system aware without decorative chrome.

## Palette And Type

- Palette: near-white workspace, ink text, cool gray separators, blue accent for active navigation and live sync.
- Type: system UI stack for Windows-native feel and predictable rendering.
- Density: compact tables and inspector panels; no marketing hero or dashboard-card mosaic.

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
- Build installer with `npm run dist:win`; verify desktop shortcut manually after installation.
