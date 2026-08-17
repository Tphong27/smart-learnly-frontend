import { z } from "zod";
import { getTodayDateKey } from "@/shared/utils/date";
import { isGoogleMeetUrl } from "@/shared/utils/googleMeetUrl";
import { WEEK_DAY_OPTIONS } from "@/shared/constants/week-days";
import { getClassTimeSlot } from "@/shared/constants/class-time-slots";
import {
  CLASS_STATUSES,
  normalizeClassStatus,
} from "../constants/classLifecycle";

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

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const VALID_WEEK_DAYS = new Set(WEEK_DAY_OPTIONS.map((day) => day.value));

function addIssue(context, path, message) {
  context.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  });
}

function validateScheduleDefinition(value, context) {
  let schedule;

  try {
    schedule = JSON.parse(value);
  } catch {
    addIssue(context, ["scheduleDescription"], "Class schedule is invalid");
    return;
  }

  if (!Array.isArray(schedule) || schedule.length === 0) {
    addIssue(
      context,
      ["scheduleDescription"],
      "Please select at least one class schedule",
    );
    return;
  }

  const configuredDays = new Set();

  for (const day of schedule) {
    if (!VALID_WEEK_DAYS.has(day?.dayOfWeek)) {
      addIssue(
        context,
        ["scheduleDescription"],
        "Class schedule contains an invalid weekday",
      );
      return;
    }

    if (configuredDays.has(day.dayOfWeek)) {
      addIssue(
        context,
        ["scheduleDescription"],
        `Schedule contains duplicate day: ${day.dayOfWeek}`,
      );
      return;
    }

    configuredDays.add(day.dayOfWeek);

    if (!Array.isArray(day.slots) || day.slots.length === 0) {
      addIssue(
        context,
        ["scheduleDescription"],
        "Each selected day must contain at least one time slot",
      );
      return;
    }

    const configuredSlots = new Set();

    for (const slot of day.slots) {
      const startTime = String(slot?.startTime || "");
      const endTime = String(slot?.endTime || "");

      if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
        addIssue(
          context,
          ["scheduleDescription"],
          "Schedule time must use HH:mm format",
        );
        return;
      }

      const classTimeSlot = getClassTimeSlot(startTime, endTime);

      if (!classTimeSlot) {
        addIssue(
          context,
          ["scheduleDescription"],
          `Unsupported class time: ${startTime}–${endTime}`,
        );
        return;
      }

      if (configuredSlots.has(classTimeSlot.code)) {
        addIssue(
          context,
          ["scheduleDescription"],
          `${classTimeSlot.label} is selected more than once on ${day.dayOfWeek}`,
        );
        return;
      }

      configuredSlots.add(classTimeSlot.code);
    }
  }
}

export function createClassFormSchema({
  mode = "create",
  initialData = null,
} = {}) {
  const isEditMode = mode === "edit";
  const currentStatus = normalizeClassStatus(initialData?.status);
  const activeEnrollmentCount = Number(initialData?.activeEnrollmentCount || 0);

  return z
    .object({
      courseId: z
        .string()
        .trim()
        .min(1, "Please select a course")
        .uuid("Invalid course"),

      className: z
        .string()
        .trim()
        .min(3, "Class name must contain between 3 and 255 characters")
        .max(255, "Class name must contain between 3 and 255 characters"),

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
          isGoogleMeetUrl,
          "Use the format https://meet.google.com/abc-defg-hij",
        ),

      scheduleDescription: z
        .string()
        .trim()
        .min(1, "Please select at least one class schedule")
        .max(2000, "Schedule description must not exceed 2000 characters"),

      startDate: createRequiredDateSchema({
        fieldLabel: "start date",
        allowPastDates: isEditMode,
      }),

      endDate: createRequiredDateSchema({
        fieldLabel: "end date",
        allowPastDates: isEditMode,
      }),

      maxStudents: z
        .number({
          error: "Capacity is required and must be a valid number",
        })
        .int("Capacity must be an integer")
        .min(1, "Capacity must be at least 1")
        .max(500, "Capacity must not exceed 500"),

      price: z
        .number({
          required_error: "Class price is required",
          invalid_type_error: "Class price must be a valid number",
        })
        .min(0, "Class price must be greater than or equal to 0")
        .max(9999999999.99, "Class price is too large"),
    })
    .superRefine((data, context) => {
      if (data.endDate <= data.startDate) {
        addIssue(context, ["endDate"], "End date must be after start date");
      }

      if (data.maxStudents < activeEnrollmentCount) {
        addIssue(
          context,
          ["maxStudents"],
          `Capacity cannot be lower than ${activeEnrollmentCount} active trainees`,
        );
      }

      validateScheduleDefinition(data.scheduleDescription, context);

      if (!isEditMode) {
        return;
      }

      if (currentStatus === CLASS_STATUSES.ONGOING) {
        if (data.courseId !== String(initialData?.courseId || "")) {
          addIssue(
            context,
            ["courseId"],
            "Course cannot be changed while the class is ongoing",
          );
        }

        if (
          data.startDate !== String(initialData?.startDate || "").slice(0, 10)
        ) {
          addIssue(
            context,
            ["startDate"],
            "Start date cannot be changed while the class is ongoing",
          );
        }

        if (data.endDate < getTodayDateKey()) {
          addIssue(
            context,
            ["endDate"],
            "End date of an ongoing class cannot be in the past",
          );
        }
      }
    });
}

export const classFormSchema = createClassFormSchema({
  mode: "create",
});

export const classEditFormSchema = createClassFormSchema({
  mode: "edit",
});
