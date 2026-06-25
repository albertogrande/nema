<!-- SPDX-License-Identifier: Apache-2.0 -->

# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities **privately** through GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
("Report a vulnerability" under the repository's **Security** tab).

Do **not** open a public issue for security problems.

We will acknowledge your report, work with you on a fix and disclosure timeline, and credit you
unless you prefer to remain anonymous.

## Supported versions

Nema is pre-1.0. Security fixes land on `main` and the latest published `0.x` line.

## Scope notes

- Nema runs `git` and `gh` as subprocesses on the producer path. Reports about command
  construction, argument injection, or untrusted-input handling on that path are in scope.
- The MCP server exposes **write** tools. Reports about path traversal, writes outside the
  configured content root, or provenance forgery are especially welcome.
