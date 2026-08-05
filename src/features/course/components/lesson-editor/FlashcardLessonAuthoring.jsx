import { Button } from "@/shared/components/ui";
import { FlashcardLessonEditor } from "@/features/course/components/flashcards/FlashcardLessonEditor";
import { LESSON_STATUS_OPTIONS } from "@/features/course/utils/lesson-status";
import { LessonEditorSection } from "./LessonEditorSection";

/** Hiển thị metadata và flashcard manager; save vẫn do LessonDetailEditor điều phối. */
export function FlashcardLessonAuthoring({
  lessonMetadataFormId,
  handleSave,
  typeLabel,
  statusLabel,
  durationMinutes,
  isPreview,
  setIsPreview,
  basicComplete,
  settingsComplete,
  expandedSection,
  setExpandedSection,
  title,
  setTitle,
  setTitleError,
  markChanged,
  titleError,
  updateDurationMinutes,
  status,
  setStatus,
  openSection,
  courseId,
  lessonId,
  initialFlashcardSetId,
  defaultFlashcardModuleId,
  showToast,
  services,
  features,
  lessonSaveBar,
}) {
  return (
          <div className="sl-cm-lesson-editor__accordion-form">
            <div className="sl-cm-lesson-editor__steps">
              <form
                id={lessonMetadataFormId}
                onSubmit={handleSave}
                className="sl-cm-lesson-editor__metadata-form"
                noValidate
              >
                <LessonEditorSection
                  id="lesson-step-basic"
                  step="1"
                  title="Basic information"
                  description="Edit the lesson metadata for this flashcard set."
                  summary={`${typeLabel} - ${statusLabel} - ${durationMinutes ? `${durationMinutes} min` : "No duration"} - Preview ${isPreview ? "enabled" : "disabled"}`}
                  state={
                    basicComplete && settingsComplete
                      ? "complete"
                      : "incomplete"
                  }
                  stateLabel={
                    basicComplete && settingsComplete
                      ? "Complete"
                      : "Incomplete"
                  }
                  expanded={expandedSection === "basic"}
                  onToggle={() =>
                    setExpandedSection((current) =>
                      current === "basic" ? "" : "basic",
                    )
                  }
                >
                  <div className="sl-video-lesson-form__info-grid sl-video-lesson-form__info-grid--flashcard">
                    <div className="sl-video-lesson-form__field">
                      <label
                        className="sl-cm-lesson-editor__field-label"
                        htmlFor="lesson-title-input"
                      >
                        Lesson title <span className="required">*</span>
                      </label>
                      <input
                        id="lesson-title-input"
                        type="text"
                        value={title}
                        onChange={(event) => {
                          setTitle(event.target.value);
                          setTitleError("");
                          markChanged();
                        }}
                        className="sl-cm-lesson-editor__field-control"
                        aria-invalid={titleError ? "true" : undefined}
                        aria-describedby={
                          titleError ? "lesson-title-error" : undefined
                        }
                      />
                      {titleError && (
                        <p
                          id="lesson-title-error"
                          className="sl-cm-lesson-editor__field-help sl-cm-lesson-editor__field-help--error"
                          role="alert"
                        >
                          {titleError}
                        </p>
                      )}
                    </div>

                    <div className="sl-video-lesson-form__field">
                      <label
                        className="sl-cm-lesson-editor__field-label"
                        htmlFor="lesson-flashcard-type"
                      >
                        Type
                      </label>
                      <input
                        id="lesson-flashcard-type"
                        type="text"
                        value={typeLabel}
                        className="sl-cm-lesson-editor__field-control sl-cm-lesson-editor__field-control--readonly"
                        readOnly
                      />
                    </div>

                    <div className="sl-video-lesson-form__field">
                      <label
                        className="sl-cm-lesson-editor__field-label"
                        htmlFor="lesson-flashcard-duration"
                      >
                        Estimated duration
                      </label>
                      <div className="sl-cm-lesson-editor__input-unit">
                        <input
                          id="lesson-flashcard-duration"
                          type="number"
                          min="0"
                          inputMode="numeric"
                          placeholder="Optional"
                          aria-describedby="lesson-flashcard-duration-unit"
                          value={durationMinutes}
                          onChange={(event) => {
                            updateDurationMinutes(event.target.value);
                          }}
                          className="sl-cm-lesson-editor__field-control"
                        />
                        <span id="lesson-flashcard-duration-unit">minutes</span>
                      </div>
                    </div>

                    <fieldset className="sl-video-lesson-form__status-field">
                      <legend className="sl-cm-lesson-editor__field-label">
                        Status
                      </legend>
                      <div className="sl-video-lesson-form__status-options">
                        {LESSON_STATUS_OPTIONS.map((option) => (
                          <label
                            key={option.value}
                            className="sl-video-lesson-form__status-option"
                          >
                            <input
                              type="radio"
                              name="lesson-flashcard-status"
                              value={option.value}
                              checked={status === option.value}
                              onChange={(event) => {
                                setStatus(event.target.value);
                                markChanged();
                              }}
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <label className="sl-cm-lesson-editor__preview-setting sl-video-lesson-form__preview-setting">
                      <span className="sl-cm-lesson-editor__preview-copy">
                        <strong>Preview lesson</strong>
                        <small>
                          Let learners view this lesson before enrolling.
                        </small>
                      </span>
                      <span className="sl-cm-lesson-editor__switch">
                        <input
                          type="checkbox"
                          checked={isPreview}
                          onChange={(event) => {
                            setIsPreview(event.target.checked);
                            markChanged();
                          }}
                        />
                        <span
                          className="sl-cm-lesson-editor__switch-track"
                          aria-hidden="true"
                        />
                      </span>
                    </label>
                  </div>
                  <div className="sl-lesson-step__footer">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openSection("material")}
                    >
                      Next: Flashcards
                    </Button>
                  </div>
                </LessonEditorSection>
              </form>
              <LessonEditorSection
                id="lesson-step-material"
                step="2"
                title="Flashcards"
                description="Manage the flashcard set and its learning cards."
                summary="Current cards and imports"
                state="complete"
                stateLabel="Editor ready"
                expanded={expandedSection === "material"}
                onToggle={() =>
                  setExpandedSection((current) =>
                    current === "material" ? "" : "material",
                  )
                }
              >
                <div className="flashcard-section-tabs" role="tablist">
                  <span
                    id="flashcard-current-tab"
                    role="tab"
                    aria-selected="true"
                    aria-controls="flashcard-current-panel"
                    className="flashcard-section-tabs__tab is-active"
                  >
                    Current Flashcards
                  </span>
                </div>
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
              </LessonEditorSection>
            </div>
            {lessonSaveBar}
          </div>

  );
}
