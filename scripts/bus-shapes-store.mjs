/**
 * Split / assemble published bus-shape overrides.
 *
 * Source of truth in this repo: bus-shapes/<id>.json plus index.json.
 * The stub bus-shapes.json points at the split index so old URLs and
 * older app builds still resolve (they see routes: [] and a split_index
 * pointer instead of a stale copy of every route).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.join(__dirname, "..");
export const SHAPES_JSON = path.join(REPO_ROOT, "bus-shapes.json");
export const SHAPES_DIR = path.join(REPO_ROOT, "bus-shapes");

/**
 * @param {string} id
 * @returns {string}
 */
export function safeRouteFileName(id) {
  const s =
    String(id || "route")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "route";
  return s.endsWith(".json") ? s : `${s}.json`;
}

/**
 * Write one file per route + index.json into dir. Removes stale files.
 * @param {string} dir
 * @param {{ updated_at?: string, note?: string, routes?: object[] }} data
 * @returns {{ updated_at: string, note: string, files: string[] }}
 */
export function writeSplitBusShapes(dir, data) {
  fs.mkdirSync(dir, { recursive: true });
  const routes = Array.isArray(data.routes) ? data.routes : [];
  const files = [];
  const used = new Set();
  for (const r of routes) {
    if (!r || typeof r !== "object") continue;
    let name = safeRouteFileName(r.id);
    let n = name;
    let i = 2;
    while (used.has(n)) {
      n = name.replace(/\.json$/, `_${i}.json`);
      i += 1;
    }
    used.add(n);
    files.push(n);
    fs.writeFileSync(path.join(dir, n), `${JSON.stringify(r, null, 2)}\n`);
  }
  for (const f of fs.readdirSync(dir)) {
    if (f === "index.json") continue;
    if (f.endsWith(".json") && !used.has(f)) {
      fs.unlinkSync(path.join(dir, f));
    }
  }
  const index = {
    updated_at: data.updated_at || new Date().toISOString().slice(0, 10),
    note: data.note || "Published bus path overrides — one JSON file per route.",
    files,
  };
  fs.writeFileSync(
    path.join(dir, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  return index;
}

/**
 * @param {string} dir
 * @returns {{ updated_at: string, note: string, routes: object[] } | null}
 */
export function readSplitBusShapes(dir) {
  const idxPath = path.join(dir, "index.json");
  if (!fs.existsSync(idxPath)) return null;
  const index = JSON.parse(fs.readFileSync(idxPath, "utf8"));
  const routes = [];
  for (const f of index.files || []) {
    const p = path.join(dir, path.basename(String(f)));
    if (!fs.existsSync(p)) continue;
    try {
      const rec = JSON.parse(fs.readFileSync(p, "utf8"));
      if (rec && typeof rec === "object") routes.push(rec);
    } catch {
      /* skip bad file */
    }
  }
  return {
    updated_at: index.updated_at || "",
    note: index.note || "",
    routes,
  };
}

/**
 * Tiny pointer so bus-shapes.json still 200s for old clients.
 * @param {string} file
 * @param {{ updated_at?: string, note?: string, files?: string[] }} index
 */
export function writeBusShapesStub(file, index) {
  const stub = {
    updated_at: index.updated_at || new Date().toISOString().slice(0, 10),
    note:
      "Contributed routes live in bus-shapes/<id>.json (see split_index). This stub is not the route list.",
    split_index: "bus-shapes/index.json",
    files: index.files || [],
    routes: [],
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(stub, null, 2)}\n`);
}

/**
 * Resolve published shapes: split dir first, then a legacy blob with routes[].
 * @param {string} jsonPath
 * @param {string} [dirPath]
 */
export function loadPublishedBusShapes(jsonPath, dirPath) {
  if (jsonPath && fs.existsSync(jsonPath)) {
    try {
      const j = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      if (Array.isArray(j?.routes) && j.routes.length) return j;
    } catch {
      /* fall through to split dir */
    }
  }
  const dir = dirPath || path.join(path.dirname(jsonPath), "bus-shapes");
  const split = readSplitBusShapes(dir);
  if (split?.routes?.length) return split;
  return split || { updated_at: "", note: "", routes: [] };
}

function isMain() {
  const self = fileURLToPath(import.meta.url);
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return self === invoked;
}

if (isMain()) {
  const cmd = process.argv[2] || "split";
  if (cmd === "split") {
    // One-off migration: legacy blob → split dir + stub (idempotent)
    const existing = readSplitBusShapes(SHAPES_DIR);
    const data = existing?.routes?.length
      ? existing
      : JSON.parse(fs.readFileSync(SHAPES_JSON, "utf8"));
    if (!Array.isArray(data.routes) || !data.routes.length) {
      console.error(
        "No routes[] to split (checked bus-shapes/ and bus-shapes.json)",
      );
      process.exit(1);
    }
    const index = writeSplitBusShapes(SHAPES_DIR, data);
    writeBusShapesStub(SHAPES_JSON, index);
    console.info("Split", index.files.length, "routes into", SHAPES_DIR);
  } else if (cmd === "assemble") {
    const data = readSplitBusShapes(SHAPES_DIR);
    if (!data) {
      console.error("No split index at", SHAPES_DIR);
      process.exit(1);
    }
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  } else {
    console.error("Usage: node scripts/bus-shapes-store.mjs [split|assemble]");
    process.exit(1);
  }
}
