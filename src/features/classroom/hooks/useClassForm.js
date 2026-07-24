import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { classEditFormSchema, classFormSchema } from "../utils/classValidator";
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
    setValue,
  } = useForm({
    resolver: zodResolver(isEditMode ? classEditFormSchema : classFormSchema),
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
