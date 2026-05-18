import { create } from "zustand";
function defaultDateRange() {
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
    velocityChannel: "compare",
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
    zoneComparisonMetric: "itemsSold",
    isLoadingOverview: false,
    isLoadingZoneDetail: false,
    isLoadingCategories: false,
    isLoadingCategoryDetail: false,
};
export const useAnalyticsStore = create((set) => ({
    ...initialState,
    setDateRange: (dateRange) => set({
        dateRange,
        selectedZone: null,
        zoneDetail: null,
        selectedCategory: null,
        categoryDetail: null,
        velocityChannel: "compare",
        velocityCompareSeries: null,
    }),
    setZoneDateRange: (zoneDateRange) => set({ zoneDateRange, zoneDetail: null }),
    setCategoryDateRange: (categoryDateRange) => set({ categoryDateRange, categoryDetail: null }),
    setChannelOverview: (channelOverview) => set({ channelOverview }),
    setVelocityChannel: (velocityChannel) => set({ velocityChannel }),
    setVelocityCompareSeries: (velocityCompareSeries) => set({ velocityCompareSeries }),
    setTimePatterns: (timePatterns) => set({ timePatterns }),
    setTimePatternsCompare: (timePatternsCompare) => set({ timePatternsCompare }),
    setZoneTimePatterns: (zoneTimePatterns) => set({ zoneTimePatterns }),
    setCategoryTimePatterns: (categoryTimePatterns) => set({ categoryTimePatterns }),
    setSelectedZone: (selectedZone) => set((state) => ({
        selectedZone,
        selectedZoneLevel: null,
        zoneLevels: null,
        zoneDetail: null,
        zoneTimePatterns: null,
        zoneDateRange: selectedZone ? state.dateRange : state.zoneDateRange,
    })),
    setSelectedZoneLevel: (selectedZoneLevel) => set({ selectedZoneLevel, zoneDetail: null, zoneTimePatterns: null }),
    setZoneLevels: (zoneLevels) => set({ zoneLevels }),
    setSelectedCategory: (selectedCategory) => set((state) => ({
        selectedCategory,
        categoryDetail: null,
        categoryTimePatterns: null,
        categoryDateRange: selectedCategory
            ? state.dateRange
            : state.categoryDateRange,
    })),
    setZoneComparisonMetric: (zoneComparisonMetric) => set({ zoneComparisonMetric }),
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
    setLoadingCategoryDetail: (isLoadingCategoryDetail) => set({ isLoadingCategoryDetail }),
    reset: () => set({ ...initialState, dateRange: defaultDateRange() }),
}));
export const selectAnalyticsDateRange = (state) => state.dateRange;
export const selectAnalyticsZoneDateRange = (state) => state.zoneDateRange;
export const selectAnalyticsCategoryDateRange = (state) => state.categoryDateRange;
export const selectAnalyticsChannelOverview = (state) => state.channelOverview;
export const selectAnalyticsVelocityChannel = (state) => state.velocityChannel;
export const selectAnalyticsVelocityCompareSeries = (state) => state.velocityCompareSeries;
export const selectAnalyticsTimePatterns = (state) => state.timePatterns;
export const selectAnalyticsTimePatternsCompare = (state) => state.timePatternsCompare;
export const selectAnalyticsZoneTimePatterns = (state) => state.zoneTimePatterns;
export const selectAnalyticsCategoryTimePatterns = (state) => state.categoryTimePatterns;
export const selectAnalyticsZonesOverview = (state) => state.zonesOverview;
export const selectAnalyticsSelectedZone = (state) => state.selectedZone;
export const selectAnalyticsSelectedZoneLevel = (state) => state.selectedZoneLevel;
export const selectAnalyticsZoneLevels = (state) => state.zoneLevels;
export const selectAnalyticsZoneDetail = (state) => state.zoneDetail;
export const selectAnalyticsSelectedCategory = (state) => state.selectedCategory;
export const selectAnalyticsCategoryDetail = (state) => state.categoryDetail;
export const selectAnalyticsCategories = (state) => state.categories;
export const selectAnalyticsDimensions = (state) => state.dimensions;
export const selectAnalyticsVelocity = (state) => state.velocity;
export const selectAnalyticsInsights = (state) => state.insights;
export const selectAnalyticsZoneComparisonMetric = (state) => state.zoneComparisonMetric;
export const selectAnalyticsIsLoadingOverview = (state) => state.isLoadingOverview;
export const selectAnalyticsIsLoadingZoneDetail = (state) => state.isLoadingZoneDetail;
export const selectAnalyticsIsLoadingCategories = (state) => state.isLoadingCategories;
export const selectAnalyticsIsLoadingCategoryDetail = (state) => state.isLoadingCategoryDetail;
