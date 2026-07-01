---
"@getnema/cli": minor
---

`nema draft` can now cite sources at authoring time with a repeatable
`--source "<id>=<ref>"` flag. The `<ref>` becomes the source title; an `http(s)`
ref is also recorded as its `url`. Each source lands as a structured
`provenance.sources` entry, and the command auto-defines its footnote in a
`## Sources` section so an author who cites `[^id]` in their prose doesn't also
have to hand-write the definition (mirroring what `nema generate` emits).

The `id` is explicit so you can reference it: a source that is declared but never
cited (`[^id]`) is still caught by the `provenance-consistency` gate — that
coupling is intentional. Malformed specs and duplicate ids fail with a clear
message, not a stack trace.

Closes the "draft can't cite sources at authoring time" DX finding.
