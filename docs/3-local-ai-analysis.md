# CleanBeat AI — Local AI-Analysis Script

## Purpose

Step 3 proves the multimodal room-analysis workflow before a polished website is built. The implementation reads one local room photograph, normalizes it into an API-compatible image input, sends it to the OpenAI Responses API, requests structured output, validates the result with Zod, prints formatted JSON, and saves the validated analysis for inspection.

This step reuses the Step 2 `roomAnalysisSchema`. It does not implement the Next.js interface, final cleaning-time calculation, task ordering, Spotify search, user accounts, or image storage.

## User Story

**As a developer, I want to analyze a local room photograph from the command line so that I can verify the AI prompt, structured output, validation, and failure behavior before building the web interface.**

## Required Input

- One local JPEG, JPG, PNG, WebP, HEIF, or HEIC room photograph.
- `OPENAI_API_KEY` in the local environment.
- Optional `OPENAI_MODEL`; the script defaults to `gpt-5-mini`.
- Optional output path and model override.

The image is read into memory, decoded with Sharp, auto-rotated, resized within 2048 × 2048 pixels without enlargement, flattened, converted to JPEG, and passed as a base64 data URL. The original image is not copied or permanently stored.

## Required Output

On success, the script receives a structured result, validates the response envelope, validates the nested analysis with `roomAnalysisSchema`, prints formatted JSON, and saves the same JSON locally. On failure, it prints a stable error instead of broken or partial JSON.

## Prompt Responsibilities

The prompt requires the model to use only visible evidence; avoid identifying people; avoid sensitive personal inferences; separate observations from assumptions; recommend tasks rather than judge the user; use neutral language; estimate each task independently; flag uncertainty; return `not_a_room` for unrelated images, screenshots, or memes; and return `unusable_image` when darkness, blur, or obstruction prevents grounded analysis.

A room containing a person is not automatically rejected. The model must ignore identifying and sensitive details, analyze only the room, and note that people-related details were excluded.

## Structured Result Envelope

The model returns `status`, `message`, and `analysis`. Status is `success`, `not_a_room`, or `unusable_image`. A successful result contains a valid `RoomAnalysis`; other statuses require `analysis: null`.

The envelope is necessary because the Step 2 schema requires at least one task. Forcing a non-room image into that schema would encourage fabricated tasks.

## Error Codes

- `FILE_NOT_FOUND`
- `FILE_TOO_LARGE`
- `UNSUPPORTED_IMAGE`
- `IMAGE_UNREADABLE`
- `MISSING_API_KEY`
- `NOT_A_ROOM`
- `INVALID_AI_RESPONSE`
- `RATE_LIMITED`
- `AI_ANALYSIS_FAILED`

Raw photographs, base64 contents, API keys, and raw provider errors are not printed.

## Usage

```bash
npm install
cp .env.example .env
npm run analyze:room -- ./evals/images/clean-bedroom.jpg
```

Optional output and model:

```bash
npm run analyze:room -- ./room.heic \
  --output ./artifacts/room-analysis.json \
  --model gpt-5-mini
```

## Evaluation Set

`evals/room-analysis-cases.json` defines ten cases: clean, slightly cluttered, and heavily cluttered bedrooms; kitchen with dishes; office with papers; low-light room; blurry room; room containing a person; non-room image; and screenshot or meme.

The photos are intentionally not committed because room photographs can contain private information and arbitrary web images introduce licensing problems. Add private, consented, synthetic, or properly licensed fixtures under `evals/images/`, then run:

```bash
npm run eval:room
```

The runner saves a timestamped report under `evals/results/`, verifies the expected success or controlled-rejection outcome, records schema-backed metrics, and keeps the case-specific checks for manual review. Exact output equality is inappropriate because model responses are probabilistic.

## Testing

```bash
npm run typecheck
npm test
```

The tests mock OpenAI and do not make paid live API calls.

## Technology Used

- Node.js
- TypeScript
- OpenAI JavaScript SDK and Responses API
- Zod
- Sharp
- dotenv
- Vitest
- local image fixtures

## Completion Criteria

Step 3 is complete when the CLI can normalize a supported image; the request uses image input and structured output; the prompt applies the required grounding, safety, privacy, and uncertainty rules; successful output passes both schemas; JSON is printed and saved; common invalid inputs and provider failures produce stable errors; and the ten-case evaluation manifest and runner are ready for privacy-conscious local fixtures.

## Requirement Notes

The Step 3 direction says to return a range rather than false precision, while the Step 2 contract contains one `estimatedMinutes` value per task and reserves the final minimum and maximum range for deterministic logic. This implementation preserves the Step 2 contract: each task gets a coarse independent estimate, and the user-facing range remains Step 4.

The existing `abysmal` room-condition enum is retained for contract compatibility even though it conflicts with the neutral-language goal. It should be reconsidered before the final interface is built.
