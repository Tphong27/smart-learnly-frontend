import { FlashcardLessonEditor } from "@/features/course/components/flashcards/FlashcardLessonEditor";
import { Alert, Input, Select } from "@/shared/components/ui";
import { LessonSettingsFields } from "./LessonSettingsFields";

/** Hiển thị metadata phẳng và vùng quản lý thẻ; thao tác lưu metadata vẫn do lesson editor cha điều phối. */
export function FlashcardLessonAuthoring({
    lessonMetadataFormId,
    handleSave,
    lessonType,
    lessonTypeOptions,
    onLessonTypeChange,
    durationMinutes,
    isPreview,
    setIsPreview,
    title,
    setTitle,
    setTitleError,
    markChanged,
    titleError,
    updateDurationMinutes,
    status,
    setStatus,
    courseId,
    lessonId,
    initialFlashcardSetId,
    flashcardSetReady,
    defaultFlashcardModuleId,
    showToast,
    services,
    features,
    lessonSaveBar,
}) {
    return (
        <div className="sl-video-lesson-form">
            <form
                id={lessonMetadataFormId}
                onSubmit={handleSave}
                className="sl-video-lesson-form"
                noValidate
            >
                <section className="sl-video-lesson-form__section">
                    <div className="sl-video-lesson-form__info-grid">
                        <Input
                            id="lesson-title-input"
                            className="sl-video-lesson-form__field"
                            label="Title"
                            required
                            type="text"
                            value={title}
                            error={titleError}
                            onChange={(event) => {
                                setTitle(event.target.value);
                                setTitleError("");
                                markChanged();
                            }}
                        />

                        <Select
                            id="lesson-type-input"
                            className="sl-video-lesson-form__field"
                            label="Type"
                            value={lessonType}
                            onChange={(event) =>
                                onLessonTypeChange(event.target.value)
                            }
                        >
                            {lessonTypeOptions.map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <LessonSettingsFields
                        idPrefix="lesson-flashcard"
                        status={status}
                        durationMinutes={durationMinutes}
                        isPreview={isPreview}
                        showDuration={false}
                        onStatusChange={(nextStatus) => {
                            setStatus(nextStatus);
                            markChanged();
                        }}
                        onDurationChange={updateDurationMinutes}
                        onPreviewChange={(nextIsPreview) => {
                            setIsPreview(nextIsPreview);
                            markChanged();
                        }}
                    />
                </section>
            </form>

            <section className="sl-video-lesson-form__section sl-flashcard-lesson-form__cards">
                {flashcardSetReady ? (
                    <FlashcardLessonEditor
                        courseId={courseId}
                        lessonId={lessonId}
                        initialSetId={initialFlashcardSetId}
                        defaultTitle={title}
                        defaultModuleId={defaultFlashcardModuleId}
                        activeSection="current"
                        showToast={showToast}
                        flashcardService={services.flashcardService}
                        stagingEnabled={features.flashcardStaging !== false}
                    />
                ) : (
                    <>
                        <div className="sl-video-lesson-form__section-heading">
                            <h2>Flashcard</h2>
                        </div>
                        <Alert tone="info">
                            Save the lesson first. Its flashcard set will be
                            created automatically, then you can add or import
                            cards.
                        </Alert>
                    </>
                )}
            </section>

            {lessonSaveBar}
        </div>
    );
}
