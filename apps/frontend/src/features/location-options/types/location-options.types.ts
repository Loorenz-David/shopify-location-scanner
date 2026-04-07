export interface LocationOption {
  label: string;
  value: string;
}

export interface LocationOptionsSettingsState {
  options: LocationOption[];
  query: string;
  expandedValue: string | null;
  hasHydrated: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  setOptions: (options: LocationOption[]) => void;
  setQuery: (query: string) => void;
  setExpandedValue: (value: string | null) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setErrorMessage: (errorMessage: string | null) => void;
}
