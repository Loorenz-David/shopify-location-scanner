import { create } from "zustand";

import type {
  CategoryOverviewItem,
  DateRange,
  DimensionsStats,
  SalesChannel,
  SalesChannelOverviewItem,
  SmartInsight,
  TimePatterns,
  VelocityPoint,
  ZoneDetail,
  ZoneLevelBreakdown,
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
  categoryDateRange: DateRange;
  channelOverview: SalesChannelOverviewItem[];
  velocityChannel: VelocityChannel;
  velocityCompareSeries: VelocityCompareSeries | null;
  timePatterns: TimePatterns | null;
  timePatternsCompare: { physical: TimePatterns; webshop: TimePatterns } | null;
  zoneTimePatterns: TimePatterns | null;
  categoryTimePatterns: TimePatterns | null;
  zonesOverview: ZoneOverviewItem[];
  selectedZone: string | null;
  selectedZoneLevel: string | null; // null = "All levels"; "H1:2" = specific level drill-down
  zoneLevels: ZoneLevelBreakdown[] | null; // persisted tab list; survives level drill-down
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
  setCategoryDateRange: (range: DateRange) => void;
  setChannelOverview: (data: SalesChannelOverviewItem[]) => void;
  setVelocityChannel: (channel: VelocityChannel) => void;
  setVelocityCompareSeries: (series: VelocityCompareSeries | null) => void;
  setTimePatterns: (data: TimePatterns | null) => void;
  setTimePatternsCompare: (data: { physical: TimePatterns; webshop: TimePatterns } | null) => void;
  setZoneTimePatterns: (data: TimePatterns | null) => void;
  setCategoryTimePatterns: (data: TimePatterns | null) => void;
  setSelectedZone: (location: string | null) => void;
  setSelectedZoneLevel: (level: string | null) => void;
  setZoneLevels: (levels: ZoneLevelBreakdown[] | null) => void;
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
  categoryDateRange: defaultDateRange(),
  channelOverview: [],
  velocityChannel: "compare" as VelocityChannel,
  velocityCompareSeries: null,
  timePatterns: null,
  timePatternsCompare: null,
  zoneTimePatterns: null,
  categoryTimePatterns: null,
  zonesOverview: [],
  selectedZone: null,
  selectedZoneLevel: null,
  zoneLevels: null,
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
  setCategoryDateRange: (categoryDateRange) =>
    set({ categoryDateRange, categoryDetail: null }),
  setChannelOverview: (channelOverview) => set({ channelOverview }),
  setVelocityChannel: (velocityChannel) => set({ velocityChannel }),
  setVelocityCompareSeries: (velocityCompareSeries) =>
    set({ velocityCompareSeries }),
  setTimePatterns: (timePatterns) => set({ timePatterns }),
  setTimePatternsCompare: (timePatternsCompare) => set({ timePatternsCompare }),
  setZoneTimePatterns: (zoneTimePatterns) => set({ zoneTimePatterns }),
  setCategoryTimePatterns: (categoryTimePatterns) =>
    set({ categoryTimePatterns }),
  setSelectedZone: (selectedZone) =>
    set((state) => ({
      selectedZone,
      selectedZoneLevel: null,
      zoneLevels: null,
      zoneDetail: null,
      zoneTimePatterns: null,
      zoneDateRange: selectedZone ? state.dateRange : state.zoneDateRange,
    })),
  setSelectedZoneLevel: (selectedZoneLevel) =>
    set({ selectedZoneLevel, zoneDetail: null, zoneTimePatterns: null }),
  setZoneLevels: (zoneLevels) => set({ zoneLevels }),
  setSelectedCategory: (selectedCategory) =>
    set((state) => ({
      selectedCategory,
      categoryDetail: null,
      categoryTimePatterns: null,
      categoryDateRange: selectedCategory
        ? state.dateRange
        : state.categoryDateRange,
    })),
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
export const selectAnalyticsCategoryDateRange = (state: AnalyticsStoreState) =>
  state.categoryDateRange;
export const selectAnalyticsChannelOverview = (state: AnalyticsStoreState) =>
  state.channelOverview;
export const selectAnalyticsVelocityChannel = (state: AnalyticsStoreState) =>
  state.velocityChannel;
export const selectAnalyticsVelocityCompareSeries = (
  state: AnalyticsStoreState,
) => state.velocityCompareSeries;
export const selectAnalyticsTimePatterns = (state: AnalyticsStoreState) =>
  state.timePatterns;
export const selectAnalyticsTimePatternsCompare = (state: AnalyticsStoreState) =>
  state.timePatternsCompare;
export const selectAnalyticsZoneTimePatterns = (state: AnalyticsStoreState) =>
  state.zoneTimePatterns;
export const selectAnalyticsCategoryTimePatterns = (
  state: AnalyticsStoreState,
) => state.categoryTimePatterns;
export const selectAnalyticsZonesOverview = (state: AnalyticsStoreState) =>
  state.zonesOverview;
export const selectAnalyticsSelectedZone = (state: AnalyticsStoreState) =>
  state.selectedZone;
export const selectAnalyticsSelectedZoneLevel = (state: AnalyticsStoreState) =>
  state.selectedZoneLevel;
export const selectAnalyticsZoneLevels = (state: AnalyticsStoreState) =>
  state.zoneLevels;
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
export const selectAnalyticsIsLoadingOverview = (state: AnalyticsStoreState) =>
  state.isLoadingOverview;
export const selectAnalyticsIsLoadingZoneDetail = (
  state: AnalyticsStoreState,
) => state.isLoadingZoneDetail;
export const selectAnalyticsIsLoadingCategories = (
  state: AnalyticsStoreState,
) => state.isLoadingCategories;
export const selectAnalyticsIsLoadingCategoryDetail = (
  state: AnalyticsStoreState,
) => state.isLoadingCategoryDetail;
