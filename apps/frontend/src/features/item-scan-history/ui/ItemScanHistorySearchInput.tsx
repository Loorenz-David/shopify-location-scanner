import { SearchBar } from "../../../share/searchbar";

interface ItemScanHistorySearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function ItemScanHistorySearchInput({
  value,
  onChange,
}: ItemScanHistorySearchInputProps) {
  return (
    <SearchBar
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search by SKU, product, user, or location"
      aria-label="Search item scan history"
    />
  );
}
