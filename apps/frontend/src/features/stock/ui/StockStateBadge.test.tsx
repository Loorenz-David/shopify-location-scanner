import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { STOCK_STATES, getStockStateMeta } from "../domain/stock-states.domain";
import { StockStateBadge } from "./StockStateBadge";

describe("StockStateBadge", () => {
  it("C7: badge label and colors come from the state meta for two states", () => {
    const [worst, , , normal] = STOCK_STATES;
    const worstMeta = getStockStateMeta(worst);
    const normalMeta = getStockStateMeta(normal);
    // S10 self-check: the two states must differ in every asserted field.
    expect(worstMeta.label).not.toBe(normalMeta.label);
    expect(worstMeta.tint).not.toBe(normalMeta.tint);
    expect(worstMeta.text).not.toBe(normalMeta.text);

    render(
      <>
        <StockStateBadge state={worst} />
        <StockStateBadge state={normal} />
      </>,
    );

    const badges = screen.getAllByTestId("stock-state-badge");
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent(worstMeta.label);
    expect(badges[0]).toHaveStyle({ backgroundColor: worstMeta.tint, color: worstMeta.text });
    expect(badges[1]).toHaveTextContent(normalMeta.label);
    expect(badges[1]).toHaveStyle({ backgroundColor: normalMeta.tint, color: normalMeta.text });
  });
});
