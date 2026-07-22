import { describe, expect, it } from "vitest";

import {
  roomAnalysisSchema,
  type RoomAnalysis,
} from "../../../src/lib/ai/analysis-schema";

const validRoomAnalysis: RoomAnalysis = {
  roomType: "bedroom",
  roomCondition: "fair",
  clutterLevel: 6,
  summary:
    "Clothing and loose objects are visible on part of the floor and desk.",
  visibleConditions: [
    "Clothing is visible on the floor.",
    "Loose objects are visible on the desk.",
  ],
  tasks: [
    {
      id: "collect-floor-clothing",
      title: "Collect clothing from the floor",
      description: "Move visible clothing into a laundry basket or storage area.",
      category: "laundry",
      estimatedMinutes: 8,
      priority: "high",
      evidence: "Several clothing items are visible on the floor.",
    },
  ],
  assumptions: ["One person is completing the cleaning session."],
  uncertaintyNotes: ["Hidden clutter cannot be evaluated from the image."],
  confidence: 0.82,
  recommendedMusic: {
    energy: "medium",
    mood: "upbeat and focused",
    genres: ["pop", "dance"],
    targetBpmMin: 110,
    targetBpmMax: 130,
  },
};

describe("roomAnalysisSchema", () => {
  it("accepts a valid room analysis", () => {
    const result = roomAnalysisSchema.safeParse(validRoomAnalysis);

    expect(result.success).toBe(true);
  });

  it("rejects an analysis with missing tasks", () => {
    const analysisWithoutTasks: Record<string, unknown> = {
      ...validRoomAnalysis,
    };
    delete analysisWithoutTasks.tasks;

    const result = roomAnalysisSchema.safeParse(analysisWithoutTasks);

    expect(result.success).toBe(false);
  });

  it("rejects an empty task list", () => {
    const result = roomAnalysisSchema.safeParse({
      ...validRoomAnalysis,
      tasks: [],
    });

    expect(result.success).toBe(false);
  });

  it.each([0, 11])("rejects clutter level %s", (clutterLevel) => {
    const result = roomAnalysisSchema.safeParse({
      ...validRoomAnalysis,
      clutterLevel,
    });

    expect(result.success).toBe(false);
  });

  it.each([-0.01, 1.01])(
    "rejects confidence value %s",
    (confidence) => {
      const result = roomAnalysisSchema.safeParse({
        ...validRoomAnalysis,
        confidence,
      });

      expect(result.success).toBe(false);
    },
  );

  it("rejects a reversed BPM range", () => {
    const result = roomAnalysisSchema.safeParse({
      ...validRoomAnalysis,
      recommendedMusic: {
        ...validRoomAnalysis.recommendedMusic,
        targetBpmMin: 150,
        targetBpmMax: 100,
      },
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ["targetBpmMin", 49],
    ["targetBpmMin", 221],
    ["targetBpmMax", 49],
    ["targetBpmMax", 221],
  ] as const)("rejects %s value %s", (field, value) => {
    const result = roomAnalysisSchema.safeParse({
      ...validRoomAnalysis,
      recommendedMusic: {
        ...validRoomAnalysis.recommendedMusic,
        [field]: value,
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate task IDs", () => {
    const firstTask = validRoomAnalysis.tasks[0]!;

    const result = roomAnalysisSchema.safeParse({
      ...validRoomAnalysis,
      tasks: [
        firstTask,
        {
          ...firstTask,
          title: "Collect clothing near the desk",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects blank required text", () => {
    const result = roomAnalysisSchema.safeParse({
      ...validRoomAnalysis,
      summary: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unknown properties", () => {
    const result = roomAnalysisSchema.safeParse({
      ...validRoomAnalysis,
      userPersonality: "disorganized",
    });

    expect(result.success).toBe(false);
  });
});
