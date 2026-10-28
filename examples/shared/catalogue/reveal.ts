/** Catalogue cases for components/reveal — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Card } from "../../../components/card/card.ts";
import { LazySection, Parallax, Reveal, RevealGroup } from "../../../components/reveal/reveal.ts";
import { SkeletonCard } from "../../../components/skeleton/skeleton.ts";
import { caseCopy, caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const card = (title: string) => Card({ title, body: caseCopy });

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "reveal",
    cases: [
      caseOf(
        "every effect — fade / rise / scale / blur (revealed as they scroll in)",
        caseRow(
          Reveal({ content: card("fade"), effect: "fade", attrs: { id: "cat-reveal-fade", class: "cat-narrow" } }),
          Reveal({ content: card("rise"), effect: "rise", attrs: { id: "cat-reveal-rise", class: "cat-narrow" } }),
          Reveal({ content: card("scale"), effect: "scale", attrs: { class: "cat-narrow" } }),
          Reveal({ content: card("blur"), effect: "blur", attrs: { class: "cat-narrow" } }),
        ),
      ),
      caseOf(
        "delay 0 / 1 / 2 / 3 · tag span / li / section / div",
        html`
          ${Reveal({ content: card("delay 0"), delay: "0", tag: "div" })}<ul class="cat-row">${Reveal({
            content: card("delay 1"),
            delay: "1",
            tag: "li",
          })}</ul>${Reveal({ content: card("delay 2"), delay: "2", tag: "section" })}${Reveal({
            content: html`
              delay 3 — a span
            `,
            delay: "3",
            tag: "span",
          })}
        `,
      ),
      caseOf(
        "RevealGroup · stagger (#cat-reveal-group) · a ul group",
        html`
          ${RevealGroup({
            items: ["One", "Two", "Three", "Four"].map(card),
            stagger: true,
            attrs: { id: "cat-reveal-group" },
          })}${RevealGroup({ items: ["A", "B"].map(card), tag: "ul", stagger: false, once: false, effect: "fade" })}
        `,
      ),
      caseOf(
        "Parallax · speed slow / medium / fast (still on phones and under reduced motion)",
        caseRow(
          Parallax({ content: card("slow"), speed: "slow", attrs: { class: "cat-narrow" } }),
          Parallax({
            content: card("medium"),
            speed: "medium",
            attrs: { id: "cat-parallax-medium", class: "cat-narrow" },
          }),
          Parallax({ content: card("fast"), speed: "fast", attrs: { class: "cat-narrow" } }),
        ),
      ),
      caseOf(
        "LazySection — fetched when it nears the viewport with the runtime; keeps its placeholder on a plain page (#cat-lazy-band)",
        LazySection({
          id: "cat-lazy-band",
          action: "?lazy=band",
          placeholder: SkeletonCard(),
          rootMargin: "100px 0px",
        }),
      ),
    ],
  };
}
