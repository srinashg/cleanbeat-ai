# Tab 1

# CleanBeat AI — Room-Analysis Data Contract

## Purpose

Before CleanBeat AI calls a vision-capable AI model, the application must define and validate the exact structure expected from the model.

This contract covers the **raw room analysis returned by the AI model**. It does not cover:

- uploaded image or preference inputs;  
- the final minimum and maximum cleaning-time estimate;  
- deterministic task ordering;  
- Spotify playlist search results; or  
- the complete `/api/analyze` response.

Those values are validated or produced by later application layers. The AI may estimate active minutes for individual tasks, but the application will calculate the final cleaning-time range using deterministic TypeScript logic.

## Contract Requirements

The model response must contain:

- a supported room type;  
- a bounded room-condition label;  
- a clutter level from 1 through 10;  
- a neutral summary of visible conditions;  
- visible observations;  
- at least one cleaning or organizing task;  
- assumptions and uncertainty notes;  
- a confidence value from 0 through 1; and  
- a structured music recommendation with a valid BPM range.

The response must describe only visible evidence, use neutral and non-judgmental language, and avoid unsupported claims about the user or anything outside the image.

## TypeScript and Zod Schema

Suggested implementation file:

src/lib/ai/analysis-schema.ts

import { z } from "zod";

const nonEmptyString \= z.string().trim().min(1);

export const roomTypeSchema \= z.enum(\[  
  "bedroom",  
  "kitchen",  
  "living\_room",  
  "office",  
  "bathroom",  
  "other",  
\]);

export const roomConditionSchema \= z.enum(\[  
  "excellent",  
  "good",  
  "fair",  
  "poor",  
  "abysmal",  
\]);

export const taskCategorySchema \= z.enum(\[  
  "trash",  
  "laundry",  
  "dishes",  
  "organizing",  
  "surface\_cleaning",  
  "floor\_cleaning",  
  "other",  
\]);

export const taskPrioritySchema \= z.enum(\["low", "medium", "high"\]);

export const roomTaskSchema \= z  
  .object({  
    id: nonEmptyString.max(100),  
    title: nonEmptyString.max(120),  
    description: nonEmptyString.max(500),  
    category: taskCategorySchema,  
    estimatedMinutes: z.number().int().min(1).max(120),  
    priority: taskPrioritySchema,  
    evidence: nonEmptyString.max(500),  
  })  
  .strict();

export const recommendedMusicSchema \= z  
  .object({  
    energy: z.enum(\["low", "medium", "high"\]),  
    mood: nonEmptyString.max(100),  
    genres: z.array(nonEmptyString.max(50)).min(1).max(5),  
    targetBpmMin: z.number().int().min(50).max(220),  
    targetBpmMax: z.number().int().min(50).max(220),  
  })  
  .strict()

  .refine((music) \=\> music.targetBpmMin \<= music.targetBpmMax, {  
    message: "targetBpmMin must be less than or equal to targetBpmMax",  
    path: \["targetBpmMax"\],  
  });

export const roomAnalysisSchema \= z  
  .object({  
    roomType: roomTypeSchema,  
    roomCondition: roomConditionSchema,  
    clutterLevel: z.number().int().min(1).max(10),  
    summary: nonEmptyString.max(500),  
    visibleConditions: z.array(nonEmptyString.max(250)).min(1).max(15),  
    tasks: z.array(roomTaskSchema).min(1).max(20),  
    assumptions: z.array(nonEmptyString.max(250)).max(10),  
    uncertaintyNotes: z.array(nonEmptyString.max(250)).max(10),  
    confidence: z.number().min(0).max(1),  
    recommendedMusic: recommendedMusicSchema,  
  })  
  .strict()

  .superRefine((analysis, context) \=\> {  
    const taskIds \= new Set\<string\>();  
    analysis.tasks.forEach((task, index) \=\> {  
      if (taskIds.has(task.id)) {

        context.addIssue({  
          code: z.ZodIssueCode.custom,  
          message: "Task IDs must be unique",  
          path: \["tasks", index, "id"\],  
        });  
      }

      taskIds.add(task.id);

    });

  });

export type RoomType \= z.infer\<typeof roomTypeSchema\>;

export type RoomCondition \= z.infer\<typeof roomConditionSchema\>;

export type RoomTask \= z.infer\<typeof roomTaskSchema\>;

export type RecommendedMusic \= z.infer\<typeof recommendedMusicSchema\>;

export type RoomAnalysis \= z.infer\<typeof roomAnalysisSchema\>;

## Validation Usage

