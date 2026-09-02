import { criteriaSummaryText } from "./stock-criteria.domain";
import {
  compareByStateIndex,
  countByStateBucket,
  STOCK_STATES,
} from "./stock-states.domain";
import type {
  StockOptionsDto,
  StockPropertiesDto,
  StockReportEntryDto,
} from "../types/stock.dto";
import type {
  CompactedReportRow,
  CounterTiles,
  ReportContribution,
  ReportEntryDetail,
  ReportLocationGroup,
  ReportView,
  StockFilterState,
} from "../types/stock.types";

const GROUP_SEPARATOR = "\u001e";
const KEY_VALUE_SEPARATOR = "\u001f";

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (character) => character.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);

  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }

  return leftPoints.length - rightPoints.length;
}

function compareCaseInsensitive(left: string, right: string): number {
  return compareCodePoints(left.toLowerCase(), right.toLowerCase());
}

function compareNumbers(left: number, right: number): number {
  return left - right;
}

export function missingQuantityForEntry(
  entry: Pick<
    StockReportEntryDto,
    "quantity" | "thresholds" | "unitsToRestockTarget"
  >,
): number {
  if (entry.unitsToRestockTarget !== undefined) {
    return entry.unitsToRestockTarget;
  }

  // Fallback mirrors the backend: the restock target is the highest
  // configured threshold.
  const restockTarget = entry.thresholds.reduce(
    (highest, { thresholdQuantity }) => Math.max(highest, thresholdQuantity),
    0,
  );

  return Math.max(0, restockTarget - entry.quantity);
}

function orderPropertyKeys(
  properties: StockPropertiesDto,
  keyOrder: readonly string[],
): string[] {
  const order = new Map(keyOrder.map((key, index) => [key, index]));

  return Object.keys(properties).toSorted((left, right) => {
    const leftIndex = order.get(left);
    const rightIndex = order.get(right);

    if (leftIndex !== undefined || rightIndex !== undefined) {
      return (leftIndex ?? Number.POSITIVE_INFINITY) -
        (rightIndex ?? Number.POSITIVE_INFINITY);
    }

    return compareCodePoints(left, right);
  });
}

export function propertiesComparisonString(
  properties: StockPropertiesDto,
  keyOrder: readonly string[],
): string {
  return orderPropertyKeys(properties, keyOrder)
    .map((key) => {
      const value = properties[key];
      const values = value === null
        ? ["*"]
        : Array.isArray(value)
          ? value
          : [value];

      return [key, ...values].join(KEY_VALUE_SEPARATOR);
    })
    .join(GROUP_SEPARATOR)
    .toLowerCase();
}

function contributionComparisonString(
  contributions: readonly ReportContribution[],
): string {
  return contributions
    .map(({ location, quantity, unitsToRestockTarget }) =>
      [location, quantity, unitsToRestockTarget].join(KEY_VALUE_SEPARATOR),
    )
    .join(GROUP_SEPARATOR);
}

function compareCompactRows(
  left: CompactedReportRow,
  right: CompactedReportRow,
  keyOrder: readonly string[],
): number {
  const comparisons = [
    compareByStateIndex(left.stockState, right.stockState),
    compareNumbers(left.quantity, right.quantity),
    compareNumbers(left.unitsToRestockTarget, right.unitsToRestockTarget),
    compareCaseInsensitive(left.itemCategory, right.itemCategory),
    compareCodePoints(
      propertiesComparisonString(left.properties, keyOrder),
      propertiesComparisonString(right.properties, keyOrder),
    ),
    compareCodePoints(left.locations, right.locations),
  ];

  for (const comparison of comparisons) {
    if (comparison !== 0) {
      return comparison;
    }
  }

  const mergeKeyComparison = compareCodePoints(left.mergeKey, right.mergeKey);
  if (mergeKeyComparison !== 0) {
    return mergeKeyComparison;
  }

  return compareCodePoints(
    contributionComparisonString(left.contributions),
    contributionComparisonString(right.contributions),
  );
}

export function makeCompactRowComparator(
  keyOrder: readonly string[],
): (left: CompactedReportRow, right: CompactedReportRow) => number {
  return (left, right) => compareCompactRows(left, right, keyOrder);
}

