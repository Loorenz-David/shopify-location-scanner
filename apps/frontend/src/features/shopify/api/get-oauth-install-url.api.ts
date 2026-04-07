import { apiClient } from "../../../core/api-client";
import type {
  ShopifyOauthInstallRequestDto,
  ShopifyOauthInstallResponseDto,
} from "../types/shopify.dto";

export async function getOauthInstallUrlApi(
  payload: ShopifyOauthInstallRequestDto,
): Promise<ShopifyOauthInstallResponseDto> {
  return apiClient.post<
    ShopifyOauthInstallResponseDto,
    ShopifyOauthInstallRequestDto
  >("/shopify/oauth/install", payload, { requiresAuth: true });
}