All model output must be validated before the application reads or displays it.

import {  
  roomAnalysisSchema,  
  type RoomAnalysis,  
} from "@/lib/ai/analysis-schema";

export function validateRoomAnalysis(value: unknown): RoomAnalysis {

  return roomAnalysisSchema.parse(value);

}

For an API route that needs to convert validation failures into a controlled error response, use `safeParse`:

const result \= roomAnalysisSchema.safeParse(modelOutput);

if (\!result.success) {

  return Response.json(

    {  
      error: {  
        code: "INVALID\_AI\_RESPONSE",  
        message: "The room analysis returned an invalid response.",  
      },  
    },  
    { status: 502 },  
  );

}

const analysis: RoomAnalysis \= result.data;

## Vitest Tests

Suggested test file:

tests/lib/ai/analysis-schema.test.ts

import { describe, expect, it } from "vitest";

import {  
  roomAnalysisSchema,  
  type RoomAnalysis,  
} from "../../../src/lib/ai/analysis-schema";

const validRoomAnalysis: RoomAnalysis \= {  
  roomType: "bedroom",  
  roomCondition: "fair",  
  clutterLevel: 6,  
  summary:  
    "Clothing and loose objects are visible on part of the floor and desk.",

  visibleConditions: \[  
    "Clothing is visible on the floor.",  
    "Loose objects are visible on the desk.",  
  \],

  tasks: \[  
    {  
      id: "collect-floor-clothing",  
      title: "Collect clothing from the floor",  
      description: "Move visible clothing into a laundry basket or storage area.",  
      category: "laundry",  
      estimatedMinutes: 8,  
      priority: "high",  
      evidence: "Several clothing items are visible on the floor.",  
    },  
  \],

  assumptions: \["One person is completing the cleaning session."\],  
  uncertaintyNotes: \["Hidden clutter cannot be evaluated from the image."\],  
  confidence: 0.82,

  recommendedMusic: {  
    energy: "medium",  
    mood: "upbeat and focused",  
    genres: \["pop", "dance"\],  
    targetBpmMin: 110,  
    targetBpmMax: 130,  
  },

};

describe("roomAnalysisSchema", () \=\> {

  it("accepts a valid room analysis", () \=\> {  
    const result \= roomAnalysisSchema.safeParse(validRoomAnalysis);  
    expect(result.success).toBe(true);  
  });

  it("rejects an analysis with missing tasks", () \=\> {  
    const { tasks: \_tasks, ...analysisWithoutTasks } \= validRoomAnalysis;  
    const result \= roomAnalysisSchema.safeParse(analysisWithoutTasks);  
    expect(result.success).toBe(false);  
  });

  it("rejects an empty task list", () \=\> {  
    const result \= roomAnalysisSchema.safeParse({  
      ...validRoomAnalysis,  
      tasks: \[\],  
    });

    expect(result.success).toBe(false);

  });

  it.each(\[0, 11\])("rejects clutter level %s", (clutterLevel) \=\> {  
    const result \= roomAnalysisSchema.safeParse({  
      ...validRoomAnalysis,  
      clutterLevel,  
    });

    expect(result.success).toBe(false);

  });

  it.each(\[-0.01, 1.01\])("rejects confidence value %s", (confidence) \=\> {  
    const result \= roomAnalysisSchema.safeParse({  
      ...validRoomAnalysis,  
      confidence,  
    });

    expect(result.success).toBe(false);

  });

  it("rejects a reversed BPM range", () \=\> {  
    const result \= roomAnalysisSchema.safeParse({  
      ...validRoomAnalysis,

      recommendedMusic: {  
        ...validRoomAnalysis.recommendedMusic,  
        targetBpmMin: 150,  
        targetBpmMax: 100,  
      },  
    });

    expect(result.success).toBe(false);

  });

  it.each(\[49, 221\])("rejects out-of-range BPM value %s", (targetBpmMin) \=\> {  
    const result \= roomAnalysisSchema.safeParse({  
      ...validRoomAnalysis,

      recommendedMusic: {  
        ...validRoomAnalysis.recommendedMusic,  
        targetBpmMin,  
      },  
    });

    expect(result.success).toBe(false);

  });

});

## Why This Comes First

Without a strict schema, the AI may return differently formatted prose or omit required fields on different requests. That would cause brittle parsing, unpredictable UI behavior, and unsafe assumptions elsewhere in the application.

TypeScript alone is insufficient because model responses arrive as untrusted runtime data. Zod provides runtime validation, while `z.infer` creates matching TypeScript types from the same source of truth.

