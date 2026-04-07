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
  sku: string | null;
  barcode: string | null;
  imageUrl: string | null;
  location: string | null;
  updatedAt: string;
};
