import { html, type RapidTemplate, template } from "@tundralibs/rapid/ui";
import { Button } from "../components/button/button.ts";

/** Mirrors rAPId's own internal `ErrorData` shape (ui/errorPage.ts) — not
 * exported by the package, so re-declared here structurally. */
type ErrorData = Record<string, unknown> & {
  status?: number;
  code?: string;
  message?: string;
  requestId?: string;
  mode?: string;
  details?: Record<string, unknown>;
  debug?: Record<string, unknown>;
};

function heading(status: number): string {
  if (status === 404) return "Not found";
  if (status >= 500) return "Something went wrong";
  return "That request didn't work";
}

function detailRows(record: Record<string, unknown>) {
  return Object.entries(record).map(([key, value]) =>
    html`
      <tr>
        <th>${key}</th>
        <td>${typeof value === "string" ? value : JSON.stringify(value)}</td>
      </tr>
    `
  );
}

/** Drop-in CSP-clean replacement for rAPId's `DefaultErrorPage` (§9) —
 * same `ErrorData` payload, this library's tokens/components instead of
 * inline `style=`. Renders inside the core, same as the original. */
export const ErrorTemplate: RapidTemplate<Record<string, unknown>> = template<
  ErrorData
>((e) => {
  const status = typeof e.status === "number" ? e.status : 500;

  return html`
    <main
      class="error-page container"><p class="error-page__meta">${String(status)}${e.code && html`
        &middot; ${e.code}
      `}</p><h1>${heading(status)}</h1>${e.message && html`<p>${e.message}</p>`}${e.details &&
        html`
          <table class="error-page__details">
            <tbody>${detailRows(e.details)}</tbody>
          </table>
        `}${e.debug &&
        html`<pre class="error-page__debug">${
          JSON.stringify(e.debug, null, 2)
        }</pre>`}<div class="error-page__actions">${Button({
          label: "Go back",
          href: "/",
          variant: "outline",
        })}</div>${e.requestId &&
        html`<p class="error-page__request-id">request ${e.requestId}</p>`}</main>
  `;
}, "error");

export const errorTemplates = {
  default: ErrorTemplate,
  "4xx": ErrorTemplate,
  "5xx": ErrorTemplate,
};
