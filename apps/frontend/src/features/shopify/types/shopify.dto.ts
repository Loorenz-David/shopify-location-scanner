export interface ShopifyOauthInstallRequestDto {
  storeName?: string;
  shopDomain?: string;
}

export interface ShopifyOauthInstallResponseDto {
  authorizationUrl: string;
}

export interface ShopifyProductDto {
  id: string;
  title: string;
  location: string;
  updatedAt: string;
  previousLocation?: string;
}

export interface ShopifyProductResponseDto {
  product: ShopifyProductDto;
}

export interface UpdateProductLocationRequestDto {
  location: string;
}

export interface UpdateItemLocationRequestDto {
  idType: "product_id" | "handle" | "sku";
  itemId: string;
  location: string;
}

export interface ShopifyItemBySkuDto {
  productId: string;
  imageUrl: string;
  sku: string;
  title?: string;
}

export interface ShopifyItemsBySkuResponseDto {
  items: ShopifyItemBySkuDto[];
  count: number;
}

export interface ShopifyMetafieldOptionDto {
  label: string;
  value: string;
}

export interface ShopifyMetafieldDto {
  namespace: string;
  key: string;
  type: string;
  options: ShopifyMetafieldOptionDto[];
}

export interface ShopifyMetafieldResponseDto {
  metafield: ShopifyMetafieldDto;
}

export interface SetShopifyMetafieldOptionsRequestDto {
  options: string[];
}

export interface ShopifyLinkedShopDto {
  shopDomain: string;
  createdAt: string;
}

export interface ShopifyLinkedShopResponseDto {
  shop: ShopifyLinkedShopDto;
}

export interface ShopifyUnlinkResponseDto {
  ok: boolean;
  shop: ShopifyLinkedShopDto;
}
