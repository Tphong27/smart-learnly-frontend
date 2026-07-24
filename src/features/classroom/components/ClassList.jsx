import { BarChart3, BookOpen, Eye, School, Trash2 } from "lucide-react";
import { ClassStatusBadge } from "./ClassStatusBadge";
import { formatCapacity, formatDate, formatVnd } from "../utils/classFormatter";
import "@/features/admin/courses/pages/AdminCoursesPage.css";

function resolveClassItem(classItem) {
  return {
    ...classItem,
    resolvedClassName: classItem.className?.trim() || "Untitled class",
    resolvedCourseTitle: classItem.courseTitle?.trim() || "Course not assigned",
    resolvedTrainerName:
      classItem.trainerName?.trim() || "Trainer not assigned",
  };
}

function ClassActions({
  classItem,
  isTmo,
  isTrainer,
  onOpen,
  onCurriculum,
  onAnalytics,
  onDelete,
}) {
  return (
    <div className="course-management__actions">
      <button
        type="button"
        className="course-management__action course-management__action--primary"
        title="Open class"
        aria-label={`Open ${classItem.resolvedClassName}`}
        onClick={() => onOpen(classItem.id)}
      >
        <Eye size={17} strokeWidth={2.2} aria-hidden="true" />
      </button>

      {isTrainer && (
        <button
          type="button"
          className="course-management__action"
          title="Curriculum"
          aria-label={`Open curriculum for ${classItem.resolvedClassName}`}
          onClick={() => onCurriculum(classItem.id)}
        >
          <BookOpen size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        className="course-management__action"
        title="Class analytics"
        aria-label={`View analytics for ${classItem.resolvedClassName}`}
        onClick={() => onAnalytics(classItem.id)}
      >
        <BarChart3 size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>

      {isTmo && (
        <button
          type="button"
          className="course-management__action class-management__action--danger"
          title="Soft delete"
          aria-label={`Soft delete ${classItem.resolvedClassName}`}
          onClick={() => onDelete(classItem.id)}
        >
          <Trash2 size={16} strokeWidth={2.2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function ClassList({
  classes,
  isTmo,
  isTrainer,
  onOpen,
  onCurriculum,
  onAnalytics,
  onDelete,
}) {
  const classItems = classes.map(resolveClassItem);

  return (
    <div
      className="course-management__table-wrap class-management__table-wrap"
      role="region"
      aria-label="Class list"
    >
      <table className="course-management__table class-management__table">
        <thead>
          <tr>
            <th>Class</th>
            <th>Trainer</th>
            <th>Schedule</th>
            <th>Enrollment</th>
            <th>Class fee</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {classItems.map((classItem) => (
            <tr key={classItem.id}>
              <td data-label="Class">
                <button
                  type="button"
                  className="course-management__course-cell class-management__class-cell"
                  onClick={() => onOpen(classItem.id)}
                  aria-label={`Open ${classItem.resolvedClassName}`}
                >
                  <span className="course-management__thumbnail class-management__thumbnail">
                    <School size={20} aria-hidden="true" />
                  </span>

                  <span className="class-management__class-copy">
                    <strong>{classItem.resolvedClassName}</strong>

                    <span className="class-management__course-title">
                      {classItem.resolvedCourseTitle}
                    </span>
                  </span>
                </button>
              </td>

              <td data-label="Trainer">
                <span className="class-management__trainer">
                  {classItem.resolvedTrainerName}
                </span>
              </td>

              <td data-label="Schedule">
                <div className="class-management__schedule">
                  <time
                    className="class-management__schedule-date class-management__schedule-date--start"
                    dateTime={classItem.startDate}
                  >
                    {formatDate(classItem.startDate)}
                  </time>

                  <span
                    className="class-management__schedule-connector"
                    aria-hidden="true"
                  >
                    to
                  </span>

                  <time
                    className="class-management__schedule-date class-management__schedule-date--end"
                    dateTime={classItem.endDate}
                  >
                    {formatDate(classItem.endDate)}
                  </time>
                </div>
              </td>

              <td data-label="Enrollment">
                <div className="course-management__meta-cell">
                  <strong>
                    {formatCapacity(
                      classItem.activeEnrollmentCount,
                      classItem.maxStudents,
                    )}{" "}
                    trainees
                  </strong>
                </div>
              </td>

              <td data-label="Class fee">
                <div className="course-management__meta-cell">
                  <strong>{formatVnd(classItem.price)}</strong>

                  <span>
                    {Number(classItem.price) === 0
                      ? "Free class"
                      : "Standard fee"}
                  </span>
                </div>
              </td>

              <td data-label="Status">
                <ClassStatusBadge status={classItem.status} />
              </td>

              <td data-label="Actions">
                <ClassActions
                  classItem={classItem}
                  isTmo={isTmo}
                  isTrainer={isTrainer}
                  onOpen={onOpen}
                  onCurriculum={onCurriculum}
                  onAnalytics={onAnalytics}
                  onDelete={onDelete}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: cùng cách Course Management chuyển bảng thành card */}
      <ul
        className="course-management__cards"
        aria-label="Class list on mobile"
      >
        {classItems.map((classItem) => (
          <li key={classItem.id} className="course-management__card">
            <div className="course-management__card-head">
              <span className="course-management__thumbnail class-management__thumbnail">
                <School size={20} aria-hidden="true" />
              </span>

              <div>
                <strong>{classItem.resolvedClassName}</strong>

                <span className="class-management__course-title">
                  {classItem.resolvedCourseTitle}
                </span>
              </div>
            </div>

            <dl className="course-management__card-meta">
              <div>
                <dt>Trainer</dt>
                <dd>{classItem.resolvedTrainerName}</dd>
              </div>

              <div>
                <dt>Schedule</dt>
                <dd>
                  {formatDate(classItem.startDate)} –{" "}
                  {formatDate(classItem.endDate)}
                </dd>
              </div>

              <div>
                <dt>Enrollment</dt>
                <dd>
                  {formatCapacity(
                    classItem.activeEnrollmentCount,
                    classItem.maxStudents,
                  )}
                </dd>
              </div>

              {/* <div>
                <dt>Available seats</dt>
                <dd>{classItem.availableSeats ?? 0}</dd>
              </div> */}

              <div>
                <dt>Class fee</dt>
                <dd>{formatVnd(classItem.price)}</dd>
              </div>
            </dl>

            <div className="course-management__card-status">
              <ClassStatusBadge status={classItem.status} />
            </div>

            <div className="course-management__card-actions">
              <ClassActions
                classItem={classItem}
                isTmo={isTmo}
                isTrainer={isTrainer}
                onOpen={onOpen}
                onCurriculum={onCurriculum}
                onAnalytics={onAnalytics}
                onDelete={onDelete}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
