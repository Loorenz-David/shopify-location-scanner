import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as stockApi from "../api";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import { stockReportFixture } from "../api/mocks/get-stock-report.fixture";
import { renderCriteriaChips } from "../domain/stock-criteria.domain";
import {
  applyStockFilters,
  buildReportView,
  compactEntries,
  computeCounterTiles,
  countPendingRows,
  deriveEntryDetail,
  makeCompactRowComparator,
} from "../domain/stock-report.domain";
import {
  compareByStateIndex,
  countByStateBucket,
  getStockStateMeta,
  STOCK_STATES,
} from "../domain/stock-states.domain";
import { useStockNavigationStore } from "../stores/stock-navigation.store";
import {
  createDefaultStockFilter,
  useStockReportStore,
} from "../stores/stock-report.store";
import type { StockReportEntryDto } from "../types/stock.dto";
import type { CompactedReportRow, StockFilterState } from "../types/stock.types";

vi.mock("../../../core/ws-client/use-ws-event", () => ({
  useWsEvent: vi.fn(),
}));

import { StockReportPage } from "./StockReportPage";

const keyOrder = stockOptionsFixture.propertyOptions.map((option) => option.key);

function rowKey(row: Pick<CompactedReportRow, "mergeKey" | "stockState">): string {
  return `${row.mergeKey}|${row.stockState}`;
}

function renderedRowKeys(): string[] {
  return screen
    .getAllByTestId("stock-report-row")
    .map((row) => row.getAttribute("data-row-key") ?? "");
}

function tileValues(): Record<string, number> {
  return Object.fromEntries(
    screen.getAllByTestId("stock-counter-tile").map((tile) => [
      tile.getAttribute("data-bucket"),
      Number(within(tile).getByTestId("stock-counter-value").textContent),
    ]),
  );
}

function ctaButton(): HTMLElement {
  return screen.getByRole("button", { name: /^Show \d+ entr(y|ies)$/ });
}

function ctaLabel(count: number): string {
  return `Show ${count} ${count === 1 ? "entry" : "entries"}`;
}

async function renderReport(): Promise<void> {
  render(<StockReportPage />);
  await screen.findAllByTestId("stock-report-row");
}

// Grouped fixture for C2 (plan 7 Notes): the three groups must differ in both their
// out+low+medium count AND their worst state, and the raw payload order (L2, L3, L1)
// must differ from the MC3 ranking (L1, L2, L3) — and from the design-02 sum reading
// D11 overrode (L2, L1, L3) — or the rendered order proves nothing.
const groupedThresholds = [
  { state: STOCK_STATES[1], thresholdQuantity: 10 },
  { state: STOCK_STATES[2], thresholdQuantity: 15 },
  { state: STOCK_STATES[3], thresholdQuantity: 20 },
];

const groupedPayload: StockReportEntryDto[] = [
  {
    location: "L2",
    itemCategory: "Dining Chairs",
    properties: { wood_type: ["oak"] },
    mergeKey: "oak-chairs",
    quantity: 4,
    stockState: STOCK_STATES[1],
    thresholds: groupedThresholds,
    unitsToNormalThreshold: 16,
  },
  {
    location: "L2",
    itemCategory: "Dining Tables",
    properties: { shape: ["oval"] },
    mergeKey: "oval-tables",
    quantity: 8,
    stockState: STOCK_STATES[2],
    thresholds: groupedThresholds,
    unitsToNormalThreshold: 12,
  },
  {
    location: "L2",
    itemCategory: "Side Tables",
    properties: {},
    mergeKey: "side-tables",
    quantity: 9,
    stockState: STOCK_STATES[2],
    thresholds: groupedThresholds,
    unitsToNormalThreshold: 11,
  },
  {
    location: "L3",
    itemCategory: "Sofas",
    properties: {},
    mergeKey: "sofas",
    quantity: 20,
    stockState: STOCK_STATES[3],
    thresholds: groupedThresholds,
    unitsToNormalThreshold: 0,
  },
  {
    location: "L1",
    itemCategory: "Bedside Tables",
    properties: {},
    mergeKey: "bedside",
    quantity: 0,
    stockState: STOCK_STATES[0],
    thresholds: groupedThresholds,
    unitsToNormalThreshold: 20,
  },
  {
    location: "L1",
    itemCategory: "Dining Chairs",
    properties: { wood_type: ["oak"] },
    mergeKey: "oak-chairs",
    quantity: 3,
    stockState: STOCK_STATES[1],
    thresholds: groupedThresholds,
    unitsToNormalThreshold: 17,
  },
];

