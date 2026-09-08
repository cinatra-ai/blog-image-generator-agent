// ---------------------------------------------------------------------------
// One picture — the featured image, and only that (cinatra#3034 acceptance 4).
//
// The agent this package re-purposes wrote image PROMPTS: a count, a list of
// placements, and an array of prompt objects nobody could turn into a picture.
// This agent settles ONE image instead: the featured one, carrying the post it
// belongs to, its placement, the prompt it is made from and its alt text. The
// picture BYTES stay outside the record: every write road an agent can take is
// v1-scoped to the text-authorable types and the picture type accepts only image
// ones, so these assertions pin the record's shape and pin that refusal where a
// picture cannot be pinned. They read the SHIPPED files of this package, never a
// fixture.
// ---------------------------------------------------------------------------
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const oas = JSON.parse(readFileSync(join(ROOT, "cinatra", "oas.json"), "utf8"));
const readme = readFileSync(join(ROOT, "README.md"), "utf8");
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
  // No picture is written at all - not mid-run and not at the end - so no
  // EndNode output carries a binding. Which form of binding could even be
  // written, and where each form is refused, is pinned further down.
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
  // Picture bytes ARE filed elsewhere - a first-party road of the host's own
  // writes them as rows of this very picture type - but that road is server-side
  // and reachable from no agent run: the three write seams an agent may invoke
  // are the ones above, and each refuses an image MIME. So no road THIS package
  // can take reaches a picture, the entry waits for one, and the EDGE stays: it
  // says what the run touches, which is true either way.
  assert.ok(artifactEdges.includes("@cinatra-ai/blog-image-artifact"));
  assert.deepEqual(pkg.cinatra.produces ?? [], []);
});

// ---------------------------------------------------------------------------
// The picture's write road, and where the prompt comes from.
//
// The record has always carried its post and its placement; what a completed
// run never left behind is the PICTURE. These three pin why, so the reason is
// executable instead of prose: the day a road opens for a picture's bytes, the
// first of them goes red and this package is told to take it.
// ---------------------------------------------------------------------------

test("the binding that would file the picture is refused by the grammar itself", async () => {
  const gate = await import("../extension-kind-gate.mjs");
  // A declarative EndNode binding is the road the fleet's adoption gate
  // recognises, and it admits a text-authorable MIME and nothing else. The
  // picture type accepts these three and only these three, so the sets are
  // disjoint. A binding that names the picture's MIME outright is therefore
  // refused where it is WRITTEN, and not for want of writing one here.
  for (const mime of ["image/png", "image/jpeg", "image/webp"]) {
    assert.ok(
      !gate.ARTIFACT_AUTHORABLE_MIMES.has(mime),
      `${mime} is not text-authorable`,
    );
    const issues = gate.validateArtifactBindingShape({
      extension: "@cinatra-ai/blog-image-artifact",
      contentFrom: "image",
      titleFrom: "notes",
      declaredMime: mime,
    });
    assert.ok(
      issues.some((i) => /not text-authorable/.test(i)),
      `a binding declaring ${mime} is refused (got: ${issues.join("; ") || "no issue"})`,
    );
  }
  // The binding has a SECOND form, and it is the reason this package declares
  // none rather than declaring a careful one. `mimeFrom` names an output that
  // carries the MIME at run time, and the text-authorable check sits on
  // `declaredMime` ALONE: a binding that reaches for a picture through
  // `mimeFrom` passes the shape check untouched, and is refused only when the
  // run resolves that output. It would ship green and leave every completed run
  // without its picture - which is the very report this package's issue opens
  // with. So the wall is not one the declaration meets; it is one the RUN meets,
  // and the only honest declaration is none.
  assert.deepEqual(
    gate.validateArtifactBindingShape({
      extension: "@cinatra-ai/blog-image-artifact",
      contentFrom: "image",
      titleFrom: "notes",
      mimeFrom: "pictureMime",
    }),
    [],
    "the mimeFrom form passes the shape check - only the run refuses it",
  );
  for (const output of refs.end.outputs) {
    assert.equal(
      output.cinatra?.artifact,
      undefined,
      `no binding of either form is written (${output.title})`,
    );
  }
  // And the manifest says THAT where a reader meets the package, rather than
  // naming a tool as the thing being waited on.
  assert.match(pkg.description, /text-authorable/i);
  assert.doesNotMatch(pkg.description, /not built yet/i);
  assert.doesNotMatch(refs.generate.metadata.cinatra.description, /not built yet/i);
});

