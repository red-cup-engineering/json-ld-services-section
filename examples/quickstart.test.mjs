import assert from "node:assert/strict";
import test from "node:test";
import { jsonLdText, pruneEmpty } from "@red-cup-engineering/json-ld-services-section/json-ld";

test("JSON-LD-QUICKSTART", () => {
  const record = pruneEmpty({ "@context": "https://schema.org", name: "Example", empty: [], selected: false });
  const text = jsonLdText(record);
  assert.deepEqual(JSON.parse(text), { "@context": "https://schema.org", name: "Example", selected: false });
  assert.ok(text.endsWith("\n"));
});
