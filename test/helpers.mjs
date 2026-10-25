import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const here = dirname(fileURLToPath(import.meta.url));
export const root = join(here, "..");
export const fixture = (name) => readFileSync(join(here, "fixtures", name), "utf8");
export const json = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

export const PROV = "http://www.w3.org/ns/prov#";
export const PREFIXES = { dcterms: "http://purl.org/dc/terms/", prov: PROV, rdfs: "http://www.w3.org/2000/01/rdf-schema#", xsd: "http://www.w3.org/2001/XMLSchema#" };
const iri = (value) => ({ kind: "iri", value });
const literal = (value, extra = {}) => ({ kind: "literal", value, ...extra });
export const A = "ni:///sha-256;aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
export const B = "ni:///sha-256;bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbA";
export const STATEMENTS = [
  { subject: B, predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", object: iri(`${PROV}Entity`) },
  { subject: B, predicate: `${PROV}wasDerivedFrom`, object: iri(A) },
  { subject: A, predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type", object: iri(`${PROV}Entity`) },
  { subject: A, predicate: "http://purl.org/dc/terms/extent", object: literal("12", { datatype: "http://www.w3.org/2001/XMLSchema#nonNegativeInteger" }) },
  { subject: A, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: literal("a.md") },
  { subject: A, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: literal("a.md") },
  { subject: A, predicate: "http://www.w3.org/2000/01/rdf-schema#label", object: literal("une page", { language: "fr" }) },
];
