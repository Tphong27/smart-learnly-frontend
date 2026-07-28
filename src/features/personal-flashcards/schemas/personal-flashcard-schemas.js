import { z } from "zod";

const optionalText = z.string().trim();

export const personalFlashcardSetSchema = z.object({
  title: z
    .string({ message: "Set title is required" })
    .trim()
    .min(1, "Set title is required")
    .max(255, "Set title must be at most 255 characters"),
  description: optionalText,
});

export const personalFlashcardCardSchema = z
  .object({
    frontText: optionalText,
    frontImageUrl: optionalText,
    backText: optionalText,
    backImageUrl: optionalText,
    hint: optionalText,
    explanation: optionalText,
  })
  .superRefine((values, context) => {
    if (!values.frontText && !values.frontImageUrl) {
      context.addIssue({
        code: "custom",
        path: ["frontText"],
        message: "Front needs text or an image.",
      });
    }

    if (!values.backText && !values.backImageUrl) {
      context.addIssue({
        code: "custom",
        path: ["backText"],
        message: "Back needs text or an image.",
      });
    }
  });
