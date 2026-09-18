# Releasing

Releases are automatic; a maintainer merges a pull request.

1. Commit to `main` with [conventional commits](https://www.conventionalcommits.org/): `feat:` (minor while pre-1.0),
   `fix:`, `perf:`, `refactor:`, `docs:` show up in the changelog; `chore:`, `test:`, `ci:` do not.
2. [release-please](https://github.com/googleapis/release-please) keeps one `chore(main): release x.y.z` PR open. It
   bumps the version in `deno.json`, `package.json` and the marked lines of `version.ts`, and prepends `CHANGELOG.md`.
3. Merging it tags `vx.y.z`, creates the GitHub release, and the `publish` job in the same run builds the bundle, checks
   `version.ts` matches the build, publishes to **npm first** (jsDelivr serves the CDN bundle from npm and `version.ts`
   points at those URLs), waits until jsDelivr answers with the hashed bytes, then publishes to **JSR**.

## One-time setup

- **JSR**: create `@tundralibs/ui` on jsr.io and link it to the `TundraSoft/ui` GitHub repository, so `deno publish`
  from Actions authenticates with OIDC (no token).
- **npm**: either enable trusted publishing for `@tundralibs/ui` with this repository and the `release-please.yml`
  workflow (preferred, no secret), or add an `NPM_TOKEN` repository secret (an automation token with publish rights).
- **`RELEASE_PLEASE_TOKEN`** (optional): a fine-grained PAT with contents and pull-requests write, so the release PR
  triggers CI. Without it the workflow still works, but the PR's checks must be triggered by hand (close/reopen).
- **Wiki**: create the wiki's first page once in the GitHub UI; `wiki-sync.yml` owns it from then on.

## The first release

The manifest starts at `0.0.0` and `initial-version` in the config pins the first cut to `0.1.0` (without it,
release-please treats a repository with no release tag as a first release and proposes `1.0.0`). The first commit on
`main` is `feat: initial release`; the docs already quote `@0.1.0` CDN URLs as the example pin.

## Manual fallback

A manual run of "Release Please" (`workflow_dispatch`) recomputes the release PR; tick **publish** to also (re-)publish
the version at `HEAD` to npm and JSR — it must already be tagged and match the manifest. Locally, the same steps are
`deno task build`, `npm publish --access public`, `deno publish`.

## Keeping up with rAPId

`.github/workflows/rapid-bump.yml` runs daily: when JSR has a newer `@tundralibs/rapid` than `deno.json` pins, it bumps
both manifests, runs the full suite against it and opens a `feat(deps)` PR with auto-merge enabled (the repository
setting "Allow auto-merge" must stay on, and `RELEASE_PLEASE_TOKEN` is what makes CI run on that PR). If the suite
fails, nothing is bumped and a `ci-health` issue is filed. Run it by hand from the Actions tab after fixing such an
issue.
