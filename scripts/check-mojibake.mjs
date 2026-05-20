import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = ["src", "docs", "public", "scripts"];
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".html",
  ".sql",
  ".txt",
  ".svg",
  ".yml",
  ".yaml",
]);

const ALLOWLIST = ["Âmbar"];
const SUSPECT_PATTERNS = [
  { label: "replacement-char", regex: /�/g },
  { label: "mojibake-cedilla", regex: /Ã§/g },
  { label: "mojibake-tilde-a", regex: /Ã£/g },
  { label: "mojibake-tilde-o", regex: /Ãµ/g },
  { label: "mojibake-a-acute", regex: /Ã¡/g },
  { label: "mojibake-e-acute", regex: /Ã©/g },
  { label: "mojibake-e-circ", regex: /Ãª/g },
  { label: "mojibake-i-acute", regex: /Ãí|Ã­/g },
  { label: "mojibake-o-acute", regex: /Ã³/g },
  { label: "mojibake-u-acute", regex: /Ãº/g },
  { label: "mojibake-cap-cedilla", regex: /Ã‡/g },
  { label: "mojibake-cap-tilde-a", regex: /Ãƒ/g },
  { label: "mojibake-cap-circ", regex: /Ã‚/g },
  { label: "mojibake-smart-quotes", regex: /â€/g },
  { label: "broken-numero", regex: /N�/g },
  { label: "broken-ordinal", regex: /1�/g },
  { label: "broken-descricao", regex: /Descri��o/g },
];

function shouldScan(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) && !filePath.endsWith("scripts\\check-mojibake.mjs");
}

function isAllowed(line) {
  return ALLOWLIST.some((allowed) => line.includes(allowed));
}

function walk(dirPath, output = []) {
  if (!fs.existsSync(dirPath)) return output;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, output);
      continue;
    }
    if (entry.isFile() && shouldScan(fullPath)) {
      output.push(fullPath);
    }
  }

  return output;
}

function collectMatches(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes("\u0000")) return [];

  const matches = [];
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    if (isAllowed(line)) continue;

    const matched = SUSPECT_PATTERNS.find(({ regex }) => {
      regex.lastIndex = 0;
      return regex.test(line);
    });

    if (matched) {
      matches.push({
        filePath: path.relative(ROOT, filePath),
        lineNumber: index + 1,
        text: line.trim(),
      });
    }
  }

  return matches;
}

const files = TARGETS.flatMap((target) => walk(path.join(ROOT, target)));
const problems = files.flatMap((filePath) => collectMatches(filePath));

if (problems.length > 0) {
  console.error("Encoding/mojibake suspeito encontrado:");
  for (const problem of problems) {
    console.error(`${problem.filePath}:${problem.lineNumber} ${problem.text}`);
  }
  process.exit(1);
}

console.log(`Encoding OK. ${files.length} arquivos verificados.`);
