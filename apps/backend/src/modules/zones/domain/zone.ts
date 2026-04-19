export type StoreZoneType = "zone" | "corridor";

export type StoreZone = {
  id: string;
  shopId: string;
  label: string;
  type: StoreZoneType;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  sortOrder: number;
  floorPlanId: string | null;
  widthCm: number | null;
  depthCm: number | null;
};
