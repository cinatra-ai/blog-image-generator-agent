// ---------------------------------------------------------------------------
// One picture — the featured image, and only that (cinatra#3034 acceptance 4).
//
// The agent this package re-purposes wrote image PROMPTS: a count, a list of
// placements, and an array of prompt objects nobody could turn into a picture.
// This agent settles ONE image instead: the featured one, carrying the post it
// belongs to, its placement, the prompt it is made from and its alt text. The
// picture BYTES are the host image tool's, and that tool is not built yet - so
// these assertions pin the record's shape, and say so where they cannot pin a
// picture. They read the SHIPPED files of this package, never a fixture.
// ---------------------------------------------------------------------------
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const oas = JSON.parse(readFileSync(join(ROOT, "cinatra", "oas.json"), "utf8"));
const refs = oas["$referenced_components"];
const inputTitles = oas.inputs.map((i) => i.title);
const outputTitles = oas.outputs.map((o) => o.title);
const imageSchemas = [
  oas.outputs.find((o) => o.title === "image").json_schema,
  refs.generate.outputs.find((o) => o.title === "image").json_schema,
  refs.end.outputs.find((o) => o.title === "image").json_schema,
];
const artifactEdges = (pkg.cinatra.dependencies ?? [])
  .filter((d) => d.kind === "artifact")
  .map((d) => d.packageName)
  .sort();

test("the package is the image agent, not the prompt-list writer", () => {
  assert.equal(pkg.name, "@cinatra-ai/blog-image-generator-agent");
  assert.equal(pkg.cinatra.kind, "agent");
  assert.equal(pkg.cinatra.displayName, "Blog Image Generator Agent");
  assert.equal(oas.id, "blog-image-generator-agent-flow");
  assert.equal(
    oas.metadata.cinatra.packageName,
    "@cinatra-ai/blog-image-generator-agent",
  );
});

test("it declares an edge to the picture it makes and to the post it reads", () => {
  assert.deepEqual(artifactEdges, [
    "@cinatra-ai/blog-image-artifact",
    "@cinatra-ai/blog-post-artifact",
  ]);
});

test("it takes the post, and nothing that asks for more than one picture", () => {
  assert.ok(inputTitles.includes("post"), "the draft post is the input");
  for (const retired of ["draft", "count", "placements", "style", "brandKeywords"]) {
    assert.ok(
      !inputTitles.includes(retired),
      `the retired input \"${retired}\" is gone`,
    );
  }
  assert.deepEqual(refs.start.metadata.cinatra.required, ["post"]);
});

test("the placement is the featured image, fixed and hidden", () => {
  const placement = oas.inputs.find((i) => i.title === "placement");
  assert.ok(placement, "the flow carries a placement");
  assert.equal(placement.type, "string");
  assert.equal(placement.default, "featured");
  assert.ok(refs.start.metadata.cinatra.hidden.includes("placement"));
  // A default a caller can override is not a fixed placement. Every schema the
  // record travels through admits the featured placement and nothing else, so
  // a body placement cannot leave the run whatever the caller passes.
  for (const schema of imageSchemas) {
    assert.deepEqual(schema.properties.placement.enum, ["featured"]);
  }
});

test("exactly one image record leaves the run, with its post and placement", () => {
  assert.ok(!outputTitles.includes("prompts"), "the prompt array is retired");
  assert.deepEqual(outputTitles, ["image", "notes"]);
  const image = oas.outputs.find((o) => o.title === "image");
  assert.equal(image.type, "object", "one picture is an object, never a list");
  const props = image.json_schema.properties;
  assert.deepEqual(Object.keys(props).sort(), ["altText", "placement", "post", "prompt"]);
  // The alt text is promised to a reader who cannot see the picture, so it is
  // required rather than offered - in EVERY schema the record travels through,
  // not only the one the flow advertises.
  assert.equal(imageSchemas.length, 3, "top level, bridge node and end node");
  for (const schema of imageSchemas) {
    assert.deepEqual([...schema.required].sort(), [
      "altText",
      "placement",
      "post",
      "prompt",
    ]);
  }
});

test("the end node files nothing by a terminal binding", () => {
  // The picture is a mid-run write, so no EndNode output carries a binding.
  for (const output of refs.end.outputs) {
    assert.equal(
      output.cinatra?.artifact,
      undefined,
      `the end node output \"${output.title}\" binds no artifact`,
    );
  }
});

test("the one field a person fills in is the draft post", () => {
  const visible = oas.inputs
    .map((i) => i.title)
    .filter((t) => !refs.start.metadata.cinatra.hidden.includes(t));
  assert.deepEqual(visible, ["post"]);
  for (const title of visible) {
    assert.ok(!/prompt/i.test(title), `no visible field names a prompt (${title})`);
  }
  // The prompt is RETURNED with the record - it is how the picture gets made -
  // so this package never claims a person cannot see one. It claims only that
  // nobody is asked to write one.
  assert.ok(!/nobody is (ever )?shown/i.test(refs.generate.data.system));
  assert.ok(!/nobody is (ever )?shown/i.test(pkg.description));
});

test("the bridge node attaches no toolbox and answers as this agent", () => {
  assert.equal(refs.generate.data.agent_id, "blog-image-generator-agent");
  assert.deepEqual(refs.generate.data.toolbox_ids, []);
});

test("the instructions ask for one picture and forbid a body picture", () => {
  const system = refs.generate.data.system;
  assert.match(system, /exactly one/i);
  assert.match(system, /featured/i);
  assert.match(system, /body/i);
});

test("the picture is an edge today; its typed produces entry waits for the write road", () => {
  // The fleet's blocking adoption gate refuses a produces entry no
  // materialization road reaches, and the three roads it recognises - an
  // EndNode output binding, an artifact_materialize passthrough node, an
  // artifact_authoring_emit claim - are each scoped to text-authorable MIMEs.
  // The host does file picture bytes elsewhere, on its own campaigns road, but
  // that road is neither recognised by the gate nor callable by an agent. So no
  // road THIS package can take reaches a picture, the entry waits for one, and
  // the EDGE stays: it says what the run touches, which is true either way.
  assert.ok(artifactEdges.includes("@cinatra-ai/blog-image-artifact"));
  assert.deepEqual(pkg.cinatra.produces ?? [], []);
});
