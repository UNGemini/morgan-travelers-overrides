#!/usr/bin/env node
/**
 * Promote a pending contribution JSON into bus-shapes.json (published).
 *
 * Usage:
 *   node scripts/merge-pending.mjs pending/foo.json
 *   node scripts/merge-pending.mjs pending/foo.json --dry-run
 *   node scripts/merge-pending.mjs pending/foo.json --remove-pending
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const dryRun = flags.has("--dry-run");
const removePending = flags.has("--remove-pending");

const pendingPath = args[0];
if (!pendingPath) {
  console.error(
    "Usage: node scripts/merge-pending.mjs pending/<id>.json [--dry-run] [--remove-pending]",
  );
  process.exit(1);
}

const abs = path.isAbsolute(pendingPath)
  ? pendingPath
  : path.join(root, pendingPath);
if (!fs.existsSync(abs)) {
  console.error("File not found:", abs);
  process.exit(1);
}

const draft = JSON.parse(fs.readFileSync(abs, "utf8"));
if (!Array.isArray(draft.coordinates) || draft.coordinates.length < 2) {
  console.error("Invalid draft: need coordinates[]");
  process.exit(1);
}

const shapesPath = path.join(root, "bus-shapes.json");
const shapes = JSON.parse(fs.readFileSync(shapesPath, "utf8"));
if (!Array.isArray(shapes.routes)) shapes.routes = [];

const entry = {
  id: String(draft.id || path.basename(abs, ".json")).slice(0, 120),
  status: "published",
  agency: String(draft.agency || "").trim(),
  route_short_name: String(draft.route_short_name || "").trim(),
  route_id_match: Array.isArray(draft.route_id_match)
    ? draft.route_id_match.map(String)
    : [],
  from_match: Array.isArray(draft.from_match)
    ? draft.from_match.map(String)
    : [],
  to_match: Array.isArray(draft.to_match) ? draft.to_match.map(String) : [],
  direction: String(draft.direction || "").trim(),
  notes: String(draft.notes || "").trim(),
  coordinates: draft.coordinates.map((c) => [Number(c[0]), Number(c[1])]),
  visual_stops: Array.isArray(draft.visual_stops) ? draft.visual_stops : [],
  contributor: String(draft.contributor || "").trim(),
  submitted_at: draft.submitted_at || "",
  published_at: new Date().toISOString().slice(0, 10),
  source_draft_id: draft.id || "",
};

const idx = shapes.routes.findIndex(
  (r) =>
    String(r.id) === entry.id ||
    (String(r.route_short_name).toUpperCase() ===
      entry.route_short_name.toUpperCase() &&
      String(r.agency || "").toUpperCase() === entry.agency.toUpperCase() &&
      String(r.direction || "") === entry.direction),
);

if (idx >= 0) {
  console.info("Replacing existing route at index", idx, shapes.routes[idx].id);
  shapes.routes[idx] = entry;
} else {
  console.info("Appending new route", entry.id);
  shapes.routes.push(entry);
}

shapes.updated_at = new Date().toISOString().slice(0, 10);
shapes.note =
  shapes.note ||
  "Hand-reviewed bus route path overrides. Merged from pending/ contributions.";

const out = JSON.stringify(shapes, null, 2) + "\n";
console.info(
  "Published routes:",
  shapes.routes.length,
  "· coords:",
  entry.coordinates.length,
  "· visual_stops:",
  entry.visual_stops.length,
);

if (dryRun) {
  console.info("[dry-run] would write bus-shapes.json and published/ mirror");
  process.exit(0);
}

fs.writeFileSync(shapesPath, out);
fs.mkdirSync(path.join(root, "published"), { recursive: true });
fs.writeFileSync(path.join(root, "published", "bus-shapes.json"), out);

if (removePending) {
  fs.unlinkSync(abs);
  console.info("Removed", abs);
} else {
  // Mark pending as merged (keep audit trail)
  const merged = {
    ...draft,
    status: "merged",
    merged_at: new Date().toISOString(),
    published_id: entry.id,
  };
  fs.writeFileSync(abs, JSON.stringify(merged, null, 2) + "\n");
  console.info("Marked pending as merged:", abs);
}

console.info("Done → bus-shapes.json");
