export type LogisticZoneType = "for_delivery" | "for_pickup" | "for_fixing";

export interface LogisticLocationRecord {
  id: string;
  shopId: string;
  location: string;
  zoneType: LogisticZoneType;
  createdAt: string;
}
