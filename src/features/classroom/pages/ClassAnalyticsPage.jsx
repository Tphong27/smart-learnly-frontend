import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Clock3,
  Loader,
  TrendingUp,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { classAnalyticsService } from "@/services";
import { ROLES } from "@/shared/constants/roles";
import { Button } from "@/shared/components/ui";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/shared/utils/formatters";
import { getCurrentRole } from "@/shared/utils/auth";

function MetricItem({ icon, label, value, helper }) {
  return (
    <div className="analytics-metric-item">
      <div className="analytics-metric-item__label">
        {icon}
        <dt>{label}</dt>
      </div>

      <dd>{value}</dd>

      {helper && <small>{helper}</small>}
    </div>
  );
}

export function ClassAnalyticsPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const role = getCurrentRole();
  const [inactiveDays, setInactiveDays] = useState(7);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!classId) {
      return undefined;
    }

    let mounted = true;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        const data =
          role === ROLES.TRAINER
            ? await classAnalyticsService.getTrainer(classId, inactiveDays)
            : await classAnalyticsService.getAdmin(classId, inactiveDays);

        if (!mounted) {
          return;
        }

        setAnalytics(data);
      } catch (err) {
        if (!mounted) {
          return;
        }

        setAnalytics(null);

        setError(err.message || "Can not load class analytics");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [classId, inactiveDays, role]);

  const sortedStudents = useMemo(() => {
    if (!analytics?.students) {
      return [];
    }

    return [...analytics.students].sort((first, second) => {
      if (first.inactive !== second.inactive) {
        return first.inactive ? -1 : 1;
      }

      return first.progressPercent - second.progressPercent;
    });
  }, [analytics]);

  if (loading) {
    return (
      <div className="page-loading">
        <Loader className="spinner" size={40} />

        <p>Loading class analytics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="page-error">
        <AlertCircle size={48} />

        <p>{error || "Class analytics not found"}</p>
      </div>
    );
  }

  return (
    <section className="class-analytics-page">
      <header className="class-analytics-header">
        <div className="class-analytics-header__top">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/staff/classrooms/${classId}/workspace`)}
          >
            <ArrowLeft size={16} />
            Back to Workspace
          </Button>

          <label className="analytics-inactive-filter">
            <span>Inactive after</span>

            <select
              value={inactiveDays}
              onChange={(event) => setInactiveDays(Number(event.target.value))}
            >
              <option value={7}>7 days</option>

              <option value={14}>14 days</option>

              <option value={30}>30 days</option>
            </select>
          </label>
        </div>

        <div>
          <p className="class-analytics-header__eyebrow">Class Analytics</p>

          <h1>{analytics.className}</h1>

          <p className="class-analytics-header__meta">
            {analytics.courseTitle}

            {" • "}

            {analytics.trainerName || "No trainer"}

            {" • "}

            {analytics.status}
          </p>
        </div>
      </header>

      <dl
        className="class-analytics-summary"
        aria-label="Class analytics summary"
      >
        <MetricItem
          icon={<Users size={18} />}
          label="Enrolled Students"
          value={`${analytics.enrolledStudents}/${analytics.maxStudents}`}
        />

        <MetricItem
          icon={<TrendingUp size={18} />}
          label="Average Progress"
          value={formatPercent(analytics.averageProgress)}
        />

        <MetricItem
          icon={<BookOpen size={18} />}
          label="Average Test Score"
          value={formatNumber(analytics.averageTestScore)}
        />

        <MetricItem
          icon={<ClipboardCheck size={18} />}
          label="Assignment Submission"
          value={formatPercent(analytics.assignmentSubmissionRate)}
        />

        <MetricItem
          icon={<Clock3 size={18} />}
          label="Late Submissions"
          value={analytics.lateSubmissions}
        />

        <MetricItem
          icon={<BarChart3 size={18} />}
          label="Inactive Students"
          value={analytics.inactiveStudents}
        />
      </dl>

      <section className="analytics-panel">
        <div className="analytics-panel__header">
          <div>
            <h2>Student Performance</h2>
          </div>

          <span className="analytics-panel__count">
            {sortedStudents.length} students
          </span>
        </div>

        <div className="analytics-table-wrapper">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Progress</th>
                <th>Test Average</th>
                <th>Assignment Average</th>
                <th>Last Activity</th>
                <th>Indicators</th>
              </tr>
            </thead>

            <tbody>
              {sortedStudents.map((student) => (
                <tr key={student.studentId}>
                  <td>
                    <div className="analytics-student">
                      <strong>{student.studentName}</strong>
                      <span>{student.email}</span>
                    </div>
                  </td>
                  <td>
                    <div className="analytics-progress-cell">
                      <div className="analytics-progress-track">
                        <div
                          className="analytics-progress-fill"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, student.progressPercent),
                            )}%`,
                          }}
                        />
                      </div>
                      <span>{formatPercent(student.progressPercent)}</span>
                    </div>
                  </td>
                  <td>{formatNumber(student.averageTestScore)}</td>
                  <td>{formatNumber(student.averageAssignmentScore)}</td>
                  <td>{formatDateTime(student.lastActivityAt)}</td>
                  <td>
                    <div className="analytics-indicators">
                      {student.inactive && (
                        <span className="analytics-badge analytics-badge--warning">
                          Inactive
                        </span>
                      )}

                      {student.hasLateSubmission && (
                        <span className="analytics-badge analytics-badge--danger">
                          Late submission
                        </span>
                      )}

                      {!student.inactive && !student.hasLateSubmission && (
                        <span className="analytics-badge analytics-badge--success">
                          No alert
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
