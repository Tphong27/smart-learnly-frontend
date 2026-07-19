import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { classFormSchema } from "../utils/classValidator";
import { classService } from "@/services";

function toInputDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function toFormValues(initialData) {
  if (!initialData) {
    return {
      courseId: "",
      className: "",
      trainerId: "",
      scheduleDescription: "",
      startDate: "",
      endDate: "",
      maxStudents: 30,
      price: "",
    };
  }

  return {
    courseId: initialData.courseId || "",
    className: initialData.className || "",
    trainerId: initialData.trainerId || "",
    scheduleDescription: initialData.scheduleDescription || "",
    startDate: toInputDate(initialData.startDate),
    endDate: toInputDate(initialData.endDate),
    maxStudents: Number(initialData.maxStudents ?? 30),
    price:
      initialData.price === null || initialData.price === undefined
        ? ""
        : Number(initialData.price),
  };
}

export function useClassForm(initialData = null, onSuccess = null) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm({
    resolver: zodResolver(classFormSchema),
    defaultValues: toFormValues(initialData),
  });

  useEffect(() => {
    reset(toFormValues(initialData));
  }, [initialData, reset]);

  const onSubmit = useCallback(
    async (formData) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const payload = {
          ...formData,
          trainerId: formData.trainerId || null,
          scheduleDescription: formData.scheduleDescription || null,
          startDate: formData.startDate || null,
          endDate: formData.endDate || null,
          maxStudents: Number(formData.maxStudents),
          price: Number(formData.price),
        };

        if (initialData?.id) {
          await classService.update(initialData.id, payload);
        } else {
          await classService.create(payload);
        }

        onSuccess?.();
      } catch (error) {
        setSubmitError(error.message || "An error occurred");
      } finally {
        setIsSubmitting(false);
      }
    },
    [initialData, onSuccess],
  );

  return {
    register,
    handleSubmit,
    errors,
    reset,
    watch,
    control,
    isSubmitting,
    submitError,
    onSubmit: handleSubmit(onSubmit),
  };
}
