import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

import { RoomAnalysisError } from "../../../src/lib/ai/analysis-errors.js";
import { prepareRoomImage } from "../../../src/lib/ai/prepare-image.js";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "cleanbeat-ai-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("prepareRoomImage", () => {
  it("normalizes a supported image into a JPEG data URL", async () => {
    const directory = await createTemporaryDirectory();
    const imagePath = path.join(directory, "room.png");

    await sharp({
      create: {
        width: 600,
        height: 400,
        channels: 3,
        background: { r: 230, g: 230, b: 230 },
      },
    }).png().toFile(imagePath);

    const result = await prepareRoomImage(imagePath);

    expect(result.dataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(result.sourceFormat).toBe("png");
    expect(result.width).toBe(600);
    expect(result.height).toBe(400);
    expect(result.normalizedSizeBytes).toBeGreaterThan(0);
  });

  it("rejects a missing image", async () => {
    await expect(prepareRoomImage("missing-room.jpg")).rejects.toMatchObject({
      code: "FILE_NOT_FOUND",
    } satisfies Partial<RoomAnalysisError>);
  });

  it("rejects an unreadable file", async () => {
    const directory = await createTemporaryDirectory();
    const imagePath = path.join(directory, "not-an-image.jpg");
    await writeFile(imagePath, "not actually an image", "utf8");

    await expect(prepareRoomImage(imagePath)).rejects.toMatchObject({
      code: "IMAGE_UNREADABLE",
    } satisfies Partial<RoomAnalysisError>);
  });

  it("rejects images below the minimum dimensions", async () => {
    const directory = await createTemporaryDirectory();
    const imagePath = path.join(directory, "tiny.png");

    await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 230, g: 230, b: 230 },
      },
    }).png().toFile(imagePath);

    await expect(prepareRoomImage(imagePath)).rejects.toMatchObject({
      code: "IMAGE_UNREADABLE",
    } satisfies Partial<RoomAnalysisError>);
  });
});
