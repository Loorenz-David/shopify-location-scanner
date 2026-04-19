import { z } from "zod";

export const FloorPlanVertexSchema = z.object({
  xCm: z.number(),
  yCm: z.number(),
});

const FloorPlanBaseSchema = z.object({
  name: z.string().trim().min(1).max(100).default("Ground Floor"),
  widthCm: z.number().positive("Width must be greater than 0"),
  depthCm: z.number().positive("Depth must be greater than 0"),
  shape: z.array(FloorPlanVertexSchema).min(3).nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export const CreateFloorPlanSchema = FloorPlanBaseSchema.superRefine((data, ctx) => {
  if (!data.shape) {
    return;
  }

  data.shape.forEach((vertex, index) => {
    if (vertex.xCm < 0 || vertex.xCm > data.widthCm) {
      ctx.addIssue({
        code: "custom",
        path: ["shape", index, "xCm"],
        message: `xCm must be between 0 and widthCm (${data.widthCm})`,
      });
    }

    if (vertex.yCm < 0 || vertex.yCm > data.depthCm) {
      ctx.addIssue({
        code: "custom",
        path: ["shape", index, "yCm"],
        message: `yCm must be between 0 and depthCm (${data.depthCm})`,
      });
    }
  });
});

export const UpdateFloorPlanSchema = FloorPlanBaseSchema.partial();

export type CreateFloorPlanInput = z.infer<typeof CreateFloorPlanSchema>;
export type UpdateFloorPlanInput = z.infer<typeof UpdateFloorPlanSchema>;