The supplied baseline schema has been tightened in this contract so that the stated tests are meaningful:

- `tasks` is required and must contain at least one task;  
- user-facing strings cannot be empty;  
- task IDs must be unique;  
- unknown properties are rejected;  
- BPM values must remain within 50–220; and  
- the minimum BPM cannot exceed the maximum BPM.

## Technology Used

- TypeScript  
- Zod  
- Vitest

## Completion Criteria

Step 2 is complete when:

1. the Zod schema is implemented in the application;  
2. the `RoomAnalysis` TypeScript type is inferred from that schema;  
3. AI output is validated before use;  
4. the required Vitest cases pass; and  
5. invalid model output can be mapped to the stable `INVALID_AI_RESPONSE` application error.

## Requirement Note

The product requirements describe CleanBeat AI as accepting exactly one room photograph, but the input-validation section also refers to submitting multiple images of the same room. This contract does not resolve that contradiction because it defines AI output rather than upload input. The upload contract should settle on one behavior before implementation; the current MVP summary and completion criteria support exactly one image.

The `abysmal` room-condition label is included because it appears in the product requirements. It conflicts somewhat with the requirement for neutral, non-judgmental language and should be reconsidered before the UI is finalized.

# Explanation 1

## TypeScript and Zod Schema

At a high level, this schema is a **rulebook for what a valid room-analysis result must look like**.

The AI is allowed to analyze a room, but the application does not blindly trust whatever it returns. This schema checks that the answer is complete, sensible, and consistently formatted before the app uses it.

### **The big picture**

Imagine the AI returns a form after looking at a room photo. This schema defines:

* which questions must be answered  
* which answer choices are allowed  
* how long answers can be  
* what number ranges are acceptable  
* which mistakes should cause the result to be rejected

For example, the AI must return:

* the type of room  
* the room’s overall condition  
* a clutter score from 1 to 10  
* a short summary  
* visible observations  
* at least one cleaning task  
* assumptions and uncertainties  
* a confidence score  
* a music recommendation

### **It limits the AI to approved answers**

Some fields only accept specific choices.

For room type, the AI must choose one of:

* bedroom  
* kitchen  
* living room  
* office  
* bathroom  
* other

It cannot invent a value such as `"guest_space"` or `"messy_room"`.

The same applies to room condition, task categories, task priority, and music energy.

This keeps the rest of the application predictable. The interface always knows what kinds of values it may receive.

### **It checks that text is useful**

The reusable `nonEmptyString` rule means important text cannot be blank or contain only spaces.

So a task cannot have:

* an empty title  
* an empty explanation  
* missing visual evidence

The schema also sets length limits so the AI cannot return excessively long paragraphs where the interface expects short descriptions.

### **It checks that numbers are reasonable**

The schema requires:

* clutter level to be between 1 and 10  
* task estimates to be between 1 and 120 minutes  
* confidence to be between 0 and 1  
* music BPM values to be between 50 and 220

It also checks that the minimum BPM is not greater than the maximum BPM.

For example, this would be rejected:

Minimum BPM: 160  
Maximum BPM: 110

Even though both numbers individually fall within the allowed range, the range itself makes no sense.

### **It defines each cleaning task**

Every task must include:

* a unique ID  
* a title  
* a description  
* a category  
* an estimated duration  
* a priority  
* visible evidence explaining why the task was suggested

This prevents the AI from returning vague tasks such as “Clean everything” without explaining what it actually saw.

### **It prevents duplicate task IDs**

Each task needs a unique identifier so the app can reliably edit, delete, reorder, or mark that task complete.

The final part of the schema checks for duplicate IDs and rejects the result when two tasks use the same one.

Without this check, the interface could accidentally update the wrong task.

### **It rejects unexpected information**

The `.strict()` rules mean the AI must return only the fields the application expects.

For example, if the AI adds unrelated fields such as:

userPersonality  
estimatedIncome  
cleanlinessScore

the result will be rejected.

This is useful for both reliability and privacy. It discourages the model from producing unsupported or inappropriate personal judgments.

### **It creates TypeScript types automatically**

The final lines create TypeScript types from the same validation rules.

That means the application does not need to maintain:

1. one set of runtime validation rules, and  
2. a separate set of TypeScript definitions

Both come from the same source.

### **In one sentence**

This schema acts like a **quality-control checkpoint between the AI and the rest of CleanBeat AI**: the AI can produce the analysis, but the application only accepts it when it follows the required structure and passes all the safety and consistency checks.

