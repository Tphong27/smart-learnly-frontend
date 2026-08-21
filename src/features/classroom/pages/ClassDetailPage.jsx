import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Ban,
  BarChart3,
  BookOpen,
  ClipboardList,
  Info,
  Loader,
  Eye,
  FileQuestion,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button, Modal, useToast } from "@/shared/components/ui";
import { classroomService } from "../services/classroomService";
import { canManageClasses, ROLES } from "@/shared/constants/roles";
import { ClassStatusBadge } from "../components/ClassStatusBadge";
import { ClassOverviewTab } from "../components/ClassOverviewTab";
import { ClassAnalyticsTab } from "../components/ClassAnalyticsTab";
import { useClassCurriculum, TRAINER_LESSON_TYPES } from "../hooks/useClassCurriculum";
import { CurriculumAuthoringLayout } from "@/features/course/components/CurriculumAuthoringLayout";
import { CurriculumStructureEditor } from "@/features/course/components/CurriculumStructureEditor";
import { getCurrentRole } from "@/shared/utils/auth";
import { toDateInputValue } from "@/shared/utils/date";
import {
  CLASS_STATUSES,
  normalizeClassStatus,
} from "../constants/classLifecycle";

/** Điều phối workspace lớp và mở curriculum cho Trainer hoặc người quản lý lớp. */
export function ClassDetailPage({
  routeBase = "/staff/classrooms",
  coursePreviewBase = "/staff/courses",
}) {
  const { classId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const userRole = getCurrentRole();
  const isTrainer = userRole === ROLES.TRAINER;
  const isTmo = userRole === ROLES.TMO;
  const isClassManager = canManageClasses(userRole);
  const canOpenClassCurriculum = isTrainer || isClassManager;
  const canEditClassCurriculum = isTrainer;

  const [classData, setClassData] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab =
    requestedTab === "analytics"
      ? "analytics"
      : requestedTab === "curriculum" && canOpenClassCurriculum
        ? "curriculum"
        : "overview";

  const classCurriculum = useClassCurriculum({
    classId,
    courseId: classData?.courseId,
    routeBase,
    courseBasePath: coursePreviewBase,
    enabled: activeTab === "curriculum" && canOpenClassCurriculum,
    readOnly: !canEditClassCurriculum,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [lifecycleDialog, setLifecycleDialog] = useState(null);
  const [lifecycleSubmitting, setLifecycleSubmitting] = useState(false);

  const [restoreDates, setRestoreDates] = useState({
    startDate: "",
    endDate: "",
  });

  function reloadClass() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  function selectTab(tab) {
    const nextParams = new URLSearchParams(searchParams);

    if (tab === "overview") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", tab);
    }

    setSearchParams(nextParams, {
      replace: true,
    });
  }

  function openEditClass() {
    if (!classId || !isClassManager) return;

    navigate(`${routeBase}/${classId}/edit`);
  }

  function openTraineePreview() {
    if (!classData?.courseId || !classId) return;

    const params = new URLSearchParams();
    params.set("classId", classId);
    const workspacePath = `${routeBase}/${classId}/workspace`;

    params.set(
      "returnTo",
      activeTab === "overview"
        ? workspacePath
        : `${workspacePath}?tab=${activeTab}`,
    );
    navigate(
      `${coursePreviewBase}/${classData.courseId}/preview?${params.toString()}`,
    );
  }

  useEffect(() => {
    if (!classId) {
      return undefined;
    }

    let mounted = true;

    const request = isTrainer
      ? classroomService.getTrainer(classId)
      : classroomService.getAdmin(classId);

    request
      .then((data) => {
        if (!mounted) return;

        setClassData(data);
        setError("");
      })
      .catch((err) => {
        if (!mounted) return;

        setError(err.message || "Can not load class information");
        setClassData(null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [classId, refreshKey, isTrainer]);

  function openCancelDialog() {
    setLifecycleDialog("cancel");
  }

  function openRestoreDialog() {
    setRestoreDates({
      startDate: toDateInputValue(classData?.startDate),
      endDate: toDateInputValue(classData?.endDate),
    });

    setLifecycleDialog("restore");
  }

  function closeLifecycleDialog() {
    if (lifecycleSubmitting) {
      return;
    }

    setLifecycleDialog(null);
  }

  async function confirmCancelClass() {
    if (!classId) {
      return;
    }

    setLifecycleSubmitting(true);
    setError("");

    try {
      const cancelledClass = await classroomService.cancel(classId);

      setClassData(cancelledClass);
      setLifecycleDialog(null);

      toast.success("Class cancelled successfully");
    } catch (err) {
      const message = err?.message || "Can not cancel class";

      setError(message);
      toast.error(message);
    } finally {
      setLifecycleSubmitting(false);
    }
  }

  async function confirmRestoreClass() {
    if (!classId) {
      return;
    }

    if (!restoreDates.startDate || !restoreDates.endDate) {
      toast.error("Please select the start date and end date");
      return;
    }

    if (restoreDates.endDate < restoreDates.startDate) {
      toast.error("End date cannot be before start date");
      return;
    }

    setLifecycleSubmitting(true);
    setError("");

    try {
      const restoredClass = await classroomService.restore(classId, restoreDates);
      setClassData(restoredClass);
      setLifecycleDialog(null);

      toast.success(`Class restored as ${restoredClass.status}`);
    } catch (err) {
      const message = err?.message || "Can not restore class";

      setError(message);
      toast.error(message);
    } finally {
      setLifecycleSubmitting(false);
    }
  }

  async function deleteClass() {
    const confirmed = window.confirm(
      "Do you want to soft delete this class? This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      await classroomService.delete(classId);
      navigate(routeBase);
    } catch (err) {
      setError(err.message || "Can not delete class");
    }
  }

  function openAssignments() {
    const params = new URLSearchParams();
    if (classData.courseId) {
      params.set("courseId", classData.courseId);
    }
    if (classId) {
      params.set("classId", classId);
    }
    const query = params.toString();
    navigate(`/staff/assignments${query ? `?${query}` : ""}`);
  }

  function openTests() {
    const params = new URLSearchParams();
    if (classData.courseId) {
      params.set("courseId", classData.courseId);
    }
    if (classId) {
      params.set("classId", classId);
    }
    const query = params.toString();
    navigate(`/staff/tests${query ? `?${query}` : ""}`);
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loader className="spinner" size={40} />
        <p>Loading class information...</p>
      </div>
    );
  }

  if (error && !classData) {
    return (
      <div className="page-error">
        <AlertCircle size={48} />
        <p>{error}</p>
        <Button variant="secondary" onClick={reloadClass}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="page-error">
        <AlertCircle size={48} />
        <p>Class not found</p>
      </div>
    );
  }

  const normalizedStatus = normalizeClassStatus(classData.status);

  const canCancelClass =
    isClassManager &&
    (normalizedStatus === CLASS_STATUSES.UPCOMING ||
      normalizedStatus === CLASS_STATUSES.ONGOING);

  const canRestoreClass =
    isClassManager && normalizedStatus === CLASS_STATUSES.CANCELLED;

  return (
    <section className="trainer-class-workspace">
      <div className="workspace-header">
        <div className="workspace-header__content">
          <h1 className="workspace-header__title">{classData.className}</h1>

          <div className="workspace-header__info">
            <span>{classData.courseTitle}</span>
            <span aria-hidden="true">•</span>
            <ClassStatusBadge status={classData.status} />
          </div>
        </div>

        {(isTrainer || isClassManager) && (
          <div className="workspace-header__actions">
            <Button
              type="button"
              leftIcon={<Eye size={17} />}
              onClick={openTraineePreview}
            >
              View as trainee
            </Button>

            {(isTrainer || isTmo) && (
              <>
                <Button
                  type="button"
                  leftIcon={<ClipboardList size={17} />}
                  onClick={openAssignments}
                >
                  {isTmo ? "View assignments" : "Assignment"}
                </Button>
                <Button
                  type="button"
                  leftIcon={<FileQuestion size={17} />}
                  onClick={openTests}
                >
                  Test
                </Button>
              </>
            )}

            {canCancelClass && (
              <Button
                type="button"
                variant="danger"
                leftIcon={<Ban size={17} />}
                onClick={openCancelDialog}
              >
                Cancel class
              </Button>
            )}

            {canRestoreClass && (
              <Button
                type="button"
                variant="success"
                leftIcon={<RotateCcw size={17} />}
                onClick={openRestoreDialog}
              >
                Restore class
              </Button>
            )}

            {isClassManager && (
              <Button
                type="button"
                variant="delete"
                size="icon"
                title="Soft Delete"
                aria-label="Soft Delete class"
                onClick={deleteClass}
              >
                <Trash2 size={16} strokeWidth={2.2} />
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="form-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="Class workspace tabs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          className={
            activeTab === "overview"
              ? "workspace-tabs__item is-active"
              : "workspace-tabs__item"
          }
          onClick={() => selectTab("overview")}
        >
          <Info size={16} />
          Overview
        </button>

        {canOpenClassCurriculum && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "curriculum"}
            className={
              activeTab === "curriculum"
                ? "workspace-tabs__item is-active"
                : "workspace-tabs__item"
            }
            onClick={() => selectTab("curriculum")}
          >
            <BookOpen size={16} />
            Curriculum
          </button>
        )}

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "analytics"}
          className={
            activeTab === "analytics"
              ? "workspace-tabs__item is-active"
              : "workspace-tabs__item"
          }
          onClick={() => selectTab("analytics")}
        >
          <BarChart3 size={16} />
          Analytics
        </button>
      </div>

      <div className="class-workspace-panel">
        {activeTab === "analytics" ? (
          <ClassAnalyticsTab classId={classId} isTrainer={isTrainer} />
        ) : activeTab === "curriculum" && canOpenClassCurriculum ? (
          <CurriculumAuthoringLayout
            embedded
            loading={classCurriculum.loading}
            error={classCurriculum.loadError}
            errorTitle="Class curriculum unavailable"
            onRetry={classCurriculum.reload}
            context={classCurriculum.contextLabel}
            headerActions={
              classCurriculum.canPublish ? (
                <Button
                  type="button"
                  variant="save"
                  size="sm"
                  loading={classCurriculum.actionLoading}
                  onClick={classCurriculum.publishDraft}
                >
                  Publish changes
                </Button>
              ) : null
            }
          >
            <CurriculumStructureEditor
              sections={classCurriculum.sections}
              getLessons={(section) => section?.lessons || []}
              isSectionLessonsLoading={() => false}
              stats={classCurriculum.stats}
              readOnly={!classCurriculum.canEdit}
              lessonTypeOptions={TRAINER_LESSON_TYPES}
              enableFlashcardCreateFields
              lessonEditLabel={canEditClassCurriculum ? "Edit lesson" : "View lesson"}
              emptyMessage="This class curriculum has no modules yet."
              emptyAddTitle="Add a new module"
              emptyAddSubtitle="Organise class content so trainees can follow along."
              onCreateSection={classCurriculum.createSection}
              onUpdateSection={classCurriculum.updateSection}
              onDeleteSection={classCurriculum.deleteSection}
              onReorderSections={classCurriculum.reorderSections}
              onCreateLesson={classCurriculum.createLesson}
              showManageQuestions={canEditClassCurriculum}
              onManageQuestions={classCurriculum.manageLessonQuestions}
              openLessonEditorOnCreate
              onDeleteLesson={classCurriculum.deleteLesson}
              onReorderLessons={classCurriculum.reorderLessons}
              onEditLesson={classCurriculum.editLesson}
            />
          </CurriculumAuthoringLayout>
        ) : (
          <ClassOverviewTab
            classData={classData}
            onEdit={openEditClass}
            readOnly={!isClassManager}
          />
        )}
      </div>

      <Modal
        open={Boolean(lifecycleDialog)}
        size="sm"
        title={lifecycleDialog === "cancel" ? "Cancel class" : "Restore class"}
        description={
          lifecycleDialog === "cancel"
            ? "The class history and enrollments will be preserved."
            : "The class status will be recalculated from the selected dates."
        }
        closeDisabled={lifecycleSubmitting}
        closeOnOverlayClick={!lifecycleSubmitting}
        onClose={closeLifecycleDialog}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={lifecycleSubmitting}
              onClick={closeLifecycleDialog}
            >
              Close
            </Button>

            {lifecycleDialog === "cancel" ? (
              <Button
                type="button"
                variant="danger"
                loading={lifecycleSubmitting}
                loadingLabel="Cancelling..."
                onClick={confirmCancelClass}
              >
                Confirm cancellation
              </Button>
            ) : (
              <Button
                type="button"
                variant="success"
                loading={lifecycleSubmitting}
                loadingLabel="Restoring..."
                onClick={confirmRestoreClass}
              >
                Restore class
              </Button>
            )}
          </>
        }
      >
        {lifecycleDialog === "cancel" ? (
          <p>
            Future class sessions will be removed. Existing enrollments,
            transactions and historical sessions will not be deleted. This
            action does not automatically issue a refund.
          </p>
        ) : (
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="restoreStartDate">Start date</label>

              <input
                id="restoreStartDate"
                type="date"
                value={restoreDates.startDate}
                disabled={lifecycleSubmitting}
                onChange={(event) =>
                  setRestoreDates((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="restoreEndDate">End date</label>

              <input
                id="restoreEndDate"
                type="date"
                value={restoreDates.endDate}
                disabled={lifecycleSubmitting}
                onChange={(event) =>
                  setRestoreDates((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
              />
            </div>

            <p>
              A class stays Upcoming through its start date, becomes Ongoing
              on the following day, and becomes Completed after its end date.
            </p>
          </div>
        )}
      </Modal>
    </section>
  );
}
