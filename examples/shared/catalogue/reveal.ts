/** Catalogue cases for components/reveal — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Card } from "../../../components/card/card.ts";
import { Carousel } from "../../../components/carousel/carousel.ts";
import {
  CountUp,
  LazySection,
  Parallax,
  Reveal,
  RevealGroup,
  ScrollProgress,
  ScrollSteps,
} from "../../../components/reveal/reveal.ts";
import { SkeletonCard } from "../../../components/skeleton/skeleton.ts";
import { caseCopy, caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const card = (title: string) => Card({ title, body: caseCopy });

const stepMedia = (label: string) =>
  Card({
    title: label,
    body: html`
      <p>The stage shows this while its step is current.</p>
    `,
    variant: "elevated",
  });

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "reveal",
    cases: [
      caseOf(
        "every effect — fade / rise / scale / blur (revealed as they scroll in); rise and scale only move, so text is never invisible — fade, blur and hide: true start transparent (#cat-reveal-hide)",
        caseRow(
          Reveal({ content: card("fade"), effect: "fade", attrs: { id: "cat-reveal-fade", class: "cat-narrow" } }),
          Reveal({ content: card("rise"), effect: "rise", attrs: { id: "cat-reveal-rise", class: "cat-narrow" } }),
          Reveal({ content: card("scale"), effect: "scale", attrs: { class: "cat-narrow" } }),
          Reveal({
            content: card("rise · hide"),
            effect: "rise",
            hide: true,
            attrs: { id: "cat-reveal-hide", class: "cat-narrow" },
          }),
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
      caseOf(
        "ScrollProgress — position top (the page's own progress, CSS-only where scroll timelines exist, #cat-scroll-progress-top) / bottom tracking this case (#cat-scroll-progress-bottom)",
        html`
          ${ScrollProgress({ id: "cat-scroll-progress-top" })}${ScrollProgress({
            id: "cat-scroll-progress-bottom",
            position: "bottom",
            target: "#cat-scroll-progress-bottom-target",
          })}
          <p id="cat-scroll-progress-bottom-target">
            The bottom bar fills as this paragraph scrolls past; the top bar fills with the page.
          </p>
        `,
      ),
      caseOf(
        "CountUp — duration fast / base / slow · format number / compact / percent / currency · tag span / strong / b (#cat-count-up)",
        caseRow(
          html`
            <span class="text-semibold">${CountUp({
              value: 12840,
              duration: "fast",
              attrs: { id: "cat-count-up" },
            })}</span>
          `,
          CountUp({ value: 1284000, format: "compact", duration: "base", tag: "strong" }),
          CountUp({ value: 0.42, format: "percent", duration: "slow", tag: "b" }),
          CountUp({ value: 99.5, format: "currency:EUR", locale: "de-DE", from: 50 }),
          CountUp({ value: 4.8, decimals: 1, tag: "span" }),
        ),
      ),
      caseOf(
        "ScrollSteps — height sm · stage end (#cat-scroll-steps); below 768 each step shows its media in flow",
        ScrollSteps({
          id: "cat-scroll-steps",
          height: "sm",
          steps: [
            {
              content: html`
                <h3>1. Send</h3>
                <p>An invoice goes out with one click.</p>
              `,
              media: stepMedia("Send"),
            },
            {
              content: html`
                <h3>2. Chase</h3>
                <p>Reminders follow on the schedule you set.</p>
              `,
              media: stepMedia("Chase"),
            },
            {
              content: html`
                <h3>3. Collect</h3>
                <p>Payment lands and the ledger closes itself.</p>
              `,
              media: stepMedia("Collect"),
            },
          ],
        }),
      ),
      caseOf(
        "ScrollSteps — a Carousel, a labelled field and an SVG gradient as media: one displayed copy, unique ids, only the current picture's controls take focus (#cat-scroll-steps-ids)",
        ScrollSteps({
          id: "cat-scroll-steps-ids",
          height: "sm",
          steps: [
            ...["a", "b"].map((key) => ({
              content: html`
                <h3>Step ${key}</h3>
              `,
              media: html`
                <div>
                  ${Carousel({
                    id: `cat-steps-carousel-${key}`,
                    label: `Pictures for step ${key}`,
                    items: [stepMedia(`${key} one`), stepMedia(`${key} two`)],
                  })}
                  <label for="cat-steps-note-${key}">Note ${key}</label>
                  <input class="input" id="cat-steps-note-${key}" aria-describedby="cat-steps-help-${key}">
                  <span id="cat-steps-help-${key}">Help ${key}</span>
                  <a href="#cat-steps-help-${key}">To the help</a>
                  <a href="#elsewhere">Elsewhere</a>
                </div>
              `,
            })),
            {
              content: html`
                <h3>Step c, no media of its own</h3>
              `,
            },
          ],
        }),
      ),
      caseOf(
        "ScrollSteps — height md / lg · stage start · a step without media keeps the last one · dim: false keeps every step at full text colour (#cat-scroll-steps-md)",
        html`
          ${ScrollSteps({
            id: "cat-scroll-steps-md",
            height: "md",
            stage: "start",
            label: "How it works",
            dim: false,
            steps: [
              {
                content: html`
                  <h3>Stage on the start side</h3>
                `,
                media: stepMedia("md"),
              },
              {
                content: html`
                  <h3>No media of its own</h3>
                `,
              },
            ],
          })}${ScrollSteps({
            id: "cat-scroll-steps-lg",
            height: "lg",
            steps: [{
              content: html`
                <h3>A full-height band</h3>
              `,
              media: stepMedia("lg"),
            }],
          })}
        `,
      ),
    ],
  };
}
