import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import OpenAI from "openai";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analyzeRoomFile,
  type RoomAnalysisOpenAIClient,
} from "../../../src/lib/ai/analyze-room.js";

const temporaryDirectories: string[] = [];

async function createTestImage(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "cleanbeat-ai-"));
  temporaryDirectories.push(directory);
  const imagePath = path.join(directory, "room.jpg");

  await sharp({
    create: {
      width: 600,
      height: 400,
      channels: 3,
      background: { r: 220, g: 220, b: 220 },
    },
  }).jpeg().toFile(imagePath);

  return imagePath;
}

function createMockClient(outputParsed: unknown): RoomAnalysisOpenAIClient {
  return {
    responses: {
      parse: vi.fn().mockResolvedValue({ output_parsed: outputParsed }),
    },
  } as unknown as Pick<OpenAI, "responses">;
}

const validAnalysis = {
  roomType: "office",
  roomCondition: "good",
  clutterLevel: 3,
  summary: "A small number of papers are visible on the desk.",
  visibleConditions: ["Several papers are visible on the desk."],
  tasks: [{
    id: "sort-desk-papers",
    title: "Sort the visible desk papers",
    description: "Group or file the papers visible on the desk.",
    category: "organizing",
    estimatedMinutes: 6,
    priority: "medium",
    evidence: "Several papers are spread across the desk surface.",
  }],
  assumptions: ["Only the visible desk area is included."],
  uncertaintyNotes: ["Paper contents cannot be determined from the image."],
  confidence: 0.86,
  recommendedMusic: {
    energy: "medium",
    mood: "focused",
    genres: ["instrumental"],
    targetBpmMin: 90,
    targetBpmMax: 115,
  },
} as const;

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("analyzeRoomFile", () => {
  it("returns locally validated structured analysis", async () => {
    const imagePath = await createTestImage();
    const result = await analyzeRoomFile({
      filePath: imagePath,
      model: "test-model",
      client: createMockClient({
        status: "success",
        message: "Room analysis completed.",
        analysis: validAnalysis,
      }),
    });

    expect(result.roomType).toBe("office");
    expect(result.tasks).toHaveLength(1);
  });

  it("returns a controlled NOT_A_ROOM error", async () => {
    const imagePath = await createTestImage();

    await expect(analyzeRoomFile({
      filePath: imagePath,
      model: "test-model",
      client: createMockClient({
        status: "not_a_room",
        message: "The image appears to be a meme.",
        analysis: null,
      }),
    })).rejects.toMatchObject({ code: "NOT_A_ROOM" });
  });

  it("rejects schema-invalid output", async () => {
    const imagePath = await createTestImage();

    await expect(analyzeRoomFile({
      filePath: imagePath,
      model: "test-model",
      client: createMockClient({
        status: "success",
        message: "Room analysis completed.",
        analysis: { ...validAnalysis, clutterLevel: 99 },
      }),
    })).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE" });
  });
});
