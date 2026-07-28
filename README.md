# CleanBeat AI

CleanBeat AI is a planned multimodal, mobile-first responsive web application that converts photographs of a room into a structured, editable cleaning session. The intended MVP will analyze visible conditions, generate a practical cleaning sequence, calculate a realistic cleaning-time range, and recommend suitable public Spotify playlists.

## Current Status

This repository implements **Step 3: a local AI room-analysis experiment**.

The current code reads and normalizes one local room image, sends it to the OpenAI Responses API, requests structured output, validates successful analysis with the Step 2 Zod schema, returns controlled errors, prints formatted JSON, and saves the validated result locally. The polished Next.js website is intentionally not started yet.

## Installation

Requirements: Node.js 20.9 or newer, npm, and an OpenAI API key for live analysis.

```bash
npm install
cp .env.example .env
```

Add the key to `.env` and never commit that file.

## Run a Local Analysis

```bash
npm run analyze:room -- ./path/to/room.jpg
```

The command prints the validated `RoomAnalysis` JSON and saves it to `artifacts/<image-name>-analysis.json`.

```bash
npm run analyze:room -- ./path/to/room.heic \
  --output ./artifacts/custom-analysis.json \
  --model gpt-5-mini
```

## Prompt, Privacy, and Validation

The model is instructed to analyze only visible room conditions, avoid identifying people or making sensitive personal inferences, separate evidence from assumptions, recommend tasks rather than judge the user, use neutral language, estimate tasks independently, flag uncertainty, and reject non-room or unusable images rather than invent details.

The source image is processed in memory and is not copied or permanently stored. A successful result must pass both the structured response envelope and `roomAnalysisSchema` before it is printed or saved.

Stable errors include `FILE_NOT_FOUND`, `FILE_TOO_LARGE`, `UNSUPPORTED_IMAGE`, `IMAGE_UNREADABLE`, `MISSING_API_KEY`, `NOT_A_ROOM`, `INVALID_AI_RESPONSE`, `RATE_LIMITED`, and `AI_ANALYSIS_FAILED`.

## Evaluation Set

The ten required cases are defined in `evals/room-analysis-cases.json`. Add private, consented, synthetic, or properly licensed images to `evals/images/`; image files are ignored by Git.

```bash
npm run eval:room
```

The runner saves a timestamped report under `evals/results/` and preserves case-specific grounding and privacy checks for manual review.

## Tests

```bash
npm run typecheck
npm test
```

Automated tests mock the OpenAI client, so normal test runs do not make paid API requests.

## Step Documentation

See [`docs/3-local-ai-analysis.md`](docs/3-local-ai-analysis.md) for the full responsibilities, prompt rules, error contract, evaluation cases, technology, completion criteria, and requirement notes.

## Next Step

Step 4 will calculate the final minimum and maximum cleaning-time range with deterministic TypeScript logic using task minutes, room size, cleaning intensity, uncertainty buffers, sensible rounding, and caps on unreasonable totals.
