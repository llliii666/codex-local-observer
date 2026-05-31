# Visual Brief

## Visual Thesis

A quiet but polished local operations console for Codex: precise, readable, file-system aware, and visually mature without becoming a marketing landing page.

Revision direction: the first viewport should answer "is Codex readable, what changed recently, and where do I inspect next?" before showing raw tables.

Second revision direction: make install/download a first-class product flow, not a README afterthought. The app should explain installer vs portable vs source mode clearly.

## Palette And Type

- Palette: near-white workspace, ink text, cool gray separators, blue for navigation, teal for local-safe/readable state, and amber for warm operational emphasis.
- Type: system UI stack for Windows-native feel and predictable rendering.
- Density: compact but readable tables; keep inspectors contextual and avoid squeezing primary content.
- Information hierarchy: group data into Status, Activity, Knowledge, Extensibility, and Diagnostics.
- Motion: subtle entrance, hover lift, status pulse, and hero scan only; include reduced-motion fallback.

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
- Rendered QA must include the install/download page at 1360x860 and 1120x760.
- Build installer with `npm run dist:win`; verify desktop shortcut manually after installation.
