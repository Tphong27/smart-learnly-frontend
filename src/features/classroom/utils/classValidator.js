import { z } from "zod";

function optionalUuid(message) {
  return z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => {
        if (!value) return true;
        return z.string().uuid().safeParse(value).success;
      },
      { message },
    );
}

export function todayString() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function isNotPastDate(value) {
  if (!value) return true;
  return value >= todayString();
}

export const classFormSchema = z
  .object({
    courseId: z
      .string()
      .uuid("Invalid course")
      .min(1, "Please select a course"),

    className: z
      .string()
      .min(3, "Class name must be at least 3 characters")
      .max(255, "Class name must not exceed 255 characters")
      .trim(),

    trainerId: optionalUuid("Invalid trainer ID"),

    scheduleDescription: z
      .string()
      .max(2000, "Schedule description must not exceed 2000 characters")
      .optional()
      .or(z.literal("")),

    startDate: z
      .string()
      .min(1, "Vui lòng chọn ngày bắt đầu")
      .refine((value) => isNotPastDate(value), {
        message: "Ngày bắt đầu không được là ngày trong quá khứ",
      }),

    endDate: z
      .string()
      .min(1, "Vui lòng chọn ngày kết thúc")
      .refine((value) => isNotPastDate(value), {
        message: "Ngày kết thúc không được là ngày trong quá khứ",
      }),

    maxStudents: z
      .number()
      .min(1, "Maximum students must be at least 1")
      .max(500, "Maximum students must not exceed 500")
      .int("Maximum students must be an integer"),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;

      const start = new Date(data.startDate);
      const end = new Date(data.endDate);

      return end >= start;
    },
    {
      message: "End date cannot be before start date",
      path: ["endDate"],
    },
  );

export function validateClassForm(data) {
  return classFormSchema.parse(data);
}
