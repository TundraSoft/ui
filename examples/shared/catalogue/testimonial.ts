/** Catalogue cases for components/testimonial — see examples/shared/catalogue.ts. */
import { Avatar } from "../../../components/avatar/avatar.ts";
import { Testimonial, TestimonialGrid, type TestimonialProps } from "../../../components/testimonial/testimonial.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const voices: TestimonialProps[] = [
  {
    quote: "We stopped chasing. The reminders go out, the money comes in, and I read a book on the first of the month.",
    name: "Priya Natarajan",
    role: "Founder, Northwind Traders",
    avatar: Avatar({ initials: "PN", size: "sm" }),
    rating: 5,
  },
  {
    quote: "Our days-sales-outstanding went from 41 to 19 in a quarter.",
    name: "Marcus Thorne",
    role: "CFO, Contoso Ltd",
    avatar: Avatar({ initials: "MT", size: "sm" }),
    rating: 5,
  },
  {
    quote: "The first invoicing tool our accountant did not ask us to replace.",
    name: "Jamie Sun",
    role: "Operations, Fabrikam",
    avatar: Avatar({ initials: "JS", size: "sm" }),
    rating: 4,
  },
];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "testimonial",
    cases: [
      caseOf("TestimonialGrid · columns 3", TestimonialGrid({ items: voices, columns: "3" })),
      caseOf("TestimonialGrid · columns 2", TestimonialGrid({ items: voices.slice(0, 2), columns: "2" })),
      caseOf(
        "variant large · rating",
        Testimonial({ ...voices[0], variant: "large", logo: undefined }),
      ),
      caseOf("variant plain", Testimonial({ ...voices[1], variant: "plain" })),
      caseOf(
        "variant card · rating 3 · no avatar",
        Testimonial({ ...voices[2], variant: "card", avatar: undefined, rating: 3 }),
      ),
    ],
  };
}
