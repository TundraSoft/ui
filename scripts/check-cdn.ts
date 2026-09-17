/**
 * Fetches the published bundle from the jsDelivr URLs in version.ts and
 * checks that each file's sha384 matches the SRI hash the core template
 * emits — the exact check a browser performs before running it. A
 * mismatch means the npm publish and the committed manifest drifted (or
 * the CDN copy is wrong); a fetch failure means the CDN path consumers
 * rely on is down. Skips while this version is not on npm yet — the check
 * only means something once a publish has happened.
 */
import { exit } from "@tundralibs/compat/runtime";
import { UI_ASSETS, VERSION } from "../version.ts";

const onNpm = VERSION !== "0.0.0" &&
  (await fetch(`https://registry.npmjs.org/@tundralibs/ui/${VERSION}`, { method: "HEAD" }).then(
    (r) => r.ok,
    () => false,
  ));
if (!onNpm) {
  console.log(`@tundralibs/ui@${VERSION} is not on npm — nothing for jsDelivr to serve yet, skipping the CDN check`);
} else {
  let failed = false;
  for (const asset of UI_ASSETS) {
    const res = await fetch(asset.url);
    if (!res.ok) {
      console.log(`FAIL ${asset.url}: HTTP ${res.status}`);
      failed = true;
      continue;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const digest = await crypto.subtle.digest("SHA-384", bytes.slice());
    const sri = `sha384-${btoa(String.fromCharCode(...new Uint8Array(digest)))}`;
    const ok = sri === asset.integrity;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${asset.url} (${bytes.length} bytes) ${
        ok ? "" : `— expected ${asset.integrity}, got ${sri}`
      }`,
    );
    if (!ok) failed = true;
  }
  if (failed) exit(1);
}
