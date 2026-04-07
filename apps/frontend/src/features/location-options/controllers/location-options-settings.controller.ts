import { ApiClientError } from "../../../core/api-client";
import { getLocationOptionsApi } from "../api/get-location-options.api";
import {
  addLocationOptionsApi,
  deleteLocationOptionApi,
} from "../api/set-location-options.api";
import { normalizeLocationOptions } from "../domain/location-options.domain";
import { useLocationOptionsSettingsStore } from "../stores/location-options-settings.store";
import type { LocationOption } from "../types/location-options.types";

interface ApiErrorPayload {
  error?: {
    message?: string;
  };
}

function resolveApiErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiClientError)) {
    return null;
  }

  const payload = error.data as ApiErrorPayload;
  const message = payload?.error?.message;
  if (typeof message !== "string" || !message.trim()) {
    return null;
  }

  return message.trim();
}

function reconcileLocationOptionOrder(
  serverOptions: LocationOption[],
  preferredOrder: LocationOption[],
): LocationOption[] {
  const preferredOrderMap = new Map(
    preferredOrder.map((option, index) => [option.value.toLowerCase(), index]),
  );

  return [...serverOptions].sort((left, right) => {
    const leftOrder = preferredOrderMap.get(left.value.toLowerCase());
    const rightOrder = preferredOrderMap.get(right.value.toLowerCase());

    if (leftOrder === undefined && rightOrder === undefined) {
      return left.label.localeCompare(right.label);
    }

    if (leftOrder === undefined) {
      return 1;
    }

    if (rightOrder === undefined) {
      return -1;
    }

    return leftOrder - rightOrder;
  });
}

export async function hydrateLocationOptionsController(): Promise<void> {
  const store = useLocationOptionsSettingsStore.getState();
  store.setLoading(true);
  store.setErrorMessage(null);

  try {
    const values = await getLocationOptionsApi();
    store.setOptions(normalizeLocationOptions(values));
  } catch (error) {
    const apiMessage = resolveApiErrorMessage(error);
    store.setErrorMessage(
      apiMessage
        ? `Unable to load location options. ${apiMessage}`
        : "Unable to load location options.",
    );
  } finally {
    store.setLoading(false);
    store.setHasHydrated(true);
  }
}

export async function addLocationOptionController(
  value: string,
): Promise<void> {
  const store = useLocationOptionsSettingsStore.getState();
  const trimmed = value.trim();

  if (!trimmed) {
    return;
  }

  const previousOptions = store.options;
  const exists = previousOptions.some(
    (option) => option.value.toLowerCase() === trimmed.toLowerCase(),
  );

  if (exists) {
    store.setErrorMessage("Option already exists.");
    return;
  }

  const optimisticOptions = [
    { label: trimmed, value: trimmed },
    ...previousOptions,
  ];

  store.setSubmitting(true);
  store.setErrorMessage(null);
  store.setOptions(optimisticOptions);
  store.setQuery("");

  try {
    const response = await addLocationOptionsApi([trimmed]);
    store.setOptions(
      reconcileLocationOptionOrder(response.metafield.options, optimisticOptions),
    );
  } catch {
    store.setOptions(previousOptions);
    store.setQuery(trimmed);
    store.setErrorMessage("Unable to add option right now.");
  } finally {
    store.setSubmitting(false);
  }
}

export async function removeLocationOptionController(
  value: string,
): Promise<void> {
  const store = useLocationOptionsSettingsStore.getState();
  const previousOptions = store.options;
  const optimisticOptions = previousOptions.filter(
    (option) => option.value !== value,
  );

  store.setSubmitting(true);
  store.setErrorMessage(null);
  store.setOptions(optimisticOptions);
  store.setExpandedValue(null);

  try {
    const response = await deleteLocationOptionApi(value);
    store.setOptions(
      reconcileLocationOptionOrder(response.metafield.options, optimisticOptions),
    );
  } catch {
    store.setOptions(previousOptions);
    store.setErrorMessage("Unable to remove option right now.");
  } finally {
    store.setSubmitting(false);
  }
}
