import { jsx as _jsx } from "react/jsx-runtime";
import { ItemScanHistorySearchInput } from "./ItemScanHistorySearchInput";
export function ItemScanHistoryHeader({ query, activeFilterCount, onChangeQuery, onOpenFilters, }) {
    return (_jsx(ItemScanHistorySearchInput, { value: query, activeFilterCount: activeFilterCount, onChange: onChangeQuery, onOpenFilters: onOpenFilters }));
}
