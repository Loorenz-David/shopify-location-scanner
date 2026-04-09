import { AnimatePresence, motion } from "framer-motion";

import { CloseIcon } from "../../../../assets/icons";
import { useCategoryDetailFlow } from "../../flows/use-category-detail.flow";
import {
  selectAnalyticsCategories,
  selectAnalyticsCategoryDetail,
  selectAnalyticsIsLoadingCategoryDetail,
  selectAnalyticsSelectedCategory,
  useAnalyticsStore,
} from "../../stores/analytics.store";
import { CategoryByLocationChart } from "../charts/CategoryByLocationChart";
import { KpiRow } from "../shared/KpiRow";

export function CategoryStatsPanel() {
  useCategoryDetailFlow();

  const selectedCategory = useAnalyticsStore(selectAnalyticsSelectedCategory);
  const categoryDetail = useAnalyticsStore(selectAnalyticsCategoryDetail);
  const isLoadingCategoryDetail = useAnalyticsStore(
    selectAnalyticsIsLoadingCategoryDetail,
  );
  const categories = useAnalyticsStore(selectAnalyticsCategories);
  const setSelectedCategory = useAnalyticsStore(
    (state) => state.setSelectedCategory,
  );

  const overview = categories.find(
    (category) => category.category === selectedCategory,
  );

  return (
    <AnimatePresence>
      {selectedCategory ? (
        <motion.aside
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto border-l border-slate-900/10 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <header className="flex items-center justify-between border-b border-slate-900/10 px-4 py-3">
            <div>
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Category
              </p>
              <h2 className="m-0 mt-1 text-base font-bold text-slate-900">
                {selectedCategory}
              </h2>
            </div>

            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-500"
              onClick={() => setSelectedCategory(null)}
              aria-label="Close category stats"
            >
              <CloseIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          {isLoadingCategoryDetail ? (
            <div className="flex flex-1 items-center justify-center px-4 text-sm font-medium text-slate-500">
              Loading category stats...
            </div>
          ) : (
            <div className="flex flex-col gap-5 px-4 py-4">
              {overview ? (
                <KpiRow
                  itemsSold={overview.itemsSold}
                  revenue={overview.totalRevenue}
                  avgTimeToSellSeconds={overview.avgTimeToSellSeconds}
                />
              ) : null}

              {overview?.bestLocation ? (
                <p className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
                  Best location: <strong>{overview.bestLocation}</strong>
                </p>
              ) : null}

              {categoryDetail && categoryDetail.length > 0 ? (
                <section className="rounded-2xl border border-slate-900/10 bg-slate-50/70 p-3">
                  <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Performance by location
                  </p>
                  <CategoryByLocationChart
                    data={categoryDetail}
                    metric="itemsSold"
                  />
                </section>
              ) : (
                <p className="text-sm text-slate-500">
                  No per-location data is available for this category yet.
                </p>
              )}
            </div>
          )}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
