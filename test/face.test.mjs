import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { compactRdfStatementsAsJsonLd } from "../scripts/compact-rdf-statements-as-json-ld.mjs";
import { PREFIXES, STATEMENTS, root } from "./helpers.mjs";

const command = (lines, ...args) => {
  const run = spawnSync(process.execPath, [join(root, "scripts", "compact-rdf-statements-as-json-ld.mjs"), ...args], { input: lines.map((line) => JSON.stringify(line)).join("\n") + "\n", encoding: "utf8" });
  return { status: run.status, lines: run.stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)), stdout: run.stdout, stderr: run.stderr };
};

test("the operation returns the compacted document and refuses unknown members", () => {
  const { jsonLd } = compactRdfStatementsAsJsonLd({ statements: STATEMENTS, prefixes: PREFIXES });
  assert.equal(jsonLd["@graph"].length, 2);
  assert.throws(() => compactRdfStatementsAsJsonLd({ statements: [], prefixes: PREFIXES, other: 1 }), /does not admit other/u);
  assert.throws(() => compactRdfStatementsAsJsonLd({ statements: [] }), /prefixes/u);
  assert.throws(() => compactRdfStatementsAsJsonLd(null), TypeError);
});

test("the command reads one JSON value per line and writes one per line; a refusal is a line and exit 2", () => {
  const good = { statements: STATEMENTS, prefixes: PREFIXES };
  const done = command([good, { statements: "x", prefixes: {} }]);
  assert.equal(done.status, 2);
  assert.deepEqual(done.lines[0], JSON.parse(JSON.stringify(compactRdfStatementsAsJsonLd(good))));
  assert.equal(done.lines[1].ok, false);
  assert.ok(done.lines[1].refusal.reason);
  const clean = command([good, good]);
  assert.equal(clean.status, 0, clean.stderr);
  assert.equal(clean.lines.length, 2);
  assert.deepEqual(clean.lines[0], clean.lines[1]);
});

test("--help names the operation", () => {
  const help = spawnSync(process.execPath, [join(root, "scripts", "compact-rdf-statements-as-json-ld.mjs"), "--help"], { encoding: "utf8" });
  assert.match(help.stdout, /^compactRdfStatementsAsJsonLd — /u);
});
