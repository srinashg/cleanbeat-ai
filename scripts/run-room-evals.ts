#!/usr/bin/env node
import "dotenv/config";

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { z } from "zod";

import { analyzeRoomFile } from "../src/lib/ai/analyze-room.js";
import { RoomAnalysisError } from "../src/lib/ai/analysis-errors.js";

const evaluationCaseSchema = z.object({
  id: z.string().trim().min(1),
  file: z.string().trim().min(1),
  expectedOutcome: z.enum([
    "success",
    "not_a_room",
    "success_or_unusable_image",
  ]),
  checks: z.array(z.string().trim().min(1)).min(1),
});

const evaluationManifestSchema = z.array(evaluationCaseSchema).min(1);
type EvaluationCase = z.infer<typeof evaluationCaseSchema>;
type ObservedOutcome = "success" | "not_a_room" | "unusable_image" | "error";

function expectedOutcomeMatches(
  expected: EvaluationCase["expectedOutcome"],
  observed: ObservedOutcome,
): boolean {
  if (expected === "success_or_unusable_image") {
    return observed === "success" || observed === "unusable_image";
  }
  return expected === observed;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
  const manifestPath = path.resolve("evals/room-analysis-cases.json");
  const manifestDirectory = path.dirname(manifestPath);

  if (!apiKey) {
    throw new RoomAnalysisError(
      "MISSING_API_KEY",
      "OPENAI_API_KEY is required to run live room-analysis evaluations.",
    );
  }

  const manifest = evaluationManifestSchema.parse(
    JSON.parse(await readFile(manifestPath, "utf8")),
  );
  const results = [];

  for (const evaluationCase of manifest) {
    const imagePath = path.resolve(manifestDirectory, evaluationCase.file);

    if (!(await fileExists(imagePath))) {
      results.push({
        id: evaluationCase.id,
        expectedOutcome: evaluationCase.expectedOutcome,
        observedOutcome: "error" as const,
        passed: false,
        skipped: true,
        message: `Missing fixture: ${imagePath}`,
        manualChecks: evaluationCase.checks,
      });
      continue;
    }

    try {
      const analysis = await analyzeRoomFile({ filePath: imagePath, apiKey, model });
      const serialized = JSON.stringify(analysis).toLowerCase();
      const containsInsult = /\b(disgusting|lazy|filthy person)\b/.test(serialized);
      const observedOutcome = "success" as const;

      results.push({
        id: evaluationCase.id,
        expectedOutcome: evaluationCase.expectedOutcome,
        observedOutcome,
        passed:
          expectedOutcomeMatches(evaluationCase.expectedOutcome, observedOutcome) &&
          !containsInsult,
        skipped: false,
        message: containsInsult
          ? "The validated analysis still contained prohibited insulting language."
          : "The result passed schema validation.",
        roomType: analysis.roomType,
        taskCount: analysis.tasks.length,
        confidence: analysis.confidence,
        uncertaintyCount: analysis.uncertaintyNotes.length,
        manualChecks: evaluationCase.checks,
      });
    } catch (error) {
      const observedOutcome: ObservedOutcome =
        error instanceof RoomAnalysisError && error.code === "NOT_A_ROOM"
          ? "not_a_room"
          : error instanceof RoomAnalysisError && error.code === "IMAGE_UNREADABLE"
            ? "unusable_image"
            : "error";

      results.push({
        id: evaluationCase.id,
        expectedOutcome: evaluationCase.expectedOutcome,
        observedOutcome,
        passed: expectedOutcomeMatches(
          evaluationCase.expectedOutcome,
          observedOutcome,
        ),
        skipped: false,
        message:
          error instanceof RoomAnalysisError
            ? `${error.code}: ${error.message}`
            : "Unexpected evaluation failure.",
        manualChecks: evaluationCase.checks,
      });
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    model,
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed && !result.skipped).length,
    skipped: results.filter((result) => result.skipped).length,
    results,
  };
  const timestamp = summary.generatedAt.replace(/[:.]/g, "-");
  const outputPath = path.resolve("evals/results", `${timestamp}.json`);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(summary, null, 2));
  console.error(`Saved evaluation report to ${outputPath}`);

  if (summary.failed > 0 || summary.skipped > 0) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  const publicError =
    error instanceof RoomAnalysisError
      ? error
      : new RoomAnalysisError(
          "AI_ANALYSIS_FAILED",
          "The evaluation run failed unexpectedly.",
          { cause: error },
        );

  console.error(
    JSON.stringify(
      { error: { code: publicError.code, message: publicError.message } },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
