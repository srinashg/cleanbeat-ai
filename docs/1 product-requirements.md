# CleanBeat AI — MVP Product Requirements

## Product Summary

CleanBeat AI is a multimodal mobile-first responsive web application that converts photographs of a messy room into a structured, editable cleaning session. The MVP must analyze visible clutter, generate a practical task sequence, estimate a realistic cleaning-time range, and recommend suitable Spotify playlists.

The product must avoid false precision. Estimates must be presented as ranges and accompanied by assumptions, uncertainty, and a confidence level. The application must only assess visible conditions and must use neutral, non-judgmental language.

## User Story

**As a user, I want to upload photos of a messy room so that I can receive an organized cleaning plan, a realistic time estimate, and music suitable for the cleaning session.**

## Required Inputs

### Core inputs

- 1+ photos of a room.  
- Supported formats: JPEG, JPG, PNG, HEIF, or WebP.  
- Room type:  
  - Bedroom  
  - Kitchen  
  - Living room  
  - Office  
  - Bathroom  
  - Other  
- Cleaning intensity:  
  - Quick reset  
  - Standard cleaning  
  - Deep cleaning

### Optional inputs

- Room size:  
  - Small  
  - Medium  
  - Large  
- Preferred music genres.  
- Explicit-content preference.  
- Available cleaning time.

### Input validation and privacy

- Validate file type, file size, image readability, minimum usable dimensions, and that multiple images of the same room are submitted. A confirmation popup will prompt confirming that the images are of the same room before submitting them.  
- Reject unsupported, corrupted, non-room, extremely dark, or unusably blurry images with a clear error.  
- Show a privacy notice advising users not to upload images containing people or sensitive personal information.  
- Do not permanently store uploaded room images in the MVP; discard them after processing.

## Required Outputs

### Room analysis

- Room type.  
- Neutral room-condition summary. List condition as excellent, good, fair, poor, or abysmal  
- Clutter level on a bounded scale.  
- Visible conditions or observations.  
- Confidence level.  
- Assumptions and uncertainty notes.

### Cleaning plan

- Structured list of visible cleaning and organizing tasks.  
- For each task:  
  - Title  
  - Short description or reason  
  - Category  
  - Priority  
  - Estimated active minutes  
  - Visible evidence  
- Tasks ordered into a practical sequence, generally prioritizing hazards, trash, dishes, laundry, organizing, surface cleaning, and floor cleaning.  
- Editable checklist that allows users to:  
  - Check off tasks  
  - Edit tasks  
  - Delete tasks  
  - Reset progress  
- Local browser persistence for checklist state.  
- Optional focus mode showing one task at a time with timer, pause, skip, and completion controls.

### Time estimate

- Minimum and maximum total cleaning time.  
- Estimate calculated from task durations using deterministic application logic.  
- Adjustments for room size and cleaning intensity.  
- Uncertainty buffer and sensible rounding.  
- Visible explanation that actual time depends on pace, hidden clutter, and conditions not visible in the images.

### Music recommendation

- Session length.  
- Energy level.  
- Mood.  
- Recommended genres.  
- Target BPM range.  
- Three to five matching public Spotify playlist suggestions.  
- Each playlist result should include name, owner, cover art when available, Spotify link, and a short relevance explanation.

### Errors and loading states

- Clear progress states during upload, analysis, task generation, time estimation, and playlist search.  
- Retry, cancel, or reset controls.  
- Predictable errors for invalid requests, unsupported images, unreadable files, non-room images, AI failures, invalid AI responses, rate limits, and internal failures.

## Technology Used

| Area | Technology | MVP Purpose |
| :---- | :---- | :---- |
| Language | TypeScript | Shared frontend and backend type safety |
| Web framework | Next.js App Router | UI, server-side logic, and API routes in one application |
| UI | React, Tailwind CSS, shadcn/ui | Responsive upload, results, checklist, and progress interfaces |
| Forms and validation | React Hook Form, Zod | Validate preferences, API requests, and AI responses |
| AI analysis | OpenAI Responses API / JavaScript SDK | Analyze the uploaded room image and return structured data |
| Cleaning logic | TypeScript pure functions | Deterministic task ordering, time estimation, and music-profile mapping |
| Music integration | Spotify Web API | Search existing public playlists using server-side authorization |
| Client persistence | localStorage | Preserve checklist and session progress without accounts or a database |
| Testing | Vitest, React Testing Library, Playwright | Unit, component, API integration, and end-to-end testing |
| Deployment | Vercel | Public hosting, server-side execution, environment variables, and logs |
| Source control and CI | GitHub, GitHub Actions | Repository management, documentation, linting, type checks, tests, and builds |

## MVP Constraints and Non-Goals

The MVP must remain a single Next.js application with server-side API routes. API keys must never be exposed to the browser. AI output must be schema-validated before use, and Spotify data must not be sent back into an AI model.

The MVP does **not** include user accounts, databases, social features, household collaboration, subscriptions, custom AI-generated music, object-detection boxes, before-and-after scoring, gamification, native mobile apps, saved session history, or Spotify playlist creation.

## Completion Criteria

The MVP is complete when a user can upload one or more valid room images (of the same room), provide basic preferences, receive a validated room analysis, view an ordered and editable cleaning checklist, see a bounded time estimate with assumptions, receive Spotify playlist suggestions, complete tasks with locally saved progress, recover from common failures, and use the application through a publicly deployed URL.  
