export type FloorPlanVertex = {
  xCm: number;
  yCm: number;
};

export type FloorPlan = {
  id: string;
  shopId: string;
  name: string;
  widthCm: number;
  depthCm: number;
  shape: FloorPlanVertex[] | null;
  sortOrder: number;
};
