import type { StockReportEntryDto } from "../../types/stock.dto";

export const stockReportFixture: StockReportEntryDto[] = [
  {
    location: "LC1",
    itemCategory: "Dining Chairs",
    properties: { wood_type: ["walnut"] },
    mergeKey: "report-walnut-chairs",
    quantity: 2,
    stockState: "low_in_stock",
    thresholds: [
      { state: "low_in_stock", thresholdQuantity: 10 },
      { state: "medium_in_stock", thresholdQuantity: 15 },
      { state: "normal_in_stock", thresholdQuantity: 20 },
    ],
    unitsToNormalThreshold: 18,
  },
  {
    location: "H1",
    itemCategory: "Dining Chairs",
    properties: { wood_type: ["walnut"] },
    mergeKey: "report-walnut-chairs",
    quantity: 3,
    stockState: "low_in_stock",
    thresholds: [
      { state: "low_in_stock", thresholdQuantity: 10 },
      { state: "medium_in_stock", thresholdQuantity: 15 },
      { state: "normal_in_stock", thresholdQuantity: 20 },
    ],
    unitsToNormalThreshold: 17,
  },
  {
    location: "LC1",
    itemCategory: "Dining Tables",
    properties: { shape: ["oval"] },
    mergeKey: "report-state-split",
    quantity: 18,
    stockState: "normal_in_stock",
    thresholds: [
      { state: "low_in_stock", thresholdQuantity: 10 },
      { state: "medium_in_stock", thresholdQuantity: 15 },
      { state: "normal_in_stock", thresholdQuantity: 20 },
    ],
    unitsToNormalThreshold: 2,
  },
  {
    location: "H1",
    itemCategory: "Dining Tables",
    properties: { shape: ["oval"] },
    mergeKey: "report-state-split",
    quantity: 4,
    stockState: "low_in_stock",
    thresholds: [
      { state: "low_in_stock", thresholdQuantity: 10 },
      { state: "medium_in_stock", thresholdQuantity: 15 },
      { state: "normal_in_stock", thresholdQuantity: 20 },
    ],
    unitsToNormalThreshold: 16,
  },
  {
    location: "LC1",
    itemCategory: "Bedside Tables",
    properties: {},
    mergeKey: "report-zero-entry",
    quantity: 0,
    stockState: "out_of_stock",
    thresholds: [
      { state: "low_in_stock", thresholdQuantity: 10 },
      { state: "medium_in_stock", thresholdQuantity: 15 },
      { state: "normal_in_stock", thresholdQuantity: 20 },
    ],
    unitsToNormalThreshold: 20,
  },
];
