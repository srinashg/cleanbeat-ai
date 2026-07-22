import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const roomTypeSchema = z.enum([
  "bedroom",
  "kitchen",
  "living_room",
  "office",
  "bathroom",
  "other",
]);

export const roomConditionSchema = z.enum([
  "excellent",
  "good",
  "fair",
  "poor",
  "abysmal",
]);

export const taskCategorySchema = z.enum([
  "trash",
  "laundry",
  "dishes",
  "organizing",
  "surface_cleaning",
  "floor_cleaning",
  "other",
]);

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const roomTaskSchema = z
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

export const recommendedMusicSchema = z
  .object({
    energy: z.enum(["low", "medium", "high"]),
    mood: nonEmptyString.max(100),
    genres: z.array(nonEmptyString.max(50)).min(1).max(5),
    targetBpmMin: z.number().int().min(50).max(220),
    targetBpmMax: z.number().int().min(50).max(220),
  })
  .strict()
  .refine((music) => music.targetBpmMin <= music.targetBpmMax, {
    message: "targetBpmMin must be less than or equal to targetBpmMax",
    path: ["targetBpmMax"],
  });

export const roomAnalysisSchema = z
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
  .superRefine((analysis, context) => {
    const taskIds = new Set<string>();

    analysis.tasks.forEach((task, index) => {
      if (taskIds.has(task.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Task IDs must be unique",
          path: ["tasks", index, "id"],
        });
      }

      taskIds.add(task.id);
    });
  });

export type RoomType = z.infer<typeof roomTypeSchema>;
export type RoomCondition = z.infer<typeof roomConditionSchema>;
export type TaskCategory = z.infer<typeof taskCategorySchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type RoomTask = z.infer<typeof roomTaskSchema>;
export type RecommendedMusic = z.infer<typeof recommendedMusicSchema>;
export type RoomAnalysis = z.infer<typeof roomAnalysisSchema>;
