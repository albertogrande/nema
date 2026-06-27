---
"@getnema/producer": minor
"@getnema/cli": minor
---

Add `nema generate <source-repo>` — docs-from-code, on rails.

`generate` is a deterministic scaffolder: it ingests a source repo (package metadata,
README intro, and the exported symbols of the entry file), plans a small diátaxis doc set
(overview + getting-started + API reference), and writes seeded `draft` pages whose bodies
are a factual skeleton extracted from the code — an export table, install snippet, section
stubs — with provenance pointing at the real source files. It never writes prose: the
explanatory text is left to the user's own agent, which fills the skeleton through the
existing draft loop. The generated corpus is gate-green out of the box (`nema check`).

With `--model-name`, pages are seeded `authored_by: ai`; without it, `authored_by: human`
(a human ran the scaffolder; the agent that fills the prose stamps itself later).
