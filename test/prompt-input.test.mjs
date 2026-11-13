// The optional, hidden `prompt` input of the featured-image generator
// (cinatra-ai/cinatra#4264).
//
// A caller that already holds the words the picture is to be made from (a
// reviewer asking for the picture again, with a note) hands them to the agent as
// `prompt`. The input is plain plumbing: a canonical string, empty by default,
// hidden from the form, wired from the start node to the bridge node and to no
// one else. When it carries words the agent returns them as the record's prompt;
// when it is empty the agent writes its own, as before. These tests read the
// SHIPPED flow file and manifest.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const oas = JSON.parse(readFileSync(join(root, "cinatra", "oas.json"), "utf8"));
const readme = readFileSync(join(root, "README.md"), "utf8");
const refs = oas.$referenced_components;
const start = refs.start;
const generate = refs.generate;

const CANONICAL = { title: "prompt", type: "string", default: "" };
const fromStart = (output) =>
  oas.data_flow_connections.filter(
    (c) => c.source_node.$component_ref === "start" && c.source_output === output,
  );
const into = (node, input) =>
  oas.data_flow_connections.filter(
    (c) => c.destination_node.$component_ref === node && c.destination_input === input,
  );

test("the flow and its start node both declare `prompt` as a canonical, empty-by-default string", () => {
  for (const [where, inputs] of [
    ["flow", oas.inputs],
    ["start node", start.inputs],
  ]) {
    const found = inputs.filter((i) => i.title === "prompt");
    assert.equal(found.length, 1, `${where} declares prompt exactly once`);
    // Canonical: the title, the string type and the empty default - no schema, no format.
    assert.deepEqual(found[0], CANONICAL, `${where} input is the canonical string`);
  }
});

test("`prompt` is hidden, never required, so the form still shows the post alone", () => {
  assert.ok(start.metadata.cinatra.hidden.includes("prompt"), "prompt is hidden");
  assert.ok(!start.metadata.cinatra.required.includes("prompt"), "prompt is not required");
  assert.deepEqual(start.metadata.cinatra.required, ["post"]);
  const visible = start.inputs
    .map((i) => i.title)
    .filter((t) => !start.metadata.cinatra.hidden.includes(t));
  assert.deepEqual(visible, ["post"]);
});

test("the start node's `prompt` has one consumer: the bridge node's `prompt`", () => {
  const edges = fromStart("prompt");
  assert.equal(edges.length, 1, "no fan-out from start.prompt");
  assert.equal(edges[0].destination_node.$component_ref, "generate");
  assert.equal(edges[0].destination_input, "prompt");
  assert.equal(into("generate", "prompt").length, 1, "one edge into generate.prompt");
});

test("the bridge node takes `prompt` as a string with an empty default and reads it in its turn", () => {
  const port = generate.inputs.filter((i) => i.title === "prompt");
  assert.equal(port.length, 1);
  assert.equal(port[0].type, "string");
  assert.equal(port[0].default, "");
  assert.match(generate.data.user, /\{\{ prompt \}\}/);
});

test("a given prompt IS the record's prompt, an empty one leaves the agent to write its own", () => {
  const system = generate.data.system;
  assert.match(system, /- prompt:/, "the inputs list names `prompt`");
  assert.match(system, /image\.prompt:[^\n]*`prompt` you were given/, "the return contract returns it");
  assert.match(system, /When `prompt` is not empty/);
  assert.match(system, /When `prompt` is empty/);
  // The record still carries the prompt it was made from, and the agent still
  // writes the alternative text of the picture that prompt describes.
  for (const schema of [
    oas.outputs.find((o) => o.title === "image").json_schema,
    generate.outputs.find((o) => o.title === "image").json_schema,
    refs.end.outputs.find((o) => o.title === "image").json_schema,
  ]) {
    assert.ok("prompt" in schema.properties && schema.required.includes("prompt"));
    assert.ok(schema.required.includes("altText"));
  }
});

test("the manifest and the README say the prompt is an optional, hidden input", () => {
  assert.match(pkg.description, /optional/i);
  assert.match(pkg.description, /`prompt`|prompt input/i);
  assert.doesNotMatch(pkg.description, /is handed none/i);
  assert.match(readme, /`prompt`/);
  assert.doesNotMatch(readme, /nothing feeds this one a prompt/i);
});
