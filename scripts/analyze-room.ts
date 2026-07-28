#!/usr/bin/env node
import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { analyzeRoomFile } from "../src/lib/ai/analyze-room.js";
import { RoomAnalysisError } from "../src/lib/ai/analysis-errors.js";

const DEFAULT_MODEL = "gpt-5-mini";

type CliOptions = {
  imagePath: string;
  outputPath: string;
  model: string;
};

function printUsage(): void {
  console.log(`Usage:
  npm run analyze:room -- <image-path> [--output <json-path>] [--model <model>]

Examples:
  npm run analyze:room -- ./evals/images/clean-bedroom.jpg
  npm run analyze:room -- ./room.heic --output ./artifacts/room.json
  npm run analyze:room -- ./room.png --model gpt-5-mini`);
}

function readOptionValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function defaultOutputPath(imagePath: string): string {
  const parsed = path.parse(imagePath);
  const safeBaseName = parsed.name.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return path.resolve("artifacts", `${safeBaseName}-analysis.json`);
}

export function parseCliArguments(args: string[]): CliOptions | null {
  if (args.includes("--help") || args.includes("-h")) return null;

  let imagePath: string | undefined;
  let outputPath: string | undefined;
  let model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;

    if (argument === "--output") {
      outputPath = readOptionValue(args, index, "--output");
      index += 1;
      continue;
    }

    if (argument === "--model") {
      model = readOptionValue(args, index, "--model");
      index += 1;
      continue;
    }

    if (argument.startsWith("--")) throw new Error(`Unknown option: ${argument}`);
    if (imagePath) throw new Error("Only one image path may be supplied.");
    imagePath = argument;
  }

  if (!imagePath) throw new Error("An image path is required.");

  return {
    imagePath: path.resolve(imagePath),
    outputPath: path.resolve(outputPath ?? defaultOutputPath(imagePath)),
    model,
  };
}

async function main(): Promise<void> {
  let options: CliOptions | null;

  try {
    options = parseCliArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid arguments.");
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (options === null) {
    printUsage();
    return;
  }

  try {
    const analysis = await analyzeRoomFile({
      filePath: options.imagePath,
      apiKey: process.env.OPENAI_API_KEY,
      model: options.model,
    });
    const formattedJson = `${JSON.stringify(analysis, null, 2)}\n`;

    await mkdir(path.dirname(options.outputPath), { recursive: true });
    await writeFile(options.outputPath, formattedJson, "utf8");

    process.stdout.write(formattedJson);
    console.error(`Saved validated analysis to ${options.outputPath}`);
  } catch (error) {
    const publicError =
      error instanceof RoomAnalysisError
        ? error
        : new RoomAnalysisError(
            "AI_ANALYSIS_FAILED",
            "The room analysis failed unexpectedly.",
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
}

await main();
