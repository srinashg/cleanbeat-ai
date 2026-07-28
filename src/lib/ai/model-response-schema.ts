import { z } from "zod";

import { roomAnalysisSchema } from "./analysis-schema.js";

export const modelAnalysisStatusSchema = z.enum([
  "success",
  "not_a_room",
  "unusable_image",
]);

export const modelRoomAnalysisResponseSchema = z
  .object({
    status: modelAnalysisStatusSchema,
    message: z.string().trim().min(1).max(300),
    analysis: roomAnalysisSchema.nullable(),
  })
  .strict()
  .superRefine((result, context) => {
    if (result.status === "success" && result.analysis === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A successful result must contain an analysis.",
        path: ["analysis"],
      });
    }

    if (result.status !== "success" && result.analysis !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "An unsuccessful result must not contain an analysis.",
        path: ["analysis"],
      });
    }
  });

export type ModelRoomAnalysisResponse = z.infer<
  typeof modelRoomAnalysisResponseSchema
>;
