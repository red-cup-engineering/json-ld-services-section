#!/usr/bin/env node
import { compactStatementsAsJsonLd } from "../src/json-ld.mjs";
import { runCommand } from "./face.mjs";

const objectSchema = {
  type: "object",
  required: ["kind", "value"],
  additionalProperties: false,
  properties: {
    kind: { enum: ["iri", "literal"] },
    value: { type: "string" },
    datatype: { type: "string", description: "Datatype IRI of a literal." },
    language: { type: "string", description: "Language tag of a literal." },
  },
};

export const operationDefinition = {
  name: "compactRdfStatementsAsJsonLd",
  description: "Writes RDF statements as a compacted JSON-LD graph against a supplied prefix context: nodes sorted by @id, properties by key, values by their JSON, equal values collapsed. The same statements always give the same document.",
  inputSchema: {
    type: "object",
    required: ["statements", "prefixes"],
    additionalProperties: false,
    properties: {
      statements: {
        type: "array",
        description: "RDF statements: subject and predicate IRIs (or blank-node labels) and an object that is an IRI or a literal.",
        items: {
          type: "object",
          required: ["subject", "predicate", "object"],
          additionalProperties: false,
          properties: { subject: { type: "string" }, predicate: { type: "string" }, object: objectSchema },
        },
      },
      prefixes: { type: "object", additionalProperties: { type: "string" }, description: "Prefix to namespace IRI; also the document's @context. An IRI is compacted under the first prefix, in this order, whose namespace it extends." },
    },
  },
  outputSchema: {
    type: "object",
    required: ["jsonLd"],
    additionalProperties: false,
    properties: {
      jsonLd: {
        type: "object",
        required: ["@context", "@graph"],
        properties: { "@context": { type: "object", additionalProperties: { type: "string" } }, "@graph": { type: "array", items: { type: "object", required: ["@id"] } } },
      },
    },
  },
};
export const operation = operationDefinition;

/**
 * Compacts RDF statements into a JSON-LD graph.
 * @param {{statements: object[], prefixes: Record<string, string>}} request
 * @returns {{jsonLd: {"@context": object, "@graph": object[]}}}
 * @throws {TypeError} When the request, a statement or the prefixes are malformed.
 */
export function compactRdfStatementsAsJsonLd(request) {
  if (request === null || typeof request !== "object" || Array.isArray(request)) throw new TypeError("request must be { statements, prefixes }");
  for (const key of Object.keys(request)) if (key !== "statements" && key !== "prefixes") throw new TypeError(`request does not admit ${key}`);
  if (request.prefixes === null || typeof request.prefixes !== "object" || Array.isArray(request.prefixes)) throw new TypeError("prefixes must be an object of prefix to namespace");
  return { jsonLd: compactStatementsAsJsonLd(request.statements, { prefixes: request.prefixes }) };
}

if (import.meta.main) await runCommand(operationDefinition, compactRdfStatementsAsJsonLd);
