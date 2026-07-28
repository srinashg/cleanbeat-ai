import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { RoomAnalysisError } from "./analysis-errors.js";

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MIN_IMAGE_DIMENSION = 256;
const MAX_NORMALIZED_DIMENSION = 2048;
const SUPPORTED_SOURCE_FORMATS = new Set(["jpeg", "png", "webp", "heif"]);

export type PreparedRoomImage = {
  dataUrl: string;
  sourcePath: string;
  sourceFormat: string;
  sourceSizeBytes: number;
  normalizedSizeBytes: number;
  width: number;
  height: number;
};

export async function prepareRoomImage(
  inputPath: string,
): Promise<PreparedRoomImage> {
  const sourcePath = path.resolve(inputPath);

  let sourceStats;
  try {
    sourceStats = await stat(sourcePath);
  } catch (error) {
    throw new RoomAnalysisError(
      "FILE_NOT_FOUND",
      `Image file not found: ${sourcePath}`,
      { cause: error },
    );
  }

  if (!sourceStats.isFile()) {
    throw new RoomAnalysisError(
      "FILE_NOT_FOUND",
      `The supplied image path is not a file: ${sourcePath}`,
    );
  }

  if (sourceStats.size > MAX_SOURCE_BYTES) {
    throw new RoomAnalysisError(
      "FILE_TOO_LARGE",
      `The image is larger than ${MAX_SOURCE_BYTES / 1024 / 1024} MB.`,
    );
  }

  const sourceBuffer = await readFile(sourcePath);

  try {
    const image = sharp(sourceBuffer, {
      failOn: "error",
      limitInputPixels: 100_000_000,
    });
    const metadata = await image.metadata();
    const sourceFormat = metadata.format;
    const width = metadata.width;
    const height = metadata.height;

    if (!sourceFormat || !SUPPORTED_SOURCE_FORMATS.has(sourceFormat)) {
      throw new RoomAnalysisError(
        "UNSUPPORTED_IMAGE",
        "Use a JPEG, PNG, WebP, HEIF, or HEIC room photograph.",
      );
    }

    if (!width || !height) {
      throw new RoomAnalysisError(
        "IMAGE_UNREADABLE",
        "The image dimensions could not be read.",
      );
    }

    if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
      throw new RoomAnalysisError(
        "IMAGE_UNREADABLE",
        `The image must be at least ${MIN_IMAGE_DIMENSION} pixels in each dimension.`,
      );
    }

    const normalizedBuffer = await image
      .rotate()
      .resize({
        width: MAX_NORMALIZED_DIMENSION,
        height: MAX_NORMALIZED_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    return {
      dataUrl: `data:image/jpeg;base64,${normalizedBuffer.toString("base64")}`,
      sourcePath,
      sourceFormat,
      sourceSizeBytes: sourceStats.size,
      normalizedSizeBytes: normalizedBuffer.byteLength,
      width,
      height,
    };
  } catch (error) {
    if (error instanceof RoomAnalysisError) {
      throw error;
    }

    throw new RoomAnalysisError(
      "IMAGE_UNREADABLE",
      "The image could not be decoded or normalized.",
      { cause: error },
    );
  }
}
