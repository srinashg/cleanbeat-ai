import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ZodError } from "zod";

import { type RoomAnalysis } from "./analysis-schema.js";
import {
  mapOpenAIError,
  RoomAnalysisError,
} from "./analysis-errors.js";
import {
  modelRoomAnalysisResponseSchema,
  type ModelRoomAnalysisResponse,
} from "./model-response-schema.js";
import { prepareRoomImage } from "./prepare-image.js";
import {
  ROOM_ANALYSIS_INSTRUCTIONS,
  ROOM_ANALYSIS_REQUEST,
} from "./prompts.js";
import { safeValidateRoomAnalysis } from "./validate-room-analysis.js";

export type RoomAnalysisOpenAIClient = Pick<OpenAI, "responses">;

export type AnalyzeRoomFileOptions = {
  filePath: string;
  apiKey?: string | undefined;
  model: string;
  client?: RoomAnalysisOpenAIClient | undefined;
};

function createClient(apiKey: string | undefined): OpenAI {
  if (!apiKey) {
    throw new RoomAnalysisError(
      "MISSING_API_KEY",
      "OPENAI_API_KEY is required to analyze a room image.",
    );
  }

  return new OpenAI({
    apiKey,
    maxRetries: 2,
    timeout: 60_000,
  });
}

function unwrapModelResult(result: ModelRoomAnalysisResponse): RoomAnalysis {
  if (result.status === "not_a_room") {
    throw new RoomAnalysisError(
      "NOT_A_ROOM",
      result.message || "The image could not be recognized as a room photograph.",
    );
  }

  if (result.status === "unusable_image") {
    throw new RoomAnalysisError(
      "IMAGE_UNREADABLE",
      result.message || "The image is too dark, blurry, or obstructed to analyze.",
    );
  }

  const validatedAnalysis = safeValidateRoomAnalysis(result.analysis);

  if (!validatedAnalysis.success) {
    throw new RoomAnalysisError(
      "INVALID_AI_RESPONSE",
      "The AI returned a room analysis that did not match the required schema.",
      { cause: validatedAnalysis.error },
    );
  }

  return validatedAnalysis.data;
}

export async function analyzeRoomFile(
  options: AnalyzeRoomFileOptions,
): Promise<RoomAnalysis> {
  const preparedImage = await prepareRoomImage(options.filePath);
  const client = options.client ?? createClient(options.apiKey);

  try {
    const response = await client.responses.parse({
      model: options.model,
      instructions: ROOM_ANALYSIS_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: ROOM_ANALYSIS_REQUEST },
            {
              type: "input_image",
              image_url: preparedImage.dataUrl,
              detail: "high",
            },
          ],
        },
      ],
      max_output_tokens: 4_000,
      text: {
        format: zodTextFormat(
          modelRoomAnalysisResponseSchema,
          "room_analysis_result",
        ),
      },
    });

    if (response.output_parsed === null) {
      throw new RoomAnalysisError(
        "INVALID_AI_RESPONSE",
        "The AI response did not contain a structured room analysis.",
      );
    }

    const validatedResult = modelRoomAnalysisResponseSchema.safeParse(
      response.output_parsed,
    );

    if (!validatedResult.success) {
      throw new RoomAnalysisError(
        "INVALID_AI_RESPONSE",
        "The AI response did not match the structured result contract.",
        { cause: validatedResult.error },
      );
    }

    return unwrapModelResult(validatedResult.data);
  } catch (error) {
    if (error instanceof RoomAnalysisError) throw error;

    if (error instanceof ZodError || error instanceof SyntaxError) {
      throw new RoomAnalysisError(
        "INVALID_AI_RESPONSE",
        "The AI returned malformed or schema-invalid structured output.",
        { cause: error },
      );
    }

    throw mapOpenAIError(error);
  }
}
