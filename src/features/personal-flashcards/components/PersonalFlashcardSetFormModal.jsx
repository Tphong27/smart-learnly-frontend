import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, FormField, Modal } from "@/shared/components/ui";
import { personalFlashcardSetSchema } from "../schemas/personal-flashcard-schemas";
import { getErrorMessage } from "../utils/personal-flashcard-utils";

export function PersonalFlashcardSetFormModal({
  open,
  mode = "create",
  initialSet,
  onClose,
  onSave,
}) {
  const [serverError, setServerError] = useState("");
  const defaultValues = useMemo(
    () => ({
      title: initialSet?.title || "",
      description: initialSet?.description || "",
    }),
    [initialSet],
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(personalFlashcardSetSchema),
    defaultValues,
    mode: "onBlur",
  });

  useEffect(() => {
    if (!open) return;
    reset(defaultValues);
  }, [defaultValues, open, reset]);

  function closeModal() {
    if (isSubmitting) return;
    setServerError("");
    onClose();
  }

  async function submit(values) {
    setServerError("");
    try {
      await onSave(values);
      closeModal();
    } catch (error) {
      setServerError(getErrorMessage(error, "Unable to save this flashcard set."));
    }
  }

  const editing = mode === "edit";
  return (
    <Modal
      open={open}
      title={editing ? "Edit flashcard set" : "Create flashcard set"}
      description={editing ? "Update the title and description for this personal set." : "Create an empty set, then add your own cards."}
      closeDisabled={isSubmitting}
      onClose={closeModal}
      footer={(
        <div className="personal-flashcard-modal-actions">
          <Button type="button" variant="secondary" onClick={closeModal} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="personal-flashcard-set-form" loading={isSubmitting}>
            {editing ? "Save changes" : "Create set"}
          </Button>
        </div>
      )}
    >
      <Form id="personal-flashcard-set-form" onSubmit={handleSubmit(submit)}>
        {serverError && <p className="personal-flashcard-form-error" role="alert">{serverError}</p>}
        <FormField
          label="Set title"
          required
          registration={register("title")}
          error={errors.title?.message}
          placeholder="e.g. Japanese vocabulary"
          disabled={isSubmitting}
        />
        <label className="personal-flashcard-field" htmlFor="personal-flashcard-set-description">
          <span>Description</span>
          <textarea
            id="personal-flashcard-set-description"
            rows="4"
            {...register("description")}
            disabled={isSubmitting}
          />
        </label>
      </Form>
    </Modal>
  );
}
