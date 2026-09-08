/**
 * Wood groups: a coarse alternative to naming individual woods on a stock
 * definition. A definition carries EITHER a `wood_type` criterion (one or more
 * named woods) OR a `wood_group` one — never both.
 *
 * `wood_group` is a DERIVED key. No item ever stores it: the matcher computes
 * it from the item's FIRST `wood_type` token (see `deriveItemProperties` in
 * best-match.ts), so an item listed as "Teak, Beech" is Teak and nothing else.
 *
 * Member spellings were checked against the live shop with
 * report-stock-property-drift.ts. `Santos Rosewood` is the stored spelling —
 * plain `Rosewood` appears nowhere, so it is not listed.
 *
 * `Dark Oak` and `Dark Teak` do NOT occur in the data today: the shop stores
 * plain `Oak` and `Teak`, which sit in Light and Teak respectively. They are
 * listed deliberately, so that if those spellings ever arrive they land in Dark
 * rather than silently falling out of every group. Until then they match
 * nothing, which costs nothing.
 *
 * PROVISIONAL: reviewed before production. This object is the only place the
 * lists live — editing it moves the wizard's options, the matcher and the
 * report together, with no migration and no backfill. A wood in no group
 * (`Other` is the only one left in the data) matches no group criterion at all,
 * which is the safe default. Counts follow on the next reconcile, which any
 * definition create/update/delete triggers.
 */
export const WOOD_GROUPS: Readonly<Record<string, readonly string[]>> = {
  Dark: ["Mahogany", "Santos Rosewood", "Dark Oak", "Dark Teak", "Walnut"],
  Teak: ["Teak", "Cherry"],
  Light: ["Oak", "Beech", "Pine", "Birch", "Elm"],
};

/** The item property the groups are derived FROM. */
export const WOOD_TYPE_KEY = "wood_type";
/** The derived property the groups are selected AS. */
export const WOOD_GROUP_KEY = "wood_group";

export const WOOD_GROUP_NAMES: readonly string[] = Object.keys(WOOD_GROUPS);

const normalizeMember = (member: string): string => member.trim().toLowerCase();

/**
 * Built once, and it validates the table while doing so. Both throws are
 * configuration errors that would otherwise fail silently at match time: a
 * group name carrying a separator would be re-split by the tokenizer into
 * pieces that match nothing, and a wood in two groups would resolve by
 * whichever key happened to be declared last.
 */
const groupByMember = ((): ReadonlyMap<string, string> => {
  const byMember = new Map<string, string>();

  for (const [group, members] of Object.entries(WOOD_GROUPS)) {
    if (/[,\/]/.test(group)) {
      throw new Error(
        `Wood group name '${group}' cannot contain ',' or '/': the property tokenizer splits on both`,
      );
    }

    for (const member of members) {
      const normalized = normalizeMember(member);
      const existing = byMember.get(normalized);
      if (existing !== undefined) {
        throw new Error(
          `Wood '${member}' is in both the '${existing}' and '${group}' groups; a wood belongs to at most one`,
        );
      }

      byMember.set(normalized, group);
    }
  }

  return byMember;
})();

/**
 * The group a single wood token belongs to, or `null` when it belongs to none.
 *
 * `token` is expected already trimmed and lowercased, as the property tokenizer
 * produces it; it is normalized again here so a caller passing a raw catalogue
 * value ("Santos Rosewood") gets the same answer.
 */
export const woodGroupOfToken = (token: string): string | null =>
  groupByMember.get(normalizeMember(token)) ?? null;
