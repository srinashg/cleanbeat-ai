# CleanBeat AI

CleanBeat AI is a planned multimodal, mobile-first responsive web application that converts one or more photographs of the same messy room into a structured, editable cleaning session. The intended MVP will analyze visible clutter, generate a practical cleaning sequence, calculate a realistic cleaning-time range, and recommend suitable public Spotify playlists.

The product is designed to avoid false precision. Cleaning-time estimates will be presented as ranges and accompanied by assumptions, uncertainty, and confidence. Room analysis must be limited to visible conditions and use neutral, non-judgmental language.

## Current Status

This package implements **Step 2: the room-analysis data contract**.

Included in this step:

- a Zod schema for raw AI room-analysis output;
- TypeScript types inferred from the schema;
- validation helpers for untrusted model output; and
- Vitest tests for the contract.

The following MVP features are not implemented in this package yet:

- multi-image upload and validation;
- user preference validation;
- OpenAI API integration and prompt construction;
- deterministic task ordering;
- final minimum and maximum cleaning-time calculation;
- Spotify playlist search;
- the Next.js user interface;
- editable checklist state and `localStorage` persistence; and
- deployment.

## User Story

> As a user, I want to upload photos of a messy room so that I can receive an organized cleaning plan, a realistic time estimate, and music suitable for the cleaning session.

## Planned MVP Inputs

The finalized MVP requirements call for:

- one or more photographs of the same room in JPEG, JPG, PNG, HEIF, or WebP format;
- a room type: bedroom, kitchen, living room, office, bathroom, or other;
- a cleaning intensity: quick reset, standard cleaning, or deep cleaning; and
- optional room size, preferred genres, explicit-content preference, and available cleaning time.

When multiple images are submitted, the interface will ask the user to confirm that they show the same room. Upload validation belongs to a later input contract and is not implemented by the Step 2 files.

## Room-Analysis Contract

The schema defines the raw structured result expected from the AI model after it analyzes one or more photographs of the same room.

A valid result contains:

- a supported room type;
- a room-condition label: `excellent`, `good`, `fair`, `poor`, or `abysmal`;
- a clutter level from 1 through 10;
- a short summary of visible conditions;
- one to fifteen visible observations;
- one to twenty cleaning or organizing tasks;
- assumptions and uncertainty notes;
- a confidence value from 0 through 1; and
- a music recommendation containing energy, mood, genres, and a valid BPM range.

Each task contains a unique ID, title, description, category, estimated active minutes, priority, and visible evidence.

All model output must be treated as untrusted and validated before the application reads, displays, or processes it.

## Scope Boundary

This contract covers only the **raw room analysis returned by the AI model**. It does not define:

- uploaded images or user preferences;
- cleaning intensity, room size, available time, or explicit-content preference;
- deterministic task ordering;
- the final cleaning-time range;
- Spotify playlist results; or
- the complete `/api/analyze` response.

The AI may estimate active minutes for individual tasks. The application will later calculate the final minimum and maximum cleaning time using deterministic TypeScript logic that accounts for room size, cleaning intensity, uncertainty, and sensible rounding.

The AI may also return a generic music profile. Spotify playlist results will be retrieved separately and must not be sent back into an AI model.

## Files

```text
src/
└── lib/
    └── ai/
        ├── analysis-schema.ts
        └── validate-room-analysis.ts

tests/
└── lib/
    └── ai/
        └── analysis-schema.test.ts
```

### `src/lib/ai/analysis-schema.ts`

Defines the Zod schemas and inferred TypeScript types for:

- room types;
- room-condition labels;
- task categories and priorities;
- room tasks;
- music recommendations; and
- the complete raw room-analysis result.

The schema rejects missing required fields, blank required text, unsupported enum values, invalid number ranges, empty required lists, duplicate task IDs, reversed BPM ranges, and unexpected properties.

### `src/lib/ai/validate-room-analysis.ts`

Exports two validation helpers:

- `validateRoomAnalysis(value)` returns a validated `RoomAnalysis` or throws a Zod validation error.
- `safeValidateRoomAnalysis(value)` returns a success-or-failure result without throwing.

### `tests/lib/ai/analysis-schema.test.ts`

Tests that:

- a valid room analysis passes;
- missing or empty tasks fail;
- clutter levels outside 1–10 fail;
- confidence values outside 0–1 fail;
- BPM values outside 50–220 fail;
- reversed BPM ranges fail;
- duplicate task IDs fail;
- blank required text fails; and
- unexpected properties fail.

## Installation

These files are intended to be copied into the main CleanBeat AI Next.js project.

Install the required dependencies:

```bash
npm install zod
npm install --save-dev vitest
```

Add test scripts to `package.json` if they are not already present:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Run the schema tests:

```bash
npm run test -- tests/lib/ai/analysis-schema.test.ts
```

## Validation Usage

Use the throwing helper when the caller already has centralized error handling:

```ts
import { validateRoomAnalysis } from "@/lib/ai/validate-room-analysis";

const analysis = validateRoomAnalysis(modelOutput);
```

Use the non-throwing helper when an API route needs to return a controlled error:

```ts
import { safeValidateRoomAnalysis } from "@/lib/ai/validate-room-analysis";

const result = safeValidateRoomAnalysis(modelOutput);

if (!result.success) {
  return Response.json(
    {
      error: {
        code: "INVALID_AI_RESPONSE",
        message: "The room analysis returned an invalid response.",
      },
    },
    { status: 502 },
  );
}

const analysis = result.data;
```

Raw Zod issues, provider errors, room images, and sensitive personal information should not be exposed to users or written to ordinary application logs.

## Planned MVP Stack

The finalized product requirements specify a single Next.js App Router application using:

- TypeScript;
- Next.js App Router and React;
- Tailwind CSS and shadcn/ui;
- React Hook Form and Zod;
- OpenAI Responses API / JavaScript SDK;
- TypeScript pure functions for cleaning logic;
- Spotify Web API;
- browser `localStorage`;
- Vitest, React Testing Library, and Playwright;
- Vercel; and
- GitHub with GitHub Actions.

This list describes the intended MVP architecture, not features already implemented by this Step 2 package.

## Privacy and Product Constraints

The MVP must:

- accept one or more photographs of the same room;
- validate image type, size, readability, and minimum usable dimensions;
- reject unsupported, corrupted, non-room, extremely dark, or unusably blurry images;
- warn users not to upload people or sensitive personal information;
- analyze only visible conditions;
- avoid unsupported claims about the user;
- keep API keys on the server;
- discard room images after processing rather than permanently storing them;
- schema-validate all AI output before use; and
- keep Spotify data out of AI model inputs.

The MVP does not include user accounts, a database, social features, household collaboration, subscriptions, custom AI-generated music, object-detection boxes, before-and-after scoring, gamification, native mobile applications, saved session history, or Spotify playlist creation.

## Next Step

The next implementation step is a local room-analysis script that reads one or more local images of the same room, sends them to a vision-capable model, requests structured output, validates the result with `roomAnalysisSchema`, and returns a useful error when the model output is invalid.
