/** Catalogue cases for components/toggle — see examples/shared/catalogue.ts. */
import type { CatalogueEntryInput, CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return { name: "toggle", cases: [] };
}
