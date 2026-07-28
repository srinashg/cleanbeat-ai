export const roomAnalysisErrorCodes = [
  "FILE_NOT_FOUND",
  "FILE_TOO_LARGE",
  "UNSUPPORTED_IMAGE",
  "IMAGE_UNREADABLE",
  "MISSING_API_KEY",
  "NOT_A_ROOM",
  "INVALID_AI_RESPONSE",
  "RATE_LIMITED",
  "AI_ANALYSIS_FAILED",
] as const;

export type RoomAnalysisErrorCode = (typeof roomAnalysisErrorCodes)[number];

export class RoomAnalysisError extends Error {
  readonly code: RoomAnalysisErrorCode;
  override readonly cause?: unknown;

  constructor(
    code: RoomAnalysisErrorCode,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message);
    this.name = "RoomAnalysisError";
    this.code = code;
    this.cause = options.cause;
  }
}

function getNumericStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
}

export function mapOpenAIError(error: unknown): RoomAnalysisError {
  if (error instanceof RoomAnalysisError) {
    return error;
  }

  const status = getNumericStatus(error);

  if (status === 429) {
    return new RoomAnalysisError(
      "RATE_LIMITED",
      "The room analysis service is temporarily rate-limited. Try again later.",
      { cause: error },
    );
  }

  return new RoomAnalysisError(
    "AI_ANALYSIS_FAILED",
    "The room could not be analyzed because the AI request failed.",
    { cause: error },
  );
}
