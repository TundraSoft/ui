import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";

export type CollapsibleProps = {
  id: string;
  title: string | Html;
  content: Html;
  defaultOpen?: boolean;
  attrs?: Attrs;
};

export function Collapsible(props: CollapsibleProps): Html {
  const panelId = `${props.id}-panel`;
  const open = Boolean(props.defaultOpen);

  return html`
    <div class="collapsible" ${renderAttrs(props.attrs ?? {})}>
      <h3
        class="collapsible__heading"><button type="button" class="collapsible__trigger" data-toggle="#${panelId}" aria-expanded="${open
          ? "true"
          : "false"}" aria-controls="${panelId}">${props
          .title}<span class="collapsible__icon">&#9660;</span></button></h3>
      <div class="collapsible__panel" id="${panelId}" data-toggle-panel${open ? "" : html`
        hidden
      `}>${props.content}</div>
    </div>
  `;
}

export type AccordionProps = {
  id: string;
  items: Array<Omit<CollapsibleProps, "id" | "attrs"> & { id?: string }>;
  attrs?: Attrs;
};

export function Accordion(props: AccordionProps): Html {
  const panels = props.items.map((item, index) => Collapsible({ ...item, id: item.id ?? `${props.id}-${index}` }));

  return html`
    <div class="accordion" ${renderAttrs({
      ...props.attrs,
      id: props.id,
      "data-accordion-group": "",
    })}>${panels}</div>
  `;
}
