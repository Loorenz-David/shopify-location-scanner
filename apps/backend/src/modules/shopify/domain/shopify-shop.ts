export type LinkedShop = {
  id: string;
  shopDomain: string;
  accessToken: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductLocationData = {
  id: string;
  title: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | "UNLISTED" | "UNKNOWN";
  itemCategory: string | null;
  quantity: number;
  properties: Record<string, string> | null;
  sku: string | null;
  barcode: string | null;
  price: string | null;
  itemHeight: number | null;
  itemWidth: number | null;
  itemDepth: number | null;
  volume: number | null;
  imageUrl: string | null;
  location: string | null;
  updatedAt: string;
};

export type ProductLocationSnapshot = ProductLocationData;
