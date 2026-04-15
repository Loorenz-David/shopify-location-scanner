export interface LogisticLocationDto {
  id: string;
  shopId: string;
  location: string;
  zoneType: "for_delivery" | "for_pickup" | "for_fixing";
  createdAt: string;
}

export interface GetLogisticLocationsResponseDto {
  locations: LogisticLocationDto[];
}

export interface CreateLogisticLocationRequestDto {
  location: string;
  zoneType: "for_delivery" | "for_pickup" | "for_fixing";
}

export interface CreateLogisticLocationResponseDto {
  location: LogisticLocationDto;
}

export interface UpdateLogisticLocationRequestDto {
  location?: string;
  zoneType?: "for_delivery" | "for_pickup" | "for_fixing";
}

export interface UpdateLogisticLocationResponseDto {
  location: LogisticLocationDto;
}
