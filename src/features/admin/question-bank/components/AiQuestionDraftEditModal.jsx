import { useId, useState } from "react";
import { Alert, Button, Modal, Textarea } from "@/shared/components/ui";
import { QuestionTextRichEditor } from "./QuestionTextRichEditor";
import { questionTypeLabel } from "../utils/questionFormUtils";
import { createAiDraftFormValues } from "../utils/aiQuestionDraftReview";

/** Hiển thị form sửa AI draft dùng chung cho màn tạo và màn review. */
export function AiQuestionDraftEditModal({
    draft,
    mutating,
    error,
    onClose,
    onSave,
}) {
    const fieldIdPrefix = useId().replace(/:/g, "");
    const [values, setValues] = useState(() =>
        createAiDraftFormValues(draft),
    );

    /** Cập nhật nội dung của một đáp án theo vị trí hiện tại. */
    function updateAnswer(index, answerText) {
        setValues((current) => ({
            ...current,
            answers: current.answers.map((answer, answerIndex) =>
                answerIndex === index ? { ...answer, answerText } : answer,
            ),
        }));
    }

    /** Cập nhật đáp án đúng theo quy tắc single choice hoặc multiple choice. */
    function setCorrect(index) {
        setValues((current) => ({
            ...current,
            answers: current.answers.map((answer, answerIndex) => ({
                ...answer,
                correct:
                    current.questionType === "multiple_choice"
                        ? answerIndex === index
                            ? !answer.correct
                            : answer.correct
                        : answerIndex === index,
            })),
        }));
    }

    return (
        <Modal
            open={Boolean(draft)}
            title="Edit AI draft"
            size="xl"
            closeOnOverlayClick={false}
            onClose={onClose}
        >
            <form
                className="ai-draft-edit-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSave(values);
                }}
            >
                {error && <Alert tone="danger">{error}</Alert>}

                <div className="ai-drafts-fieldset">
                    <span className="input-field__label">Question type</span>
                    <p className="ai-drafts-readonly-value">
                        {questionTypeLabel(values.questionType)}
                    </p>
                </div>

                <div className="ai-drafts-fieldset">
                    <span className="input-field__label">
                        Question text
                        <span className="input-field__required" aria-hidden="true">*</span>
                    </span>
                    <QuestionTextRichEditor
                        value={values.questionText}
                        onChange={(questionText) =>
                            setValues((current) => ({
                                ...current,
                                questionText,
                            }))
                        }
                        disabled={mutating}
                        toolbarLabel="AI draft question formatting toolbar"
                    />
                </div>

                <fieldset className="ai-drafts-fieldset ai-draft-edit-fieldset">
                    <legend className="input-field__label">
                        Answers
                        <span className="input-field__required" aria-hidden="true">*</span>
                    </legend>
                    <div className="ai-draft-edit-answers">
                        {values.answers.map((answer, index) => (
                            <div
                                className="ai-draft-edit-answer"
                                key={
                                    answer.answerId ||
                                    answer.id ||
                                    answer.displayOrder ||
                                    index
                                }
                            >
                                <input
                                    type={
                                        values.questionType ===
                                        "multiple_choice"
                                            ? "checkbox"
                                            : "radio"
                                    }
                                    name={`${fieldIdPrefix}-correct-answer`}
                                    checked={answer.correct}
                                    onChange={() => setCorrect(index)}
                                    aria-label={`Mark answer ${index + 1} correct`}
                                    disabled={mutating}
                                />
                                <Textarea
                                    rows={2}
                                    value={answer.answerText}
                                    disabled={
                                        mutating ||
                                        values.questionType === "true_false"
                                    }
                                    aria-label={`Answer ${index + 1}`}
                                    onChange={(event) =>
                                        updateAnswer(index, event.target.value)
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </fieldset>

                <div className="ai-drafts-fieldset">
                    <Textarea
                        id={`${fieldIdPrefix}-explanation`}
                        label="Explanation"
                        rows={4}
                        value={values.explanation}
                        onChange={(event) =>
                            setValues((current) => ({
                                ...current,
                                explanation: event.target.value,
                            }))
                        }
                        disabled={mutating}
                    />
                </div>

                <Alert tone="info">
                    Editing the question or correct answer may require another
                    evidence review.
                </Alert>

                <div className="ai-drafts-actions">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={mutating}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={mutating}
                        loadingLabel="Saving..."
                    >
                        Save draft
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
