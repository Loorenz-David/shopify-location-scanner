import { getBootstrapApi } from "../../bootstrap/api/get-bootstrap.api";
import type { ScannerLocationOption } from "../types/scanner.types";

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
