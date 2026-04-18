import { VOLUME_LABELS, type VolumeLabel } from "../contracts/stats-items.contract.js";
import type { StatsItemsFilters, StatsItemsPage, StatsItemsSort } from "../domain/stats-items.domain.js";
import { statsItemsRepository } from "../repositories/stats-items.repository.js";

export const getStatsItemsQuery = async (input: {
  shopId: string;
  page: number;
  filters: StatsItemsFilters;
  sort: StatsItemsSort;
  groupByOrder: boolean;
  volumeLabel?: VolumeLabel;
}): Promise<StatsItemsPage> => {
  const filters: StatsItemsFilters = { ...input.filters };

  // Resolve the named volume label into a numeric cm³ range so the repository
  // only deals with raw numbers. An explicit volumeLabel overwrites any
  // volumeMin/volumeMax already on the filters object.
  if (input.volumeLabel) {
    const bucket = VOLUME_LABELS[input.volumeLabel];
    if (bucket.min > 0) filters.volumeMin = bucket.min;
    if (bucket.max !== null) filters.volumeMax = bucket.max;
  }

  // Grouping by order is about tracing a purchase — it has no meaning when
  // the caller is filtering by category (which slices items, not orders).
  const groupByOrder = input.groupByOrder && !filters.itemCategory;

  return statsItemsRepository.findItems({
    shopId: input.shopId,
    filters,
    sort: input.sort,
    groupByOrder,
    page: input.page,
  });
};
