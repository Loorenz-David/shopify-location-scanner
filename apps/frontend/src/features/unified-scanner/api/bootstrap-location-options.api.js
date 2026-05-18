import { getBootstrapApi } from "../../bootstrap/api/get-bootstrap.api";
export async function bootstrapLocationOptionsApi() {
    try {
        const response = await getBootstrapApi();
        return response.payload.shopify.metafields.options ?? [];
    }
    catch {
        return [];
    }
}
