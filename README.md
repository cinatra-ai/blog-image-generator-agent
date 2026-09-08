# Blog Image Generator Agent

Settle the featured image of a blog post. Give the agent the draft post and it returns one image record for the top of that post: the placement, the post the picture belongs to, the prompt the picture is made from, and alternative text. One post, one picture: there is no picture count, and nothing is settled for the body of the post.

The picture bytes are not filed with the record: every write road an agent can take is scoped in v1 to the text-authorable types, and `@cinatra-ai/blog-image-artifact:blog-image` accepts only image ones. The two sets do not meet, so no road reaches a picture: a run yields the record alone. The record already carries the post and the placement that type asks for, so a byte road is handed a record it accepts the day one opens.

Install from the Cinatra marketplace. The only field a person fills in is `post` - the draft post as plain text, before its review. Everything else is the runtime's own plumbing and stays hidden: the placement (always `featured`), the post the picture belongs to, the run, the context slot and the project. No external credentials are needed; the agent uses the platform LLM bridge.

The agent returns `{ image, notes }`. The `image` object carries `{ placement, post, prompt, altText }`, all four required - one object, never a list. The `notes` field is one or two sentences on the choice that was made.

A context slot (`imagePromptContext`) lets you attach a brand-voice artifact or a blog-post artifact before the image is settled. In interactive runs the platform shows a context-selection UI; in autonomous mode the slot resolves from previously attached artifacts. The slot hands the agent references to that material, not its contents.

This package replaces `@cinatra-ai/blog-image-prompt-agent`, which wrote lists of image prompts. That package is retired, and nothing feeds this one a prompt: the agent writes its own.

For local development, run `node extension-kind-gate.mjs --package-root .` and `npm test`; no build step.

## Works with

- Cinatra blog-post artifacts
- Cinatra blog-image artifacts
- Cinatra brand-voice artifacts

## Capabilities

- Read a draft blog post and decide what its featured image should show
- Write the prompt the picture is made from
- Return exactly one image record, the featured image, and never a body one
- Carry the post the picture belongs to and its placement with the record
- Offer alternative text for a reader who cannot see the picture
