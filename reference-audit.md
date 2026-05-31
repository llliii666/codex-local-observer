# Reference Audit

## Selected References

- `creative-reference-vault/index.yaml`: local reference rule source for app UI, QA expectations, and reuse boundaries.
- `ai-learning-navigator/`: dense static app shell with readable navigation and mobile QA precedent.
- `showcase.21st-dev` and `showcase.bento-grids` from `creative-reference-vault/showcases/showcase-candidates.yaml`: used as local inspiration for grouped status panels and clearer information hierarchy, not copied.
- `tobitege/codlogs`: upstream Codex session search/export/redaction reference, used as behavior inspiration only.
- `Cocoanetics/CodexMonitor`: upstream Codex session watching reference, used as monitoring inspiration only.

## Borrow

- Layout: left navigation, compact status header, grouped overview domains, session list headers, and inspector panels only where they add context.
- Visual system: restrained operational workspace with neutral surfaces, stronger type contrast, one blue accent, and clear health states.
- Assets: self-generated icon only; no Codex, OpenAI, or upstream project trademarks.
- QA pattern: local fixtures, secret scan, build verification, and desktop packaging smoke checks.

## Do Not Copy

- Domain-specific content: do not copy other agent products or multi-agent product surfaces.
- Private or unverified assets: do not commit real `~/.codex` data, auth files, tokens, sessions, memories, or SQLite databases.
- Weak source artifacts: do not inherit Bun/Electrobun assumptions from `codlogs`; this project ships Electron + npm.

## Improve

- Convert CLI/browser-style session viewing into a one-click Windows desktop app.
- Expand beyond sessions into Codex settings, memories, skills, plugins, threads, and logs.
- Make redaction and local-only boundaries visible in the product and enforced in scripts.
- Remove compressed table layouts, overlapping columns, and low-contrast microcopy from the first viewport.

## Assets And Provenance

- `build/icon.ico`: generated locally by `scripts/generate-icon.cjs`; abstract monitor glyph, no trademarked marks.
