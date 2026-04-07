import { ApiClientError } from "../../../core/api-client";
import { useLocationOptionsStore } from "../../scanner/stores/location-options.store";
import { getBootstrapApi } from "../api/get-bootstrap.api";
import { useBootstrapStore } from "../stores/bootstrap.store";

export async function hydrateBootstrapController(): Promise<void> {
  const bootstrapStore = useBootstrapStore.getState();
  if (bootstrapStore.isHydrating) {
    return;
  }

  bootstrapStore.setHydrating(true);
  bootstrapStore.setErrorMessage(null);

  try {
    const response = await getBootstrapApi();
    bootstrapStore.setPayload(response.payload);
    bootstrapStore.setLastSyncedAt(new Date().toISOString());

    useLocationOptionsStore
      .getState()
      .setOptions(response.payload.shopify.metafields.options);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 403) {
      bootstrapStore.setErrorMessage("Shop is not linked yet.");
    } else {
      bootstrapStore.setErrorMessage("Unable to load bootstrap data.");
    }
  } finally {
    bootstrapStore.setHydrating(false);
  }
}

export function clearBootstrapController(): void {
  useBootstrapStore.getState().reset();
  useLocationOptionsStore.getState().reset();
}
