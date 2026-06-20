#!/usr/bin/env node
/**
 * Remove all git merge conflict markers from a file.
 * Keeps the "ours" (HEAD) version, discards the "theirs" version.
 *
 * Usage: node scripts/remove-conflict-markers.js <file>
 */
const fs = require("fs");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node remove-conflict-markers.js <file>");
  process.exit(1);
}

let content = fs.readFileSync(file, "utf8");
const lines = content.split("\n");
const result = [];
let inConflict = false;
let skipMode = false;
let removed = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.startsWith("<<<<<<< ")) {
    inConflict = true;
    skipMode = false;
    removed++;
    continue;
  }

  if (line.startsWith("=======") && inConflict) {
    // Switch to "theirs" — we skip theirs (we keep HEAD)
    skipMode = true;
    removed++;
    continue;
  }

  if (line.startsWith(">>>>>>> ") && inConflict) {
    inConflict = false;
    skipMode = false;
    removed++;
    continue;
  }

  if (!skipMode) {
    result.push(line);
  }
}

fs.writeFileSync(file, result.join("\n"));
console.log(`Removed ${removed} conflict markers from ${file}`);
