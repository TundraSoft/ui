/** Catalogue cases for components/rating — see examples/shared/catalogue.ts. */
import { Rating, type RatingSize } from "../../../components/rating/rating.ts";
import { caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const sizes: RatingSize[] = ["sm", "md", "lg"];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "rating",
    cases: [
      ...sizes.map((size) =>
        caseOf(
          `size ${size} · interactive, value 3`,
          Rating({ id: `cat-rating-${size}`, name: `rating-${size}`, label: "Your rating", value: 3, size }),
        )
      ),
      caseOf(
        "clearable · click the picked star again",
        Rating({ id: "cat-rating-clear", name: "rating-clear", label: "Your rating", value: 4, clearable: true }),
      ),
      caseOf(
        "custom labels · max 3",
        Rating({
          id: "cat-rating-labels",
          name: "rating-labels",
          label: "How was it?",
          max: 3,
          labels: ["Poor", "Fine", "Great"],
        }),
      ),
      caseOf("disabled", Rating({ id: "cat-rating-disabled", label: "Your rating", value: 2, disabled: true })),
      caseOf(
        "read-only · 4.5, 2, 0 of 5",
        caseRow(
          Rating({ id: "cat-rating-ro-45", label: "Average rating", value: 4.5, readOnly: true }),
          Rating({ id: "cat-rating-ro-2", label: "Average rating", value: 2, readOnly: true, size: "sm" }),
          Rating({ id: "cat-rating-ro-0", label: "Average rating", value: 0, readOnly: true, size: "lg" }),
        ),
      ),
    ],
  };
}
