import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const distDataDir = path.join(projectRoot, "dist", "data");
const distDesktopDir = path.join(projectRoot, "dist", "desktop");

fs.mkdirSync(distDataDir, { recursive: true });
fs.mkdirSync(distDesktopDir, { recursive: true });

const copyMap = [
  ["src/data/commands.json", "dist/data/commands.json"],
  ["src/data/it-commands.json", "dist/data/it-commands.json"],
  ["src/desktop/index.html", "dist/desktop/index.html"]
];

for (const [fromRel, toRel] of copyMap) {
  const from = path.join(projectRoot, fromRel);
  const to = path.join(projectRoot, toRel);
  fs.copyFileSync(from, to);
}
