import { ItemScanHistorySearchInput } from "./ItemScanHistorySearchInput";

interface ItemScanHistoryHeaderProps {
  query: string;
  onChangeQuery: (value: string) => void;
}

export function ItemScanHistoryHeader({
  query,
  onChangeQuery,
}: ItemScanHistoryHeaderProps) {
  return <ItemScanHistorySearchInput value={query} onChange={onChangeQuery} />;
}
