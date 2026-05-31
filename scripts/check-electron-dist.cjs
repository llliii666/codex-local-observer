const fs = require("node:fs");
const path = require("node:path");

const indexPath = path.join(process.cwd(), "dist", "index.html");
const html = fs.readFileSync(indexPath, "utf8");
const badAssetRefs = html.match(/\s(?:src|href)="\/assets\//g) || [];

if (badAssetRefs.length) {
  console.error("Electron file:// build is unsafe: dist/index.html contains absolute /assets references.");
  console.error("Set Vite base to './' so packaged Electron can load renderer assets.");
  process.exit(1);
}

if (!/\s(?:src|href)="\.\/assets\//.test(html)) {
  console.error("Electron file:// build check failed: no relative ./assets references found.");
  process.exit(1);
}

console.log("Electron dist asset paths are file:// safe.");
