---
"create-nema": patch
---

Bump the scaffold's `@getnema/*` pins to the versions this release publishes
(`cli ^0.4.0`, `core`/`schema ^0.2.0`) so a clean-env `npx create-nema` installs
the current line instead of an older one. A caret range on a `0.x` version pins
the *minor*, so the previous `^0.3.0`/`^0.1.0` pins would have capped new users
below the 0.4/0.2 release.

The `scaffold.test.ts` guard now reads the live workspace versions and fails CI
if any pin would cap below what ships — so a stale pin can no longer reach npm.
