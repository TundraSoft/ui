---
name: CI Health Failure
about: >-
  Auto-filed when the weekly health workflow fails. Not for manual bug
  reports — use a regular issue for a broken component or template.
title: Weekly health check failed
labels: ci-health
---

The scheduled **weekly health** run failed. This is drift detection: nothing in the repo changed, but the world did — a
new runtime release, a new rAPId release, or a newly published advisory.

One or more of these jobs did not pass; the run linked below names which:

- **Runtime drift** — a new Deno / Bun / Node release, or a new Chrome on the runner, broke the build or a browser
  suite.
- **rAPId canary** — the latest published `@tundralibs/rapid` no longer works with the templates, the core, or the
  example app (the pin in `deno.json` is what consumers get; this job runs against `@latest`).
- **Dependency audit** — a new advisory was published for a dependency.
- **CDN assets** — the published bundle on jsDelivr no longer matches the `version.ts` manifest (integrity), or is
  unreachable.
