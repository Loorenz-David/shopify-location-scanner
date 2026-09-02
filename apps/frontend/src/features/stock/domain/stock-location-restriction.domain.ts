import { locationBlockOf } from "../../../share/location-codes";

// TEMPORARY, frontend only. The backend still hands the wizard every location block; for
// now the picker offers the LC block alone, so it filters here and opens straight on that
// block's numbers instead of asking for a letter first. A list with no LC code falls back
// to everything it was given, two-step picker included — the restriction never leaves the
// user with nothing to choose (a shop whose codes are all H/L would otherwise be unable to
// configure any instance at all). Lifting it means deleting this module and its call sites
// in StockWizardStep1View; nothing else reads it, and the store still holds the full list.
export const RESTRICTED_LOCATION_BLOCK = "LC";

export interface RestrictedLocations {
  locations: string[];
  // The block whose numbers the picker should open on, or null when the fallback is in
  // play and the picker keeps its letter-block first step.
  directBlock: string | null;
}

export function restrictLocationsToBlock(
  locations: readonly string[],
  block: string = RESTRICTED_LOCATION_BLOCK,
): RestrictedLocations {
  const wanted = block.toUpperCase();
  const restricted = locations.filter(
    (location) => locationBlockOf(location) === wanted,
  );

  return restricted.length === 0
    ? { locations: [...locations], directBlock: null }
    : { locations: restricted, directBlock: wanted };
}
