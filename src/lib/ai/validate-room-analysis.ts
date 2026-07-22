import {
  roomAnalysisSchema,
  type RoomAnalysis,
} from "./analysis-schema";

/**
 * Validates unknown model output and throws a ZodError when it is invalid.
 * Use this when the caller already has centralized error handling.
 */
export function validateRoomAnalysis(value: unknown): RoomAnalysis {
  return roomAnalysisSchema.parse(value);
}

/**
 * Validates unknown model output without throwing.
 * Use this in API routes that must map invalid output to a controlled response.
 */
export function safeValidateRoomAnalysis(value: unknown) {
  return roomAnalysisSchema.safeParse(value);
}
