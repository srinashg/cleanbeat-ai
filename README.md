# CleanBeat AI

CleanBeat AI is a mobile-first responsive web application that turns a photograph of a messy room into a structured, editable cleaning session. The application analyzes visible room conditions, creates a practical cleaning checklist, calculates a bounded time estimate, and recommends public Spotify playlists suited to the expected effort and session length.

The MVP is designed as a single Next.js application. It uses schema-validated AI output, deterministic application logic, server-side integrations, and local browser persistence rather than accounts or a database.

## MVP User Story

> As a user, I want to upload a photo of a messy room so that I can receive an organized cleaning plan, a realistic time estimate, and music suitable for the cleaning session.

## Core MVP Flow

1. The user uploads exactly one room image.
2. The application validates and previews the image.
3. The user selects room and cleaning preferences.
4. A vision-capable AI model analyzes visible conditions.
5. The model output is validated against a strict Zod contract.
6. TypeScript logic orders tasks and calculates a time range.
7. The application derives a music profile and searches Spotify.
8. The user edits and completes tasks in an interactive checklist.
9. Checklist progress is stored locally in the browser.

## Technology Stack

| Area | Technology |
| --- | --- |
| Language | TypeScript |
| Web framework | Next.js App Router |
| UI | React, Tailwind CSS, shadcn/ui |
| Forms and validation | React Hook Form, Zod |
| AI analysis | OpenAI Responses API and JavaScript SDK |
| Music integration | Spotify Web API |
| Unit testing | Vitest |
| Component testing | React Testing Library |
| End-to-end testing | Playwright |
| Client persistence | `localStorage` |
| Deployment | Vercel |
| Source control and CI | GitHub and GitHub Actions |

## Current Implementation: Room-Analysis Contract

This package contains the Step 2 room-analysis data contract. It defines the raw structured output expected from the AI model before the application calculates final time estimates, orders tasks, or searches Spotify.

The contract requires:

- a supported room type;
- a bounded room-condition label;
- a clutter level from 1 through 10;
- a neutral summary and visible observations;
- at least one cleaning or organizing task;
- assumptions and uncertainty notes;
- a confidence value from 0 through 1; and
- a structured music recommendation with a valid BPM range.

Every model response must pass runtime validation before the application reads or displays it.

## Included Files

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

### `analysis-schema.ts`

Defines the Zod schemas and inferred TypeScript types for room analyses, tasks, room conditions, priorities, categories, and music recommendations.

### `validate-room-analysis.ts`

Provides two validation helpers:

- `validateRoomAnalysis` throws a Zod validation error when output is invalid.
- `safeValidateRoomAnalysis` returns a success-or-failure result without throwing.

### `analysis-schema.test.ts`

Tests that valid output passes and invalid output fails, including missing tasks, empty task lists, invalid clutter levels, invalid confidence values, reversed BPM ranges, out-of-range BPM values, duplicate task IDs, blank required text, and unknown properties.

## Installation

In the CleanBeat AI project, install the runtime and test dependencies:

```bash
npm install zod
npm install --save-dev vitest
```

Add or confirm the following scripts in the project's `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## Run the Tests

```bash
npm run test
```

To run only the room-analysis schema tests:

```bash
npx vitest run tests/lib/ai/analysis-schema.test.ts
```

## Validation Usage

Treat all AI output as untrusted until it passes the schema.

```ts
import {
  safeValidateRoomAnalysis,
  validateRoomAnalysis,
} from "@/lib/ai/validate-room-analysis";

const analysis = validateRoomAnalysis(modelOutput);
```

For an API route that needs a controlled error response:

```ts
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

Do not expose raw Zod issues or full provider errors to users. Detailed validation information may be logged server-side, provided logs contain no uploaded image data or sensitive personal information.

## Architecture Boundaries

The room-analysis schema covers only raw AI output. It intentionally does not define:

- the uploaded image and user-preference request contract;
- the final minimum and maximum cleaning-time estimate;
- deterministic task ordering;
- Spotify playlist search results; or
- the complete `/api/analyze` response.

Those responsibilities belong to separate application layers. Individual task durations may come from the AI, but the final time range must be calculated through deterministic TypeScript logic.

## Privacy and Safety

- Analyze only visible room conditions.
- Do not infer personality, income, health, habits, or other sensitive traits.
- Use neutral, non-judgmental wording.
- Advise users not to upload people or sensitive documents.
- Keep API keys on the server.
- Do not permanently store room photographs in the MVP.
- Do not log raw image contents.
- Validate every AI response before use.
- Do not send Spotify catalog content back into an AI model.

## MVP Non-Goals

The first release does not include user accounts, a database, social features, subscriptions, native mobile applications, object-detection boxes, before-and-after scoring, household collaboration, custom AI-generated music, saved session history, or Spotify playlist creation.

## Known Product Decision

The current room-condition contract includes `abysmal` because it appears in the product requirements. That label conflicts with the product's neutral-language goal and should be replaced with a less judgmental label before the final user interface is released.

## Next Implementation Steps

1. Build a local room-image analysis script using the OpenAI SDK.
2. Request structured model output matching `roomAnalysisSchema`.
3. Validate every response and map failures to `INVALID_AI_RESPONSE`.
4. Create an evaluation image set for normal, low-quality, non-room, and privacy-sensitive cases.
5. Add deterministic time-estimation and task-ordering logic.
6. Build the Next.js upload and results experience.