# Explanation 2

## Validation Usage

This code is not defining the schema itself. It is showing **how the application uses the schema to check the AI’s response**.

The big picture is:

> The AI produces an answer, this validation code inspects it, and the application only continues when the answer follows the required room-analysis format.

Think of the schema as an official form and this code as the employee checking whether the form was filled out correctly.

### **`parse`: accept it or stop**

return roomAnalysisSchema.parse(value);

This checks the supplied value against all the room-analysis rules.

When the response is valid, it returns a cleaned and trusted `RoomAnalysis` object.

When the response is invalid, it throws an error and immediately stops that operation.

This version is useful when another part of the application is already responsible for handling errors.

### **Why the input is `unknown`**

value: unknown

The application treats incoming AI output as untrusted.

Even though the application asked the AI to return a particular format, the model could still:

* omit a required field  
* return an invalid clutter level  
* use an unsupported task category  
* produce text instead of a number  
* return malformed data

Calling it `unknown` means:

> “We have received something, but we will not assume it is valid until it passes inspection.”

### **`safeParse`: check without crashing**

const result \= roomAnalysisSchema.safeParse(modelOutput);

`safeParse` performs the same validation, but instead of throwing an error, it returns a result saying either:

* validation succeeded, or  
* validation failed

This lets the API respond in a controlled way.

When validation fails, the user receives:

{  
  "error": {  
    "code": "INVALID\_AI\_RESPONSE",  
    "message": "The room analysis returned an invalid response."  
  }  
}

The application also returns status `502`, which communicates that the application received a bad response from an outside service—in this case, the AI model.

### **When validation succeeds**

const analysis: RoomAnalysis \= result.data;

At this point, the application knows the result passed every schema rule.

It can safely:

* display the room summary  
* show the clutter level  
* build the cleaning checklist  
* read the task estimates  
* use the music recommendation

Before validation, the model output is untrusted. After validation, `result.data` is the approved room analysis.

### **Why this matters**

Without this validation step, the interface might try to display data that is missing, incorrectly formatted, or nonsensical. That could cause broken pages, incorrect recommendations, or application errors.

In plain terms, this code is the **security and quality-control gate between the AI and the user interface**. The AI is allowed to submit an answer, but it is not allowed into the rest of the application until that answer passes inspection.

# Explanation 3

## Vitest Tests

This code is not the schema itself. It is a set of **automated tests that check whether the schema works correctly**.

The big picture is:

> The schema defines the rules, and these tests verify that the rules are actually enforced.

Think of the schema as an airport security policy and the tests as practice scenarios:

* one normal passenger should pass  
* someone missing required documents should fail  
* someone carrying something outside the allowed limits should fail

### **What the valid example does**

`validRoomAnalysis` is a complete sample result that follows all the rules.

It includes:

* a valid room type  
* a valid room condition  
* a clutter score within the allowed range  
* visible observations  
* at least one cleaning task  
* assumptions and uncertainty notes  
* a confidence score  
* a valid music recommendation

The first test confirms that this correct example is accepted.

### **What the failure tests do**

The remaining tests intentionally damage one part of the sample and check that the schema rejects it.

They verify that:

* the entire `tasks` field cannot be missing  
* the task list cannot be empty  
* clutter levels below 1 or above 10 are rejected  
* confidence values below 0 or above 1 are rejected  
* the minimum BPM cannot be higher than the maximum BPM  
* BPM values below 50 or above 220 are rejected

### **Why some tests use multiple values**

This part:

it.each(\[0, 11\])

runs the same test twice:

* once with `0`  
* once with `11`

Both values should fail because clutter level must remain between 1 and 10\.

The same approach is used for invalid confidence and BPM values.

### **Why the original object is copied**

Code like this:

{  
  ...validRoomAnalysis,  
  clutterLevel,  
}

creates a copy of the valid example and changes only one field.

That is important because it proves the failure is caused by the specific value being tested, rather than by several unrelated mistakes.

### **What `safeParse` is doing**

Each test passes a sample result through the schema using `safeParse`.

The test then checks:

expect(result.success).toBe(false);

or:

expect(result.success).toBe(true);

In plain language, that means:

* “This example should be accepted.”  
* “This example should be rejected.”

### **Why these tests matter**

Without automated tests, someone could accidentally weaken or break the schema later.

For example, a developer might remove the minimum task requirement or change the confidence range without realizing it. These tests would fail immediately and expose the mistake.

So, in one sentence:

> These Vitest tests act as a safety net that proves the room-analysis validation rules behave the way the application expects.