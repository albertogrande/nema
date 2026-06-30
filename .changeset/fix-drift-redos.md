---
"@getnema/drift": patch
"@getnema/cli": patch
---

Harden `@getnema/drift` symbol extraction against the polynomial-regex (ReDoS)
and file-race issues CodeQL flagged on the code-drift engine:

- Rewrite the export-list and `as`-rename regexes so they have no two competing
  `\s` quantifiers (linear over arbitrary source — adversarial inputs that used
  to be quadratic now run in well under a millisecond).
- `nema bind` reads the page file directly with a try/catch instead of an
  `existsSync` pre-check, removing a time-of-check/time-of-use race.