test("the prompt is this agent's own - no prompt agent feeds it", () => {
  const deps = (pkg.cinatra.dependencies ?? []).map((d) => d.packageName);
  assert.ok(
    !deps.includes("@cinatra-ai/blog-image-prompt-agent"),
    "the retired prompt-list agent is not a dependency",
  );
  assert.ok(
    !JSON.stringify(oas).includes("blog-image-prompt-agent"),
    "and the flow names it nowhere",
  );
  // Nothing hands the bridge node a prompt: the prompt is an OUTPUT this agent
  // writes from the post and the brand material, so there is no second agent to
  // wire in and no output shape to agree on.
  const bridgeInputs = refs.generate.inputs.map((i) => i.title);
  // Name the ports that MUST be there first, so an empty input list can never
  // let the refusal below pass by having nothing to refuse.
  for (const required of ["post", "postArtifactId"]) {
    assert.ok(bridgeInputs.includes(required), `the bridge node takes ${required}`);
  }
  for (const title of bridgeInputs) {
    assert.ok(!/^prompt$/i.test(title), `the bridge node takes no prompt (${title})`);
  }
  for (const schema of imageSchemas) {
    assert.ok("prompt" in schema.properties, "the record carries the prompt it wrote");
  }
  assert.match(pkg.description, /writes its own prompt/i);
});

test("the record names its post, and says so when it was given none", () => {
  const wired = oas.data_flow_connections.find(
    (c) =>
      c.source_output === "postArtifactId" && c.destination_input === "postArtifactId",
  );
  assert.ok(wired, "the post reference reaches the bridge node from the run's inputs");
  // Both ENDPOINTS, not only the two port names: an edge that carried the post
  // reference out of the wrong node would name the same pair and say nothing.
  assert.equal(wired.source_node.$component_ref, "start");
  assert.equal(wired.destination_node.$component_ref, "generate");
  assert.match(refs.generate.data.user, /\{\{ postArtifactId \}\}/);
  for (const schema of imageSchemas) {
    assert.ok("post" in schema.properties, "the record carries the post it belongs to");
    // The empty answer must SATISFY the schema. A minLength or a pattern added
    // here would turn the instruction below into an order to break the record's
    // own contract on every run started from pasted text.
    for (const narrowing of ["minLength", "pattern", "format", "enum"]) {
      assert.ok(
        !(narrowing in schema.properties.post),
        `post admits the empty answer (no ${narrowing})`,
      );
    }
  }
  // An empty post reference is the truthful answer on a run started from pasted
  // text, where there is no post object to name - but it must be a DECLARED
  // answer, never an echo that reads like one. The instructions say which it is.
  assert.match(refs.generate.data.system, /image\.post/);
  assert.match(refs.generate.data.system, /empty string/i);
});

// ---------------------------------------------------------------------------
// The picture's own type, and the data that type asks for.
//
// `@cinatra-ai/blog-image-artifact:blog-image` is not an umbrella: the picture
// pack declares that exact type with a schema of its own, and the schema asks
// for two fields - `post` and `placement`, both REQUIRED, the placement
// admitting the featured value alone. That is the pair this record has always
// carried, so what a byte road is missing here is the ROAD and never the
// payload. The package names the type where a reader meets it, so nobody has to
// open a sibling package to learn which picture waits on which road.
// ---------------------------------------------------------------------------
const BLOG_IMAGE_TYPE = "@cinatra-ai/blog-image-artifact:blog-image";

test("the record is already the data the picture type asks for", () => {
  for (const schema of imageSchemas) {
    for (const field of ["post", "placement"]) {
      assert.ok(schema.required.includes(field), `the picture type requires ${field}`);
      assert.equal(schema.properties[field].type, "string");
    }
    assert.deepEqual(schema.properties.placement.enum, ["featured"]);
  }
  // Naming the type is what turns "a picture" into a checkable claim: it is the
  // id a day-one road resolves, and the id whose schema those two fields answer.
  assert.ok(pkg.description.includes(BLOG_IMAGE_TYPE), "the manifest names the type");
  assert.ok(readme.includes(BLOG_IMAGE_TYPE), "and the readme names it too");
});

// This one is a RECORD, not a fix: it is green on the previous head as well. It
// pins the ceiling the gate puts on this package, so no later reader mistakes
// the absent produces entry for a declaration somebody forgot to write.
test("the gate itself bounds the maximum: no typed production without a road", async () => {
  const gate = await import("../extension-kind-gate.mjs");
  assert.deepEqual(
    gate.collectArtifactParityFindings(ROOT, pkg),
    [],
    "what ships today carries no parity finding",
  );
  const withProduces = {
    ...pkg,
    cinatra: {
      ...pkg.cinatra,
      produces: [
        { extension: "@cinatra-ai/blog-image-artifact", objectTypeId: BLOG_IMAGE_TYPE },
      ],
    },
  };
  const findings = gate.collectArtifactParityFindings(ROOT, withProduces);
  assert.ok(
    findings.some((f) => /no runnable materialization/.test(f)),
    `declaring the production alone is refused (got: ${findings.join("; ") || "no finding"})`,
  );
});