export function makeGroupEntryComparator(
  keyOrder: readonly string[],
): (left: StockReportEntryDto, right: StockReportEntryDto) => number {
  return (left, right) => {
    const comparisons = [
      compareByStateIndex(left.stockState, right.stockState),
      compareNumbers(left.quantity, right.quantity),
      compareCaseInsensitive(left.itemCategory, right.itemCategory),
      compareCodePoints(
        propertiesComparisonString(left.properties, keyOrder),
        propertiesComparisonString(right.properties, keyOrder),
      ),
    ];

    for (const comparison of comparisons) {
      if (comparison !== 0) {
        return comparison;
      }
    }

    return compareCodePoints(left.mergeKey, right.mergeKey) ||
      compareCodePoints(left.location, right.location);
  };
}

export function compactEntries(
  entries: readonly StockReportEntryDto[],
): CompactedReportRow[] {
  const groups = new Map<string, StockReportEntryDto[]>();

  for (const entry of entries) {
    const groupingKey = `${entry.mergeKey}${KEY_VALUE_SEPARATOR}${entry.stockState}`;
    const members = groups.get(groupingKey) ?? [];
    members.push(entry);
    groups.set(groupingKey, members);
  }

  return [...groups.values()].map((members) => {
    const first = members[0];
    const contributions = members
      .map((member) => ({
        location: member.location,
        quantity: member.quantity,
        unitsToRestockTarget: missingQuantityForEntry(member),
      }))
      .toSorted((left, right) => compareCodePoints(left.location, right.location));
    const locations = [...new Set(contributions.map(({ location }) => location))]
      .toSorted(compareCodePoints)
      .join(" · ");

    return {
      mergeKey: first.mergeKey,
      itemCategory: first.itemCategory,
      properties: first.properties,
      quantity: members.reduce((total, member) => total + member.quantity, 0),
      unitsToRestockTarget: contributions.reduce(
        (total, contribution) =>
          total + contribution.unitsToRestockTarget,
        0,
      ),
      stockState: first.stockState,
      locations,
      contributions,
    };
  });
}

function isCompactedRow(
  item: StockReportEntryDto | CompactedReportRow,
): item is CompactedReportRow {
  return "contributions" in item;
}

export function applyStockFilters(
  entries: readonly StockReportEntryDto[],
  filter: StockFilterState,
): StockReportEntryDto[];
export function applyStockFilters(
  rows: readonly CompactedReportRow[],
  filter: StockFilterState,
): CompactedReportRow[];
export function applyStockFilters(
  items: readonly (StockReportEntryDto | CompactedReportRow)[],
  filter: StockFilterState,
): (StockReportEntryDto | CompactedReportRow)[] {
  const first = items[0];
  if (first === undefined) {
    return [];
  }

  if (isCompactedRow(first)) {
    return items.flatMap((item) => {
      if (!isCompactedRow(item) || !filter.states.has(item.stockState)) {
        return [];
      }

      const selectedContributions = filter.locations.size === 0
        ? item.contributions
        : item.contributions.filter(({ location }) => filter.locations.has(location));

      if (selectedContributions.length === 0) {
        return [];
      }

      const locations = [...new Set(selectedContributions.map(({ location }) => location))]
        .toSorted(compareCodePoints)
        .join(" · ");

      return [{
        ...item,
        quantity: selectedContributions.reduce(
          (total, contribution) => total + contribution.quantity,
          0,
        ),
        unitsToRestockTarget: selectedContributions.reduce(
          (total, contribution) => total + contribution.unitsToRestockTarget,
          0,
        ),
        locations,
        contributions: selectedContributions,
      }];
    });
  }

  return items.filter((item): item is StockReportEntryDto => {
    if (isCompactedRow(item) || !filter.states.has(item.stockState)) {
      return false;
    }

    return filter.groupByLocation === false ||
      filter.locations.size === 0 ||
      filter.locations.has(item.location);
  });
}

function groupsFromEntries(
  entries: readonly StockReportEntryDto[],
): ReportLocationGroup[] {
  const groups = new Map<string, StockReportEntryDto[]>();

  for (const entry of entries) {
    const members = groups.get(entry.location) ?? [];
    members.push(entry);
    groups.set(entry.location, members);
  }

  return [...groups].map(([location, members]) => ({ location, entries: members }));
}

