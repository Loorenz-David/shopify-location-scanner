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

export interface BootstrapPayloadDto {
  shopify: {
    metafields: BootstrapMetafieldsDto;
  };
}

export interface BootstrapResponseDto {
  payload: BootstrapPayloadDto;
}
