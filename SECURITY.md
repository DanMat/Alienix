# Security Policy

## Supported versions

This is a small, static, client-side game. The latest version on the `main`
branch is the only supported version.

## A note on the leaderboard

Alienix can post high scores to a shared **Supabase** backend. The Supabase
**anon/publishable key** in `js/config.js` is *designed to be public* — the
database is protected by row-level-security policies (see `docs/supabase.sql`).
Publishing that key is expected and is not a vulnerability.

As with any client-side leaderboard, scores can be spoofed by a determined user.
The validation constraints in the RLS policy stop casual tampering; server-side
game validation is intentionally out of scope for an arcade board.

## Reporting a vulnerability

If you discover a genuine security issue (for example a cross-site scripting
vector in how initials or leaderboard rows are rendered, or a way to bypass the
RLS policies), please report it privately rather than opening a public issue.

- Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
  ("Report a vulnerability" under the repository's **Security** tab), **or**
- Email the maintainer at **dannymatthew@gmail.com**.

Please include a description, steps to reproduce, and the browser/version. You
can expect an initial response within **7 days**.
