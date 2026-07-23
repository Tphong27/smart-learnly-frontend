import { z } from "zod";
import { getTodayDateKey } from "@/shared/utils/date";
import { isGoogleMeetUrl } from "@/shared/utils/googleMeetUrl";

function isNotPastDate(value) {
  if (!value) {
    return true;
  }

  return value >= getTodayDateKey();
}

function createRequiredDateSchema({ fieldLabel, allowPastDates }) {
  return z
    .string()
    .min(1, `Please select ${fieldLabel}`)
    .refine(
      (value) => allowPastDates || isNotPastDate(value),
      `${fieldLabel} must not be in the past`,
    );
}

function buildClassFormSchema({
  allowPastDates = false,
  requireStatus = false,
} = {}) {
  const statusSchema = requireStatus
    ? z.string().trim().min(1, "Class status is required")
    : z.string().trim().optional();

  return z
    .object({
      courseId: z
        .string()
        .min(1, "Please select a course")
        .uuid("Invalid course"),

      className: z
        .string()
        .trim()
        .min(3, "Class name must be at least 3 characters")
        .max(255, "Class name must not exceed 255 characters"),

      trainerId: z
        .string()
        .trim()
        .min(1, "Please select a trainer")
        .uuid("Invalid trainer ID"),

      meetingUrl: z
        .string()
        .trim()
        .min(1, "Google Meet URL is required")
        .max(255, "Google Meet URL must not exceed 255 characters")
        .refine(
          (value) => isGoogleMeetUrl(value),
          "Use the format https://meet.google.com/abc-defg-hij",
        ),

      scheduleDescription: z
        .string()
        .min(1, "Please select at least one class schedule")
        .max(2000, "Schedule description must not exceed 2000 characters"),

      startDate: createRequiredDateSchema({
        fieldLabel: "start date",
        allowPastDates,
      }),

      endDate: createRequiredDateSchema({
        fieldLabel: "end date",
        allowPastDates,
      }),

      maxStudents: z
        .number({
          invalid_type_error: "Capacity must be a valid number",
        })
        .int("Capacity must be an integer")
        .min(1, "Capacity must be at least 1")
        .max(500, "Capacity must not exceed 500"),

      price: z
        .number({
          required_error: "Class price is required",
          invalid_type_error: "Class price must be a valid number",
        })
        .min(0, "Class price must be greater than or equal to 0"),

      status: statusSchema,
    })
    .refine(
      (data) => {
        if (!data.startDate || !data.endDate) {
          return true;
        }

        return new Date(data.endDate) >= new Date(data.startDate);
      },
      {
        message: "End date cannot be before start date",
        path: ["endDate"],
      },
    );
}

export const classFormSchema = buildClassFormSchema();

export const classEditFormSchema = buildClassFormSchema({
  allowPastDates: true,
  requireStatus: true,
});

export function validateClassForm(data) {
  return classFormSchema.parse(data);
}