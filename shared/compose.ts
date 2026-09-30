/**
 * Join the parts that `Input`'s composite fields submit — for a handler
 * reading `await ctx.payload` (or any parsed form body).
 *
 * - `type: "email"` + `domains` → `<name>` (local part) and `<name>-domain`
 * - `type: "tel"` + `countries` → `<name>-country` and `<name>` (number)
 * - `type: "url"` + `scheme` → `<name>-scheme` and `<name>` (the rest)
 * - `DateTimePicker` → `<name>` (the UTC instant, written by its script)
 *   and `<name>-date` + `<name>-time` (what a no-JS page posts)
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

/**
 * The `DateTimePicker`'s value as an ISO UTC instant (`2026-10-01T09:00:00Z`):
 * `<name>` when its script wrote one, else `<name>-date` + `<name>-time`
 * read as UTC wall time (a no-JS page, where the parts are exactly what
 * the server rendered and the zone chip says UTC). `undefined` when
 * neither is complete. Normalises any zoned ISO string it is given.
 */
export function dateTimeFrom(body: Body, name = "at"): string | undefined {
  const whole = str(body[name]);
  if (whole) {
    const zoned = /(?:Z|[+-]\d\d:?\d\d)$/i.test(whole) ? whole : `${whole}Z`;
    const d = new Date(zoned);
    if (!Number.isNaN(d.getTime())) return `${d.toISOString().slice(0, 19)}Z`;
  }
  const date = str(body[`${name}-date`]);
  const time = str(body[`${name}-time`]);
  if (!date || !time || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return undefined;
  const d = new Date(`${date}T${time}:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : `${d.toISOString().slice(0, 19)}Z`;
}
