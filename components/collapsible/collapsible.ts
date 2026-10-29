import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";

export type CollapsibleProps = {
  /**
   * The row's own id, on its root: `#<id>` (or the id of anything inside
   * the row) in the address opens the row on arrival and on hashchange.
   * The panel is `<id>-panel`.
   */
  id: string;
  title: string | Html;
  content: Html;
  defaultOpen?: boolean;
  /**
   * Rows sharing a name are exclusive: opening one closes the others — the
   * native `<details name>`, so it holds without the script in a browser
   * that supports it. `Accordion` sets it to its own id.
   */
  name?: string;
  attrs?: Attrs;
};

/**
 * A disclosure row: a native `<details>` whose `<summary>` is the trigger,
 * so it opens and closes with no script at all. collapsible.js adds the
 * height animation, animated accordion exclusivity and hash deep links.
 */
export function Collapsible(props: CollapsibleProps): Html {
  return html`
    <details ${classAttrs(
      "collapsible",
      mergeAttrs(props.attrs, {
        id: props.id,
        name: props.name,
        open: props.defaultOpen ? "" : undefined,
      }),
    )}>
      <summary class="collapsible__trigger">
        <h3 class="collapsible__heading">${props.title}</h3><span class="collapsible__icon" aria-hidden="true">${Icon(
          "chevronDown",
          { size: 14 },
        )}</span>
      </summary>
      <div class="collapsible__panel" id="${props.id}-panel">
        <div class="collapsible__inner">${props.content}</div>
      </div>
    </details>
  `;
}

export type AccordionProps = {
  id: string;
  /** Each row's `id` (default `<accordion id>-<index>`) is its deep-link target. */
  items: Array<Omit<CollapsibleProps, "id" | "name" | "attrs"> & { id?: string }>;
  attrs?: Attrs;
};

/** Rows of which one is open at a time: `Collapsible`s sharing the accordion's id as their `name`. */
export function Accordion(props: AccordionProps): Html {
  const panels = props.items.map((item, index) =>
    Collapsible({ ...item, id: item.id ?? `${props.id}-${index}`, name: props.id })
  );

  return html`
    <div ${classAttrs(
      "accordion",
      mergeAttrs(props.attrs, {
        id: props.id,
        "data-accordion-group": "",
      }),
    )}>${panels}</div>
  `;
}
