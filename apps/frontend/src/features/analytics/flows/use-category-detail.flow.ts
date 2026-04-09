import { useEffect } from "react";

import { getCategoryByLocationApi } from "../apis/get-category-by-location.api";
import {
  selectAnalyticsDateRange,
  selectAnalyticsSelectedCategory,
  useAnalyticsStore,
} from "../stores/analytics.store";

export function useCategoryDetailFlow(): void {
  const dateRange = useAnalyticsStore(selectAnalyticsDateRange);
  const selectedCategory = useAnalyticsStore(selectAnalyticsSelectedCategory);
  const setCategoryDetail = useAnalyticsStore(
    (state) => state.setCategoryDetail,
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
        const categoryDetail = await getCategoryByLocationApi(
          selectedCategory,
          dateRange.from,
          dateRange.to,
        );

        if (!isDisposed) {
          setCategoryDetail(categoryDetail);
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
    dateRange.from,
    dateRange.to,
    selectedCategory,
    setCategoryDetail,
    setLoadingCategoryDetail,
  ]);
}
