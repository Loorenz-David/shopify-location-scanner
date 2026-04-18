import { useEffect } from "react";

import { getCategoryByLocationApi } from "../apis/get-category-by-location.api";
import { getTimePatternsApi } from "../apis/get-time-patterns.api";
import {
  selectAnalyticsCategoryDateRange,
  selectAnalyticsSelectedCategory,
  useAnalyticsStore,
} from "../stores/analytics.store";

export function useCategoryDetailFlow(): void {
  const categoryDateRange = useAnalyticsStore(selectAnalyticsCategoryDateRange);
  const selectedCategory = useAnalyticsStore(selectAnalyticsSelectedCategory);
  const setCategoryDetail = useAnalyticsStore(
    (state) => state.setCategoryDetail,
  );
  const setCategoryTimePatterns = useAnalyticsStore(
    (state) => state.setCategoryTimePatterns,
  );
  const setLoadingCategoryDetail = useAnalyticsStore(
    (state) => state.setLoadingCategoryDetail,
  );

  useEffect(() => {
    if (!selectedCategory) {
      return;
    }

    let isDisposed = false;

    const load = async () => {
      setLoadingCategoryDetail(true);

      try {
        const [categoryDetail, categoryTimePatterns] = await Promise.all([
          getCategoryByLocationApi(
            selectedCategory,
            categoryDateRange.from,
            categoryDateRange.to,
          ),
          getTimePatternsApi({
            from: categoryDateRange.from,
            to: categoryDateRange.to,
            itemCategory: selectedCategory,
          }),
        ]);

        if (!isDisposed) {
          setCategoryDetail(categoryDetail);
          setCategoryTimePatterns(categoryTimePatterns);
        }
      } finally {
        if (!isDisposed) {
          setLoadingCategoryDetail(false);
        }
      }
    };

    void load();

    return () => {
      isDisposed = true;
    };
  }, [
    categoryDateRange.from,
    categoryDateRange.to,
    selectedCategory,
    setCategoryDetail,
    setCategoryTimePatterns,
    setLoadingCategoryDetail,
  ]);
}
