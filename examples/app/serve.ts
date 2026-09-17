/**
 * Starts the example app. `UI_ASSETS=cdn` loads the bundle from jsDelivr
 * (needs the published package); the default self-hosts dist/ at /ui.
 * `PORT` overrides 8010.
 */
import { getEnv } from "@tundralibs/compat/runtime";
import { createApp } from "./app.ts";

const env = getEnv();
const assets = env.UI_ASSETS === "cdn" ? "cdn" : (env.UI_ASSETS as `/${string}` | undefined) ?? "/ui";
const app = await createApp({ port: Number(env.PORT) || 8010, assets });
await app.start();
console.log(`@tundralibs/ui example — http://127.0.0.1:${app.port}/ (assets: ${assets})`);
