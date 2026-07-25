import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClassFormSchema } from "../utils/classValidator";
import {
  toClassFormValues,
  toCreateClassPayload,
  toUpdateClassPayload,
} from "../utils/classFormMapper";
import { classService } from "@/services";

export function useClassForm({
  mode = "create",
  initialData = null,
  onSuccess = null,
} = {}) {
  const isEditMode = mode === "edit";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const validationSchema = useMemo(
    () =>
      createClassFormSchema({
        mode,
        initialData,
      }),
    [initialData, mode],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
    setValue,
    setError,
  } = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: toClassFormValues(initialData),
  });

  const submitForm = useCallback(
    async (formData) => {
      setIsSubmitting(true);
      setSubmitError(null);

      let savedClass;

      try {
        if (isEditMode) {
          if (!initialData?.id) {
            throw new Error("Class ID is required for editing");
          }

          const updatePayload = toUpdateClassPayload(formData, initialData);

          if (Object.keys(updatePayload).length === 0) {
            savedClass = initialData;
          } else {
            savedClass = await classService.update(
              initialData.id,
              updatePayload,
            );
          }
        } else {
          savedClass = await classService.create(
            toCreateClassPayload(formData),
          );
        }
      } catch (error) {
        const serverErrors = Array.isArray(error?.errors) ? error.errors : [];

        for (const fieldError of serverErrors) {
          if (!fieldError?.field || !fieldError?.message) {
            continue;
          }

          setError(fieldError.field, {
            type: "server",
            message: fieldError.message,
          });
        }

        setSubmitError(error?.message || "An error occurred");
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess?.(savedClass);
    },
    [initialData, isEditMode, onSuccess],
  );

  return {
    register,
    errors,
    watch,
    control,
    setValue,
    isSubmitting,
    submitError,
    onSubmit: handleSubmit(submitForm),
  };
}
