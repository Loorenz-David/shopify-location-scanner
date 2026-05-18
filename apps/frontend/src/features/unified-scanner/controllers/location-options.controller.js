import { bootstrapLocationOptionsApi } from "../api/bootstrap-location-options.api";
import { useLocationOptionsStore } from "../stores/location-options.store";
export async function bootstrapLocationOptionsController() {
    const options = await bootstrapLocationOptionsApi();
    useLocationOptionsStore.getState().setOptions(options);
}
