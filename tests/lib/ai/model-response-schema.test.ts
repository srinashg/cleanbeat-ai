import { describe, expect, it } from "vitest";

import { modelRoomAnalysisResponseSchema } from "../../../src/lib/ai/model-response-schema.js";

const validAnalysis = {
  roomType: "bedroom",
  roomCondition: "fair",
  clutterLevel: 5,
  summary: "Clothing and books are visible on the floor and desk.",
  visibleConditions: ["Clothing is visible on part of the floor."],
  tasks: [{
    id: "collect-floor-clothing",
    title: "Collect clothing from the floor",
    description: "Place visible clothing in a hamper or storage area.",
    category: "laundry",
    estimatedMinutes: 7,
    priority: "high",
    evidence: "Several clothing items are visible on the floor.",
  }],
  assumptions: ["One person will complete the tasks."],
  uncertaintyNotes: ["Hidden areas are not visible."],
  confidence: 0.8,
  recommendedMusic: {
    energy: "medium",
    mood: "focused and upbeat",
    genres: ["pop"],
    targetBpmMin: 105,
    targetBpmMax: 125,
  },
} as const;

describe("modelRoomAnalysisResponseSchema", () => {
  it("accepts a successful analysis envelope", () => {
    expect(modelRoomAnalysisResponseSchema.safeParse({
      status: "success",
      message: "Room analysis completed.",
      analysis: validAnalysis,
    }).success).toBe(true);
  });

  it("accepts a controlled not-a-room result", () => {
    expect(modelRoomAnalysisResponseSchema.safeParse({
      status: "not_a_room",
      message: "The image appears to be a screenshot rather than a room photo.",
      analysis: null,
    }).success).toBe(true);
  });

  it("rejects success without an analysis", () => {
    expect(modelRoomAnalysisResponseSchema.safeParse({
      status: "success",
      message: "Room analysis completed.",
      analysis: null,
    }).success).toBe(false);
  });

  it("rejects a failure that contains an analysis", () => {
    expect(modelRoomAnalysisResponseSchema.safeParse({
      status: "unusable_image",
      message: "The image is too blurry to analyze.",
      analysis: validAnalysis,
    }).success).toBe(false);
  });
});
