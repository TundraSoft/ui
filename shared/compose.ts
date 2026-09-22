/**
 * Join the parts that `Input`'s composite fields submit — for a handler
 * reading `await ctx.payload` (or any parsed form body).
 *
 * - `type: "email"` + `domains` → `<name>` (local part) and `<name>-domain`
 * - `type: "tel"` + `countries` → `<name>-country` and `<name>` (number)
 * - `type: "url"` + `scheme` → `<name>-scheme` and `<name>` (the rest)
 *
 * Each returns the joined value, `undefined` when the main part is
 * missing or empty, and passes a value that already carries the other
 * part through untouched (a plain `Input` posted to the same handler).
 */
type Body = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);

/** `local` + `@` + `domain`. */
export function emailFrom(body: Body, name = "email"): string | undefined {
  const local = str(body[name]);
  if (!local) return undefined;
  if (local.includes("@")) return local;
  const domain = str(body[`${name}-domain`]);
  return domain ? `${local}@${domain}` : local;
}

/** `+code` + ` ` + `number`, digits only in the number part apart from one leading `+` in the code. */
export function telFrom(body: Body, name = "phone"): string | undefined {
  const number = str(body[name]);
  if (!number) return undefined;
  if (number.startsWith("+")) return number;
  const code = str(body[`${name}-country`]);
  return code ? `${code} ${number}` : number;
}

/** `scheme` + `rest`, unless the rest already has a scheme. */
export function urlFrom(body: Body, name = "url"): string | undefined {
  const rest = str(body[name]);
  if (!rest) return undefined;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(rest)) return rest;
  const scheme = str(body[`${name}-scheme`]);
  return scheme ? `${scheme}${rest}` : rest;
}
