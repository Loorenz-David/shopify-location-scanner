import { create } from "zustand";

import type {
  CategoryOverviewItem,
  DateRange,
  DimensionsStats,
  SalesChannel,
  SalesChannelOverviewItem,
  SmartInsight,
  VelocityPoint,
  ZoneDetail,
  ZoneOverviewItem,
} from "../types/analytics.types";

export type ZoneComparisonMetric = "itemsSold" | "revenue";
export type VelocityChannel = SalesChannel | "compare";
export type CategoryLocationRow = {
  location: string;
  itemsSold: number;
  revenue: number;
  avgTimeToSellSeconds: number | null;
};
export type VelocityCompareSeries = {
  physical: VelocityPoint[];
  webshop: VelocityPoint[];
};

interface AnalyticsStoreState {
  dateRange: DateRange;
  zoneDateRange: DateRange;
  channelOverview: SalesChannelOverviewItem[];
  velocityChannel: VelocityChannel;
  velocityCompareSeries: VelocityCompareSeries | null;
  zonesOverview: ZoneOverviewItem[];
  selectedZone: string | null;
  zoneDetail: ZoneDetail | null;
  selectedCategory: string | null;
  categoryDetail: CategoryLocationRow[] | null;
  categories: CategoryOverviewItem[];
  dimensions: DimensionsStats | null;
  velocity: VelocityPoint[];
  insights: SmartInsight[];
  zoneComparisonMetric: ZoneComparisonMetric;
  isLoadingOverview: boolean;
  isLoadingZoneDetail: boolean;
  isLoadingCategories: boolean;
  isLoadingCategoryDetail: boolean;
  setDateRange: (range: DateRange) => void;
  setZoneDateRange: (range: DateRange) => void;
  setChannelOverview: (data: SalesChannelOverviewItem[]) => void;
  setVelocityChannel: (channel: VelocityChannel) => void;
  setVelocityCompareSeries: (series: VelocityCompareSeries | null) => void;
  setSelectedZone: (location: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
  setZoneComparisonMetric: (metric: ZoneComparisonMetric) => void;
  setZonesOverview: (data: ZoneOverviewItem[]) => void;
  setZoneDetail: (data: ZoneDetail | null) => void;
  setCategoryDetail: (data: CategoryLocationRow[] | null) => void;
  setCategories: (data: CategoryOverviewItem[]) => void;
  setDimensions: (data: DimensionsStats | null) => void;
  setVelocity: (data: VelocityPoint[]) => void;
  setInsights: (data: SmartInsight[]) => void;
  setLoadingOverview: (value: boolean) => void;
  setLoadingZoneDetail: (value: boolean) => void;
  setLoadingCategories: (value: boolean) => void;
  setLoadingCategoryDetail: (value: boolean) => void;
  reset: () => void;
}

function defaultDateRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const initialState = {
  dateRange: defaultDateRange(),
  zoneDateRange: defaultDateRange(),
  channelOverview: [],
  velocityChannel: "compare" as VelocityChannel,
  velocityCompareSeries: null,
  zonesOverview: [],
  selectedZone: null,
  zoneDetail: null,
  selectedCategory: null,
  categoryDetail: null,
  categories: [],
  dimensions: null,
  velocity: [],
  insights: [],
  zoneComparisonMetric: "itemsSold" as ZoneComparisonMetric,
  isLoadingOverview: false,
  isLoadingZoneDetail: false,
  isLoadingCategories: false,
  isLoadingCategoryDetail: false,
};

export const useAnalyticsStore = create<AnalyticsStoreState>((set) => ({
  ...initialState,
  setDateRange: (dateRange) =>
    set({
      dateRange,
      selectedZone: null,
      zoneDetail: null,
      selectedCategory: null,
      categoryDetail: null,
      velocityChannel: "compare",
      velocityCompareSeries: null,
    }),
  setZoneDateRange: (zoneDateRange) => set({ zoneDateRange, zoneDetail: null }),
  setChannelOverview: (channelOverview) => set({ channelOverview }),
  setVelocityChannel: (velocityChannel) => set({ velocityChannel }),
  setVelocityCompareSeries: (velocityCompareSeries) =>
    set({ velocityCompareSeries }),
  setSelectedZone: (selectedZone) =>
    set((state) => ({
      selectedZone,
      zoneDetail: null,
      zoneDateRange: selectedZone ? state.dateRange : state.zoneDateRange,
    })),
  setSelectedCategory: (selectedCategory) =>
    set({ selectedCategory, categoryDetail: null }),
  setZoneComparisonMetric: (zoneComparisonMetric) =>
    set({ zoneComparisonMetric }),
  setZonesOverview: (zonesOverview) => set({ zonesOverview }),
  setZoneDetail: (zoneDetail) => set({ zoneDetail }),
  setCategoryDetail: (categoryDetail) => set({ categoryDetail }),
  setCategories: (categories) => set({ categories }),
  setDimensions: (dimensions) => set({ dimensions }),
  setVelocity: (velocity) => set({ velocity }),
  setInsights: (insights) => set({ insights }),
  setLoadingOverview: (isLoadingOverview) => set({ isLoadingOverview }),
  setLoadingZoneDetail: (isLoadingZoneDetail) => set({ isLoadingZoneDetail }),
  setLoadingCategories: (isLoadingCategories) => set({ isLoadingCategories }),
  setLoadingCategoryDetail: (isLoadingCategoryDetail) =>
    set({ isLoadingCategoryDetail }),
  reset: () => set({ ...initialState, dateRange: defaultDateRange() }),
}));

export const selectAnalyticsDateRange = (state: AnalyticsStoreState) =>
  state.dateRange;
export const selectAnalyticsZoneDateRange = (state: AnalyticsStoreState) =>
  state.zoneDateRange;
export const selectAnalyticsChannelOverview = (state: AnalyticsStoreState) =>
  state.channelOverview;
export const selectAnalyticsVelocityChannel = (state: AnalyticsStoreState) =>
  state.velocityChannel;
export const selectAnalyticsVelocityCompareSeries = (
  state: AnalyticsStoreState,
) => state.velocityCompareSeries;
export const selectAnalyticsZonesOverview = (state: AnalyticsStoreState) =>
  state.zonesOverview;
export const selectAnalyticsSelectedZone = (state: AnalyticsStoreState) =>
  state.selectedZone;
export const selectAnalyticsZoneDetail = (state: AnalyticsStoreState) =>
  state.zoneDetail;
export const selectAnalyticsSelectedCategory = (state: AnalyticsStoreState) =>
  state.selectedCategory;
export const selectAnalyticsCategoryDetail = (state: AnalyticsStoreState) =>
  state.categoryDetail;
export const selectAnalyticsCategories = (state: AnalyticsStoreState) =>
  state.categories;
export const selectAnalyticsDimensions = (state: AnalyticsStoreState) =>
  state.dimensions;
export const selectAnalyticsVelocity = (state: AnalyticsStoreState) =>
  state.velocity;
export const selectAnalyticsInsights = (state: AnalyticsStoreState) =>
  state.insights;
export const selectAnalyticsZoneComparisonMetric = (
  state: AnalyticsStoreState,
) => state.zoneComparisonMetric;
export const selectAnalyticsIsLoadingOverview = (
  state: AnalyticsStoreState,
) => state.isLoadingOverview;
export const selectAnalyticsIsLoadingZoneDetail = (
  state: AnalyticsStoreState,
) => state.isLoadingZoneDetail;
export const selectAnalyticsIsLoadingCategories = (
  state: AnalyticsStoreState,
) => state.isLoadingCategories;
export const selectAnalyticsIsLoadingCategoryDetail = (
  state: AnalyticsStoreState,
) => state.isLoadingCategoryDetail;
