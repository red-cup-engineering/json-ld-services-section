#!/usr/bin/env node
// Usage: map-records-as-json-ld.mjs <mappings.json>[,<more.json>...] <file.json|file.jsonl>... > graph.jsonld
// Each mappings file holds one mapping or a list of them (see src/map-records.mjs);
// each mapping may name `files`, a list of path substrings it applies to.
// Prints one compacted JSON-LD graph of every node the mappings make.
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { mapRecord } from "../src/map-records.mjs";
import { compactStatementsAsJsonLd, jsonLdText } from "../src/json-ld.mjs";

const [mappingPath, ...files] = process.argv.slice(2);
if (!mappingPath) {
  console.error("usage: map-records-as-json-ld.mjs <mappings.json> <file>...");
  process.exit(2);
}
const mappings = mappingPath.split(",")
  .flatMap((path) => [JSON.parse(readFileSync(path, "utf8"))].flat());
const prefixes = Object.assign({}, ...mappings.map((m) => m.prefixes ?? {}));

const statements = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const records = extname(file) === ".jsonl"
    ? text.split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line))
    : [JSON.parse(text)];
  const stem = basename(file, extname(file));
  for (const mapping of mappings) {
    if (mapping.files && !mapping.files.some((part) => file.includes(part))) continue;
    for (const record of records) statements.push(...mapRecord(record, stem, mapping));
  }
}
process.stdout.write(jsonLdText(compactStatementsAsJsonLd(statements, { prefixes })));
