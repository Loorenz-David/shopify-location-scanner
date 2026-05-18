export function normalizeLocationOptions(values) {
    const unique = Array.from(new Set(values.map((value) => value.trim()))).filter(Boolean);
    return unique.map((value) => ({
        label: value,
        value,
    }));
}
export function filterLocationOptions(options, query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return options;
    }
    return options.filter((option) => option.value.toLowerCase().includes(normalizedQuery));
}
