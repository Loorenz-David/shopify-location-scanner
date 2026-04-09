import { ItemScanHistorySearchInput } from "./ItemScanHistorySearchInput";

interface ItemScanHistoryHeaderProps {
  query: string;
  activeFilterCount: number;
  onChangeQuery: (value: string) => void;
  onOpenFilters: () => void;
}

export function ItemScanHistoryHeader({
  query,
  activeFilterCount,
  onChangeQuery,
  onOpenFilters,
}: ItemScanHistoryHeaderProps) {
  return (
    <ItemScanHistorySearchInput
      value={query}
      activeFilterCount={activeFilterCount}
      onChange={onChangeQuery}
      onOpenFilters={onOpenFilters}
    />
  );
}
