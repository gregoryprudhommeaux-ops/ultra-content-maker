import fs from "fs";
import path from "path";

type Msg = Record<string, unknown>;
const msgs = JSON.parse(fs.readFileSync("messages/fr.json", "utf8")) as Msg;

function get(obj: Msg, keyPath: string): unknown {
  let cur: unknown = obj;
  for (const p of keyPath.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Msg)[p];
  }
  return cur;
}

function walk(dir: string, files: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !["node_modules", ".next", ".git"].includes(ent.name)) {
      walk(p, files);
    } else if (/\.tsx$/.test(ent.name)) {
      files.push(p);
    }
  }
  return files;
}

const missing = new Set<string>();

for (const file of walk("src")) {
  const src = fs.readFileSync(file, "utf8");
  const decls = [
    ...src.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(\s*["']([^"']+)["']\s*\)/g),
  ];
  for (const [, varName, ns] of decls) {
    const re = new RegExp(`${varName}\\(["'\`]([^"'\`\\)]+)["'\`]\\)`, "g");
    for (const m of src.matchAll(re)) {
      const key = m[1];
      if (key.includes("${")) continue;
      const full = `${ns}.${key}`;
      if (get(msgs, full) === undefined) missing.add(`${full}  @ ${file}`);
    }
  }
}

const dynamicChecks: Array<[string, string[], string[]]> = [
  ["landing.howItWorks.steps", ["voice", "brief", "generate"], ["title", "description"]],
  [
    "landing.capabilities",
    ["persona", "brief", "exploration", "quality", "distribution"],
    ["title", "description"],
  ],
  ["landing.product.posts", ["post1", "post2", "post3", "post4"], []],
  ["landing.product.scope", ["generalist", "niche"], []],
  [
    "landing.product.panels.refine.scores",
    ["nicheClarity", "proofDensity", "conversationPotential"],
    [],
  ],
  ["landing.product.panels.brief.objectives", ["credibility", "conversation"], []],
];

for (const [prefix, keys, subs] of dynamicChecks) {
  for (const k of keys) {
    if (subs.length === 0) {
      const full = `${prefix}.${k}`;
      if (get(msgs, full) === undefined) missing.add(full);
    } else {
      for (const s of subs) {
        const full = `${prefix}.${k}.${s}`;
        if (get(msgs, full) === undefined) missing.add(full);
      }
    }
  }
}

const sorted = [...missing].sort();
console.log(`Missing keys in fr.json: ${sorted.length}`);
for (const k of sorted) console.log(` - ${k}`);
