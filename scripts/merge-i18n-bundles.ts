import fs from "fs";
import path from "path";

type Json = Record<string, unknown>;

function deepMerge(target: Json, source: Json): Json {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      out[key] = deepMerge(target[key] as Json, value as Json);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const bundleFiles = ["i18n-bundles.json", "i18n-admin-bundles.json"];

for (const locale of ["fr", "en", "es"]) {
  const filePath = path.join(__dirname, "..", "messages", `${locale}.json`);
  let merged = JSON.parse(fs.readFileSync(filePath, "utf8")) as Json;

  for (const bundleFile of bundleFiles) {
    const bundlePath = path.join(__dirname, bundleFile);
    if (!fs.existsSync(bundlePath)) continue;
    const bundles = JSON.parse(fs.readFileSync(bundlePath, "utf8")) as Record<string, Json>;
    merged = deepMerge(merged, bundles[locale]);
  }

  fs.writeFileSync(filePath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(`Updated messages/${locale}.json`);
}
