export function defaultLogisticTaskFilters() {
    return {};
}
export function countActiveLogisticTaskFilters(filters) {
    return Object.values(filters).filter((v) => v !== undefined && v !== null)
        .length;
}
export function serializeFiltersForRequestKey(filters) {
    return JSON.stringify(filters);
}
