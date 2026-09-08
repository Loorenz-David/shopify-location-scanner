import type { StockOptionsDto, StockPropertiesDto } from "../types/stock.dto";

/**
 * Wood groups on the wizard side.
 *
 * `wood_group` is a derived key: no item stores it, and the backend computes it
 * from the item's first `wood_type` token. Here it is simply another property
 * key served by GET /options — the picker needs to know only two things about
 * it, both below.
 */

export const WOOD_TYPE_KEY = "wood_type";
export const WOOD_GROUP_KEY = "wood_group";

const OPPOSITE_WOOD_KEY: Readonly<Record<string, string>> = {
  [WOOD_TYPE_KEY]: WOOD_GROUP_KEY,
  [WOOD_GROUP_KEY]: WOOD_TYPE_KEY,
};

/**
 * Drops the wood key a draft can no longer use.
 *
 * Criteria are AND-ed, so a definition holding both a named wood and a wood
 * group matches only their intersection — in practice nothing. The API refuses
 * the pair outright; hiding it here means the user never builds one and reads
 * the refusal as a bug in the form.
 */
export function withoutConflictingWoodKey<T extends { key: string }>(
  definitions: readonly T[],
  usedKeys: readonly string[],
): T[] {
  const blocked = new Set(
    usedKeys
      .map((key) => OPPOSITE_WOOD_KEY[key])
      .filter((key): key is string => key !== undefined),
  );

  return definitions.filter((definition) => !blocked.has(definition.key));
}

/**
 * The woods a group catches, as a caption for the value picker.
 *
 * `Dark` alone says nothing about which items it takes, and the member lists
 * are expected to be edited — so they are read from the API rather than kept
 * as a second copy here. Returns null when the server did not send them, and
 * the picker then shows the bare group name.
 */
export function woodGroupCaption(
  group: string,
  options: StockOptionsDto,
): string | null {
  const members = options.woodGroups?.[group];
  return members !== undefined && members.length > 0 ? members.join(", ") : null;
}

export interface WoodGroupLegendEntry {
  group: string;
  members: string;
}

/**
 * The wood-group legend printed at the foot of the PDF report.
 *
 * Returns an empty list when no row in the report uses a wood group — a legend
 * explaining criteria the document does not contain is noise — and when the
 * server sent no members to explain.
 *
 * Once one row uses a group, EVERY configured group is listed, not just the
 * ones on the page. A reader whose question is "why is this walnut chair not
 * under Light" is answered by seeing Dark spelled out, and that group may well
 * have no row in this particular report.
 */
export function woodGroupLegend(
  rows: readonly { properties: StockPropertiesDto }[],
  options: StockOptionsDto,
): WoodGroupLegendEntry[] {
  const usesGroups = rows.some((row) =>
    Object.prototype.hasOwnProperty.call(row.properties, WOOD_GROUP_KEY),
  );
  if (!usesGroups) {
    return [];
  }

  return Object.entries(options.woodGroups ?? {})
    .filter(([, members]) => members.length > 0)
    .map(([group, members]) => ({ group, members: members.join(", ") }));
}
