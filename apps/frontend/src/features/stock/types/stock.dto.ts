export type StockStateDto =
  | "out_of_stock"
  | "low_in_stock"
  | "medium_in_stock"
  | "high_in_stock"
  | "extra_in_stock";

export type StockPropertyValueDto = string | string[] | null;
export type StockPropertiesDto = Record<string, StockPropertyValueDto>;
export type StockPropertyCategoriesDto = "universal" | string[];

export interface StockPropertyOptionDto {
  key: string;
  values: string[];
  categories: StockPropertyCategoriesDto;
}

export interface StockOptionsDto {
  itemCategories: string[];
  propertyOptions: StockPropertyOptionDto[];
}

export interface StockLocationSummaryDto {
  location: string;
  stockCount: number;
}

export interface StockThresholdDto {
  state: StockStateDto;
  thresholdQuantity: number;
}

export interface LocationStockDto {
  id: string;
  location: string;
  itemCategory: string;
  properties: StockPropertiesDto;
  quantity: number;
  instanceCount: number;
  stockState: StockStateDto;
  thresholds: StockThresholdDto[];
  createdAt: string;
  createdByUsername: string;
  updatedAt: string;
  updatedByUsername: string;
}

export interface CreateStockConfigurationDto {
  location: string;
  itemCategory: string;
  properties?: StockPropertiesDto;
  thresholds: StockThresholdDto[];
}

export interface CreateStockConfigurationsRequestDto {
  configurations: CreateStockConfigurationDto[];
}

export interface StockReportEntryDto {
  location: string;
  itemCategory: string;
  properties: StockPropertiesDto;
  mergeKey: string;
  // `quantity` sums the allocated items' units; `instanceCount` counts the
  // allocated items. Thresholds, `stockState` and `unitsToRestockTarget` are
  // item-based (contract v1.7).
  quantity: number;
  instanceCount: number;
  stockState: StockStateDto;
  thresholds: StockThresholdDto[];
  unitsToRestockTarget?: number;
}

export interface StockReportResponseDto {
  entries: StockReportEntryDto[];
}

export interface StockErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: {
      conflictingId?: string;
      batchIndex?: number;
      [key: string]: unknown;
    };
    requestId: string;
  };
}
