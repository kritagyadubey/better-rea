import fs from "node:fs";

let failed = false;
for (const path of [
  "docs/better-rea/PROGRESS.md",
  "docs/better-rea/FINAL_REPORT.md",
]) {
  const lines = fs.readFileSync(path, "utf8").split("\n");
  const bad = [];
  let header = null;
  for (const [index, line] of lines.entries()) {
    if (!line.startsWith("|")) {
      header = null;
      continue;
    }
    const pipes = (line.replaceAll("\\|", "").match(/\|/g) ?? []).length;
    if (header === null) {
      header = pipes;
      continue;
    }
    if (pipes !== header)
      bad.push(`${index + 1}: expected ${header} pipes, got ${pipes}`);
  }
  if (bad.length) failed = true;
  console.log(
    `${path}: ${bad.length === 0 ? "all tables consistent" : bad.join("; ")}`,
  );
}
process.exitCode = failed ? 1 : 0;
