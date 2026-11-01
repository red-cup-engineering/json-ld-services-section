// Maps plain JSON records to RDF statements under a declarative mapping, so a
// record of any house shape becomes nodes of a standard vocabulary.
//
// A mapping is { prefixes, type, id, each?, where?, properties }:
// - `type`: a CURIE or IRI, or a list of them.
// - `id`: a template such as "urn:561:task:{$file}-{$index}"; `{path}` is
//   replaced by the value at that path.
// - `each`: a path to an array; one node is made per element. A "*" segment
//   steps into every value of an object, so "platforms.*.*" makes one node
//   per entry of a two-level map. Inside it, a path reads the element, a path
//   starting with "^." reads the record, `$key` is the last object key walked
//   and `$key0`, `$key1`… each key in order.
// - `where`: { path: value } that a row must equal to be mapped.
// - `require`: predicates that must get a value, or the row makes no node.
// - `properties`: { predicate: spec }, where spec is a path, "=text" for a
//   constant, or an object with one source and optional options:
//   sources `path`, `paths` (the first that has a value), `value` or
//   `template`; options `values` (a map from source value to output value),
//   `prefix` (prepended to each value), `iri`, `datatype` and `language`;
//   `json: true` writes the whole value, ordered lists and nested objects
//   intact, as one JSON-LD 1.1 JSON literal (rdf:JSON).
// A path is dot-separated, and a numeric key indexes an array; "." is the
// element itself, `$file` the record's
// file stem and `$index` the element's position. An array value gives one
// statement per member, and an absent, null or empty value gives none.

const XSD = "http://www.w3.org/2001/XMLSchema#";
const RDF_JSON = "http://www.w3.org/1999/02/22-rdf-syntax-ns#JSON";

export function readPath(row, path) {
  if (path === "$file") return row.$file;
  if (path === "$index") return row.$index;
  if (path === "$key") return row.$keys?.at(-1);
  if (/^\$key\d+$/.test(path)) return row.$keys?.[Number(path.slice(4))];
  if (path === ".") return row.$item;
  let value = path.startsWith("^.") ? row.$record : row.$item;
  for (const key of (path.startsWith("^.") ? path.slice(2) : path).split(".")) {
    if (value == null) return undefined;
    value = !Array.isArray(value) ? value[key]
      : /^\d+$/.test(key) ? value[Number(key)]
      : value.flatMap((v) => v?.[key] ?? []);
  }
  return value;
}

function expand(term, prefixes) {
  const colon = term.indexOf(":");
  const prefix = term.slice(0, colon);
  return colon > 0 && prefixes[prefix] !== undefined
    ? prefixes[prefix] + term.slice(colon + 1)
    : term;
}

function fill(template, row) {
  return template.replace(/\{([^}]+)\}/g, (_, path) => {
    const value = readPath(row, path);
    return encodeURIComponent(String(Array.isArray(value) ? value[0] : value ?? ""));
  });
}

// Walks an `each` path: a key steps into objects (and across arrays), "*"
// steps into every value of an object or array, recording the object key.
function walk(value, segments, keys) {
  if (value == null) return [];
  if (segments.length === 0) {
    return Array.isArray(value) ? value.map((item) => ({ item, keys })) : [{ item: value, keys }];
  }
  const [segment, ...rest] = segments;
  if (Array.isArray(value)) return value.flatMap((member) => walk(member, segments, keys));
  if (segment === "*") {
    return typeof value === "object"
      ? Object.entries(value).flatMap(([key, member]) => walk(member, rest, [...keys, key]))
      : [];
  }
  return walk(value[segment], rest, keys);
}

function rows(record, file, mapping) {
  const base = { $record: record, $file: file };
  if (!mapping.each) return [{ ...base, $item: record, $index: 0, $keys: [] }];
  const segments = mapping.each === "." ? [] : mapping.each.split(".");
  return walk(record, segments, []).map(
    ({ item, keys }, index) => ({ ...base, $item: item, $index: index, $keys: keys }),
  );
}

function matches(row, where = {}) {
  return Object.entries(where).every(([path, want]) => readPath(row, path) === want);
}

function objects(spec, row, prefixes) {
  const s = typeof spec === "string"
    ? spec.startsWith("=") ? { value: spec.slice(1) } : { path: spec }
    : spec;
  const present = (v) => v !== undefined && v !== null && v !== "" &&
    !(Array.isArray(v) && v.length === 0);
  const raw = s.value !== undefined ? s.value
    : s.template !== undefined ? fill(s.template, row)
    : s.paths ? s.paths.map((p) => readPath(row, p)).find(present)
    : readPath(row, s.path);
  if (s.json) return present(raw) ? [{ kind: "literal", value: JSON.stringify(raw), datatype: RDF_JSON }] : [];
  const values = (Array.isArray(raw) ? raw : [raw]).filter(present)
    .map((v) => (s.values && typeof v !== "object" ? s.values[String(v)] ?? v : v))
    .map((v) => (s.prefix && typeof v !== "object" ? s.prefix + String(v) : v));
  return values.map((v) => {
    if (s.iri) return { kind: "iri", value: expand(String(v), prefixes) };
    if (typeof v === "object") return { kind: "literal", value: JSON.stringify(v) };
    const object = { kind: "literal", value: String(v) };
    if (s.datatype) object.datatype = expand(s.datatype, prefixes);
    else if (typeof v === "number") object.datatype = XSD + (Number.isInteger(v) ? "integer" : "decimal");
    else if (typeof v === "boolean") object.datatype = XSD + "boolean";
    if (s.language) object.language = s.language;
    return object;
  });
}

export function mapRecord(record, file, mapping) {
  const prefixes = mapping.prefixes ?? {};
  const statements = [];
  for (const row of rows(record, file, mapping)) {
    if (!matches(row, mapping.where)) continue;
    const required = mapping.require ?? [];
    if (required.some((p) => objects(mapping.properties[p], row, prefixes).length === 0)) continue;
    const subject = expand(fill(mapping.id, row), prefixes);
    for (const type of [mapping.type].flat()) {
      statements.push({
        subject,
        predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
        object: { kind: "iri", value: expand(type, prefixes) },
      });
    }
    for (const [predicate, spec] of Object.entries(mapping.properties ?? {})) {
      for (const object of objects(spec, row, prefixes)) {
        statements.push({ subject, predicate: expand(predicate, prefixes), object });
      }
    }
  }
  return statements;
}
