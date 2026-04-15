export interface BootstrapLocationOptionDto {
  label: string;
  value: string;
}

export interface BootstrapMetafieldsDto {
  namespace: string;
  key: string;
  type: string;
  options: BootstrapLocationOptionDto[];
}

export interface LogisticLocationBootstrapDto {
  id: string;
  shopId: string;
  location: string;
  zoneType: "for_delivery" | "for_pickup" | "for_fixing";
  createdAt: string;
}

export interface BootstrapPayloadDto {
  shopify: {
    metafields: BootstrapMetafieldsDto;
  };
  logisticLocations: LogisticLocationBootstrapDto[];
  vapidPublicKey: string;
}

export interface BootstrapResponseDto {
  payload: BootstrapPayloadDto;
}
