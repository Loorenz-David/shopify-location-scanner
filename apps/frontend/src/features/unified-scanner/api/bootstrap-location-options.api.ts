import { getBootstrapApi } from "../../bootstrap/api/get-bootstrap.api";
import type { ScannerLocationOption } from "../types/unified-scanner.types";

export async function bootstrapLocationOptionsApi(): Promise<
  ScannerLocationOption[]
> {
  try {
    const response = await getBootstrapApi();
    return response.payload.shopify.metafields.options ?? [];
  } catch {
    return [];
  }
}