describe("StockReportPage (screens 01–04)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    useStockNavigationStore.getState().reset();
    useStockReportStore.getState().reset();
  });

  it("C1: compacted rows render in exactly the composed order, which differs from the raw entry order", async () => {
    // (b) the input discriminates: raw compaction order ≠ composed order (S10)
    const rawOrder = compactEntries(stockReportFixture).map(rowKey);
    const composedOrder = compactEntries(stockReportFixture)
      .toSorted(makeCompactRowComparator(keyOrder))
      .map(rowKey);
    expect(rawOrder).not.toEqual(composedOrder);
    expect(rawOrder).toHaveLength(composedOrder.length);

    await renderReport();

    // (a) full rendered order equals the domain-computed order, both sides computed here
    expect(renderedRowKeys()).toEqual(composedOrder);
    // and the store's own composition agrees — the page renders `view`, not `entries`
    const view = buildReportView(stockReportFixture, createDefaultStockFilter(), keyOrder);
    expect("rows" in view && view.rows.map(rowKey)).toEqual(composedOrder);
  });

  it("C2: By location renders groups in compareGroups order with `n to fix` and a worst-state tint", async () => {
    vi.spyOn(stockApi, "getStockReport").mockResolvedValueOnce(groupedPayload);
    await renderReport();

    await userEvent.click(screen.getByRole("button", { name: "By location" }));
    const groups = await screen.findAllByTestId("stock-report-group");

    const filter: StockFilterState = { ...createDefaultStockFilter(), groupByLocation: true };
    const expectedView = buildReportView(groupedPayload, filter, keyOrder);
    if (!("groups" in expectedView)) {
      throw new Error("expected a grouped view");
    }
    const expectedOrder = expectedView.groups.map((group) => group.location);

    // the input discriminates: raw location order and the sum-rule order both differ
    const rawOrder = [...new Set(groupedPayload.map((entry) => entry.location))];
    const sumOrder = expectedView.groups
      .toSorted((left, right) => {
        const l = countByStateBucket(left.entries.map((entry) => entry.stockState));
        const r = countByStateBucket(right.entries.map((entry) => entry.stockState));
        return r.out + r.low + r.medium - (l.out + l.low + l.medium);
      })
      .map((group) => group.location);
    expect(rawOrder).not.toEqual(expectedOrder);
    expect(sumOrder).not.toEqual(expectedOrder);

    // (a) group order
    expect(groups.map((group) => group.getAttribute("data-location"))).toEqual(expectedOrder);

    const fixCounts = new Set<number>();
    const worstStates = new Set<string>();
    for (const [index, group] of groups.entries()) {
      const expectedGroup = expectedView.groups[index]!;
      const counts = countByStateBucket(expectedGroup.entries.map((entry) => entry.stockState));
      const toFix = counts.out + counts.low + counts.medium;
      const worst = expectedGroup.entries
        .map((entry) => entry.stockState)
        .toSorted(compareByStateIndex)[0]!;
      fixCounts.add(toFix);
      worstStates.add(worst);

      // (b) badge text is the group's out+low+medium count
      const badge = within(group).getByTestId("stock-group-badge");
      expect(badge).toHaveTextContent(`${toFix} to fix`);
      // (c) badge tinted by the worst state's meta
      expect(badge).toHaveStyle({ backgroundColor: getStockStateMeta(worst).tint });
      expect(badge).toHaveStyle({ color: getStockStateMeta(worst).text });

      // entries within the group, in MC3 order
      const renderedEntries = within(group).getAllByTestId("stock-report-entry");
      const entryKeys = renderedEntries.map((entry) =>
        entry.getAttribute("data-entry-key"),
      );
      expect(entryKeys).toEqual(
        expectedGroup.entries.map((entry) => `${entry.mergeKey}|${entry.stockState}|${entry.location}`),
      );
      renderedEntries.forEach((entry, entryIndex) => {
        expect(within(entry).getByTestId("stock-row-missing")).toHaveTextContent(
          String(expectedGroup.entries[entryIndex]!.unitsToNormalThreshold),
        );
      });
    }
    expect(fixCounts.size).toBe(groups.length);
    expect(worstStates.size).toBe(groups.length);
  });

  it("C3: two state toggles move the CTA to countPendingRows, Apply renders exactly N rows, Reset restores defaults", async () => {
    await renderReport();
    const defaultCount = countPendingRows(stockReportFixture, createDefaultStockFilter(), keyOrder);
    expect(renderedRowKeys()).toHaveLength(defaultCount);

    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    const sheet = await screen.findByRole("dialog", { name: "Filters" });
    expect(ctaButton()).toHaveTextContent(ctaLabel(defaultCount));

    // (a) first toggle — deselect the low state
    const pending: StockFilterState = createDefaultStockFilter();
    pending.states.delete(STOCK_STATES[1]);
    const firstCount = countPendingRows(stockReportFixture, pending, keyOrder);
    await userEvent.click(within(sheet).getByRole("checkbox", { name: getStockStateMeta(STOCK_STATES[1]).label }));
    expect(ctaButton()).toHaveTextContent(ctaLabel(firstCount));

    // (b) second toggle — deselect the out state; N must differ from (a)
    pending.states.delete(STOCK_STATES[0]);
    const secondCount = countPendingRows(stockReportFixture, pending, keyOrder);
    expect(secondCount).not.toBe(firstCount);
    expect(firstCount).not.toBe(defaultCount);
    await userEvent.click(within(sheet).getByRole("checkbox", { name: getStockStateMeta(STOCK_STATES[0]).label }));
    expect(ctaButton()).toHaveTextContent(ctaLabel(secondCount));

    // (c) Apply renders exactly N rows
    await userEvent.click(ctaButton());
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull());
    expect(renderedRowKeys()).toHaveLength(secondCount);
    expect(screen.getByTestId("stock-filter-badge")).toHaveTextContent(String(pending.states.size));

    // (d) Reset restores all three defaults and the default CTA count
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    const reopened = await screen.findByRole("dialog", { name: "Filters" });
    const someLocation = stockReportFixture[0]!.location;
    await userEvent.click(within(reopened).getByRole("button", { name: someLocation }));
    await userEvent.click(within(reopened).getByRole("checkbox", { name: "Group by location" }));
    expect(within(reopened).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
    expect(within(reopened).getByRole("checkbox", { name: "Group by location" })).toBeChecked();
    await userEvent.click(within(reopened).getByRole("button", { name: "Reset" }));
    expect(within(reopened).getByRole("button", { name: someLocation })).toHaveAttribute("aria-pressed", "false");
    for (const state of STOCK_STATES) {
      expect(within(reopened).getByRole("checkbox", { name: getStockStateMeta(state).label })).toBeChecked();
    }
    expect(within(reopened).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(within(reopened).getByRole("checkbox", { name: "Group by location" })).not.toBeChecked();
    expect(ctaButton()).toHaveTextContent(ctaLabel(defaultCount));
    await userEvent.click(ctaButton());
    await waitFor(() => expect(renderedRowKeys()).toHaveLength(defaultCount));
    expect(screen.queryByTestId("stock-filter-badge")).toBeNull();
  });

  it("C4: selecting one location in compact mode re-quantifies a multi-location row to that location's contribution", async () => {
    // the input discriminates: pick a row with contributions from more than one location
    const multi = compactEntries(stockReportFixture).find((row) => row.contributions.length > 1);
    if (multi === undefined) {
      throw new Error("fixture has no multi-location row");
    }
    const location = multi.contributions[0]!.location;
    const filter: StockFilterState = { ...createDefaultStockFilter(), locations: new Set([location]) };
    const expectedRow = applyStockFilters(compactEntries(stockReportFixture), filter).find(
      (row) => rowKey(row) === rowKey(multi),
    );
    if (expectedRow === undefined) {
      throw new Error("filtered row missing");
    }
    expect(expectedRow.quantity).not.toBe(multi.quantity);

    await renderReport();
    const before = screen.getAllByTestId("stock-report-row").find((row) => row.getAttribute("data-row-key") === rowKey(multi))!;
    expect(within(before).getByTestId("stock-row-quantity")).toHaveTextContent(String(multi.quantity));
    expect(within(before).getByTestId("stock-row-missing")).toHaveTextContent(
      String(multi.unitsToNormalThreshold),
    );

    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    const sheet = await screen.findByRole("dialog", { name: "Filters" });
    await userEvent.click(within(sheet).getByRole("button", { name: location }));
    await userEvent.click(ctaButton());
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull());

    const after = screen.getAllByTestId("stock-report-row").find((row) => row.getAttribute("data-row-key") === rowKey(multi))!;
    expect(within(after).getByTestId("stock-row-quantity")).toHaveTextContent(String(expectedRow.quantity));
    expect(within(after).getByTestId("stock-row-missing")).toHaveTextContent(
      String(expectedRow.unitsToNormalThreshold),
    );
    expect(within(after).getByTestId("stock-row-locations")).toHaveTextContent(expectedRow.locations);
    expect(screen.getByTestId("stock-report-scope")).toHaveTextContent(location);
  });

  it("C5: counter tiles follow computeCounterTiles — a state filter leaves them alone, a location filter moves them (D13)", async () => {
    await renderReport();
    const defaultTiles = computeCounterTiles(stockReportFixture, createDefaultStockFilter());
    expect(tileValues()).toEqual(defaultTiles);

    // (a) state filter active: tiles unchanged while the list shrinks
    const stateFilter = createDefaultStockFilter();
    stateFilter.states.delete(STOCK_STATES[1]);
    expect(countPendingRows(stockReportFixture, stateFilter, keyOrder)).not.toBe(
      countPendingRows(stockReportFixture, createDefaultStockFilter(), keyOrder),
    );
    expect(computeCounterTiles(stockReportFixture, stateFilter)).toEqual(defaultTiles);

    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    let sheet = await screen.findByRole("dialog", { name: "Filters" });
    await userEvent.click(within(sheet).getByRole("checkbox", { name: getStockStateMeta(STOCK_STATES[1]).label }));
    await userEvent.click(ctaButton());
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull());
    expect(renderedRowKeys()).toHaveLength(countPendingRows(stockReportFixture, stateFilter, keyOrder));
    expect(tileValues()).toEqual(defaultTiles);

    // (b) location filter: tiles move to computeCounterTiles of that filter
    const multi = compactEntries(stockReportFixture).find((row) => row.contributions.length > 1)!;
    const location = multi.contributions[0]!.location;
    const locationFilter: StockFilterState = { ...stateFilter, locations: new Set([location]) };
    const locationTiles = computeCounterTiles(stockReportFixture, locationFilter);
    expect(locationTiles).not.toEqual(defaultTiles);

    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    sheet = await screen.findByRole("dialog", { name: "Filters" });
    await userEvent.click(within(sheet).getByRole("button", { name: location }));
    await userEvent.click(ctaButton());
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull());
    expect(tileValues()).toEqual(locationTiles);
  });

  it("C6: tapping a row opens the entry detail from deriveEntryDetail; note only for the multi-location row; no action buttons (D4)", async () => {
    await renderReport();
    const rows = compactEntries(stockReportFixture);
    const multi = rows.find((row) => row.contributions.length > 1)!;
    const single = rows.find((row) => row.contributions.length === 1)!;
    expect(rowKey(multi)).not.toBe(rowKey(single));

    for (const [row, expectsNote] of [[multi, true], [single, false]] as const) {
      const detail = deriveEntryDetail(row, stockReportFixture, stockOptionsFixture);
      expect(detail.isMultiLocation).toBe(expectsNote);

      const rendered = screen.getAllByTestId("stock-report-row").find((candidate) => candidate.getAttribute("data-row-key") === rowKey(row))!;
      await userEvent.click(rendered);
      await screen.findByRole("heading", { name: row.itemCategory });

      // (a) chips, state tile, total
      const chips = renderCriteriaChips(row.properties, stockOptionsFixture);
      const header = screen.getByTestId("stock-detail-header");
      expect(within(header).getAllByTestId("stock-property-chip").map((chip) => chip.textContent)).toEqual(chips);
      expect(within(header).getByTestId("stock-detail-state")).toHaveTextContent(getStockStateMeta(row.stockState).label);
      expect(within(header).getByTestId("stock-detail-total")).toHaveTextContent(
        `${row.quantity} ${row.quantity === 1 ? "unit" : "units"}`,
      );

      // (b) contributing rows match deriveEntryDetail, in its order
      const contributions = screen.getAllByTestId("stock-detail-contribution");
      expect(contributions).toHaveLength(detail.entries.length);
      for (const [index, item] of detail.entries.entries()) {
        const contribution = contributions[index]!;
        expect(within(contribution).getByText(item.location)).toBeInTheDocument();
        expect(within(contribution).getByText(item.configLabel)).toBeInTheDocument();
        expect(within(contribution).getByTestId("stock-row-quantity")).toHaveTextContent(String(item.quantity));
        expect(within(contribution).getByText(getStockStateMeta(item.stockState).label)).toBeInTheDocument();
      }
      expect(screen.getByTestId("stock-detail-count")).toHaveTextContent(String(detail.entries.length));

      // (c)/(d) info note present for the multi-location row, absent for the single-location one
      if (expectsNote) {
        expect(screen.getByTestId("stock-detail-note")).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId("stock-detail-note")).toBeNull();
      }

      // (e) D4: the removed actions appear nowhere
      expect(screen.queryByText(/scanned items/i)).toBeNull();
      expect(screen.queryByText(/add task/i)).toBeNull();
      expect(screen.queryByRole("button", { name: /scanned items|add task/i })).toBeNull();

      await userEvent.click(screen.getByRole("button", { name: "Back to the report" }));
      await screen.findAllByTestId("stock-report-row");
    }
  });

  it("C7: a quantity-0 row renders with the OUT badge and is never dropped as empty", async () => {
    const zeroRows = compactEntries(stockReportFixture).filter((row) => row.quantity === 0);
    expect(zeroRows).toHaveLength(1);
    const zero = zeroRows[0]!;

    await renderReport();
    const expectedCount = countPendingRows(stockReportFixture, createDefaultStockFilter(), keyOrder);
    expect(renderedRowKeys()).toHaveLength(expectedCount);
    expect(renderedRowKeys()).toContain(rowKey(zero));

    const rendered = screen.getAllByTestId("stock-report-row").find((row) => row.getAttribute("data-row-key") === rowKey(zero))!;
    expect(within(rendered).getByTestId("stock-row-quantity")).toHaveTextContent("0");
    expect(within(rendered).getByTestId("stock-row-missing")).toHaveTextContent(
      String(zero.unitsToNormalThreshold),
    );
    expect(within(rendered).getByText("In stock")).toBeInTheDocument();
    expect(within(rendered).getByText("Missing")).toBeInTheDocument();
    expect(within(rendered).getByText(getStockStateMeta(STOCK_STATES[0]).label)).toBeInTheDocument();
  });

  it("C8: no threshold numbers or band labels in the 01, 02 and 04 renders", async () => {
    const bandLabel = /^\d+–\d+$|^\d+\+$/;
    const assertNoBands = () => {
      expect(screen.queryByTestId("stock-threshold-band")).toBeNull();
      expect(screen.queryByLabelText("Threshold bands")).toBeNull();
      expect(screen.queryByText(bandLabel)).toBeNull();
    };

    await renderReport();
    assertNoBands(); // 01

    await userEvent.click(screen.getByRole("button", { name: "By location" }));
    await screen.findAllByTestId("stock-report-group");
    assertNoBands(); // 02

    await userEvent.click(screen.getByRole("button", { name: "Compact" }));
    const rows = await screen.findAllByTestId("stock-report-row");
    await userEvent.click(rows[0]!);
    await screen.findByTestId("stock-detail-header");
    assertNoBands(); // 04
  });
});