export function compareGroups(
  left: ReportLocationGroup,
  right: ReportLocationGroup,
): number {
  const leftCounts = countByStateBucket(left.entries.map(({ stockState }) => stockState));
  const rightCounts = countByStateBucket(right.entries.map(({ stockState }) => stockState));
  const comparisons = [
    rightCounts.out - leftCounts.out,
    rightCounts.low - leftCounts.low,
    rightCounts.medium - leftCounts.medium,
    compareCodePoints(left.location, right.location),
  ];

  return comparisons.find((comparison) => comparison !== 0) ?? 0;
}

export function buildReportView(
  entries: readonly StockReportEntryDto[],
  filter: StockFilterState,
  keyOrder: readonly string[],
): ReportView {
  if (filter.groupByLocation) {
    const filteredEntries = applyStockFilters(entries, filter);
    const groups = groupsFromEntries(filteredEntries)
      .map((currentGroup) => ({
        ...currentGroup,
        entries: currentGroup.entries.toSorted(makeGroupEntryComparator(keyOrder)),
      }))
      .toSorted(compareGroups);

    return { groups };
  }

  const compactedRows = compactEntries(entries);
  const filteredRows = applyStockFilters(compactedRows, filter);

  return {
    rows: filteredRows.toSorted(makeCompactRowComparator(keyOrder)),
  };
}

export function countPendingRows(
  entries: readonly StockReportEntryDto[],
  filter: StockFilterState,
  keyOrder: readonly string[],
): number {
  const view = buildReportView(entries, filter, keyOrder);

  return "rows" in view
    ? view.rows.length
    : view.groups.reduce((count, group) => count + group.entries.length, 0);
}

function sumCounterTiles(
  items: Iterable<StockReportEntryDto | CompactedReportRow>,
): CounterTiles {
  const totals: CounterTiles = { out: 0, low: 0, medium: 0, rest: 0 };

  for (const item of items) {
    const missingQuantity = isCompactedRow(item)
      ? item.unitsToRestockTarget
      : missingQuantityForEntry(item);

    switch (STOCK_STATES.indexOf(item.stockState)) {
      case 0:
        totals.out += missingQuantity;
        break;
      case 1:
        totals.low += missingQuantity;
        break;
      case 2:
        totals.medium += missingQuantity;
        break;
      case 3:
      case 4:
        totals.rest += missingQuantity;
        break;
    }
  }

  return totals;
}

export function computeCounterTiles(
  entries: readonly StockReportEntryDto[],
  filter: StockFilterState,
): CounterTiles {
  if (filter.groupByLocation) {
    const locationFiltered = applyStockFilters(entries, {
      ...filter,
      states: new Set(entries.map(({ stockState }) => stockState)),
    });

    return sumCounterTiles(locationFiltered);
  }

  const compactedRows = compactEntries(entries);
  const locationFiltered = applyStockFilters(compactedRows, {
    ...filter,
    states: new Set(compactedRows.map(({ stockState }) => stockState)),
  });

  return sumCounterTiles(locationFiltered);
}

function configLabel(
  itemCategory: string,
  properties: StockPropertiesDto,
  options: StockOptionsDto,
): string {
  // Same key-and-value text the chips carry, on one line: this sits under a location
  // in the contributing list, where there is no room for pills.
  const criteria = criteriaSummaryText(properties, options);

  return `Config: ${itemCategory}${criteria.length > 0 ? ` / ${criteria.join(" · ")}` : ""}`;
}

export function deriveEntryDetail(
  row: CompactedReportRow,
  entries: readonly StockReportEntryDto[],
  options: StockOptionsDto,
): ReportEntryDetail {
  const selectedLocations = new Set(
    row.contributions.map(({ location }) => location),
  );
  const contributingEntries = entries
    .filter((entry) =>
      entry.mergeKey === row.mergeKey &&
      entry.stockState === row.stockState &&
      selectedLocations.has(entry.location),
    )
    .toSorted((left, right) => compareCodePoints(left.location, right.location));

  return {
    entries: contributingEntries.map((entry) => ({
      location: entry.location,
      quantity: entry.quantity,
      stockState: entry.stockState,
      configLabel: configLabel(entry.itemCategory, entry.properties, options),
    })),
    isMultiLocation: new Set(contributingEntries.map(({ location }) => location)).size > 1,
  };
}
