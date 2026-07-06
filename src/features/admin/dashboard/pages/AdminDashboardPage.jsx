import { useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardCheck, GraduationCap, Layers3, RotateCcw, Users } from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { adminDashboardService } from "@/services";
import { DashboardMetricCard } from "../components/DashboardMetricCard";
import { DashboardSectionCard } from "../components/DashboardSectionCard";
import "../../admin-shared.css";
import "../dashboard.css";

const RANGE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

function toIsoDateRange(days) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

function formatDateTime(value) {
  if (!value) return "--";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "--";
  }
}

export function AdminDashboardPage() {
  const toast = useToast();
  const [selectedDays, setSelectedDays] = useState(30);
  const [appliedDays, setAppliedDays] = useState(30);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rangeParams = useMemo(() => toIsoDateRange(selectedDays), [selectedDays]);

  async function loadOverview() {
    setLoading(true);
    setError(null);

    try {
      const data = await adminDashboardService.getOverview(rangeParams);
      setOverview(data);
      setAppliedDays(selectedDays);
    } catch (err) {
      const message = err?.message || "Could not load admin dashboard.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await adminDashboardService.getOverview(rangeParams);
        if (!cancelled) {
          setOverview(data);
          setAppliedDays(selectedDays);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || "Could not load admin dashboard.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [rangeParams, selectedDays, toast]);

  const users = overview?.users || {};
  const courses = overview?.courses || {};
  const classes = overview?.classes || {};
  const content = overview?.content || {};
  const questionBanks = overview?.questionBanks || {};

  return (
    <section className="admin-page dashboard-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Admin Dashboard</h1>
          <p className="admin-page__subtitle">
            Operational overview for users, learning content, classes, and review queues.
          </p>
        </div>

        <div className="dashboard-range-controls" aria-label="Dashboard date range">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.days}
              type="button"
              className={selectedDays === preset.days ? "dashboard-range-controls__btn dashboard-range-controls__btn--active" : "dashboard-range-controls__btn"}
              onClick={() => setSelectedDays(preset.days)}
              disabled={loading && selectedDays !== preset.days}
            >
              {preset.label}
            </button>
          ))}
          <Button variant="ghost" size="sm" leftIcon={<RotateCcw size={14} />} onClick={loadOverview} disabled={loading}>
            Refresh
          </Button>
        </div>
      </header>

      {loading && !overview ? (
        <div className="admin-card admin-loading">Loading admin dashboard...</div>
      ) : error && !overview ? (
        <div className="admin-card admin-error">
          <p>{error}</p>
          <Button variant="secondary" onClick={loadOverview}>Try again</Button>
        </div>
      ) : (
        <>
          <div className="dashboard-meta-row">
            <span>Showing loaded activity from the last {appliedDays} days</span>
            <span>Range: {formatDateTime(overview?.range?.from)} - {formatDateTime(overview?.range?.to)}</span>
            <span>Generated: {formatDateTime(overview?.generatedAt)}</span>
            {loading ? <span className="dashboard-meta-row__updating">Loading last {selectedDays} days...</span> : null}
          </div>

          {error && overview ? (
            <div className="admin-card dashboard-inline-error">
              <p>{error}</p>
              <Button variant="secondary" size="sm" onClick={loadOverview} disabled={loading}>Try again</Button>
            </div>
          ) : null}

          <div className="dashboard-metric-grid">
            <DashboardMetricCard
              title="New users"
              value={formatNumber(users.newInRange)}
              description={`${formatNumber(users.total)} total users`}
              icon={Users}
              tone="blue"
            />
            <DashboardMetricCard
              title="New courses"
              value={formatNumber(courses.newInRange)}
              description={`${formatNumber(courses.total)} total courses`}
              icon={GraduationCap}
              tone="green"
            />
            <DashboardMetricCard
              title="New classes"
              value={formatNumber(classes.newInRange)}
              description={`${formatNumber(classes.total)} total classes`}
              icon={Layers3}
              tone="amber"
            />
            <DashboardMetricCard
              title="New lessons"
              value={formatNumber(content.newLessonsInRange)}
              description={`${formatNumber(content.lessons)} total lessons`}
              icon={BookOpen}
              tone="purple"
            />
            <DashboardMetricCard
              title="New questions"
              value={formatNumber(questionBanks.newQuestionsInRange)}
              description={`${formatNumber(questionBanks.questions)} total questions`}
              icon={ClipboardCheck}
              tone="slate"
            />
          </div>

          <div className="dashboard-section-grid">
            <DashboardSectionCard
              title="Selected range activity"
              description="Created or reviewed items inside the selected date range."
              items={[
                { label: "new_users", value: users.newInRange },
                { label: "new_courses", value: courses.newInRange },
                { label: "new_classes", value: classes.newInRange },
                { label: "new_sections", value: content.newSectionsInRange },
                { label: "new_lessons", value: content.newLessonsInRange },
                { label: "new_question_banks", value: questionBanks.newBanksInRange },
                { label: "new_questions", value: questionBanks.newQuestionsInRange },
                { label: "reviewed_questions", value: questionBanks.reviewedQuestionsInRange },
              ]}
            />
            <DashboardSectionCard
              title="Operational attention"
              description="Items that may need admin or content team follow-up."
              items={[
                { label: "pending_verify_users", value: users.pendingVerify },
                { label: "banned_users", value: users.banned },
                { label: "draft_courses", value: courses.draft },
                { label: "inactive_courses", value: courses.inactive },
                { label: "cancelled_classes", value: classes.cancelled },
                { label: "draft_lessons", value: content.draftLessons },
                { label: "pending_review_questions", value: questionBanks.pendingReviewQuestions },
                { label: "rejected_questions", value: questionBanks.rejectedQuestions },
              ]}
            />
            <DashboardSectionCard
              title="Content health"
              description="Publishing status across course content."
              items={[
                { label: "sections", value: content.sections },
                { label: "published_lessons", value: content.publishedLessons },
                { label: "draft_lessons", value: content.draftLessons },
                { label: "inactive_lessons", value: content.inactiveLessons },
              ]}
            />
            <DashboardSectionCard
              title="User status"
              description="Active, pending, inactive, and banned accounts."
              items={[
                { label: "active", value: users.active },
                { label: "pending_verify", value: users.pendingVerify },
                { label: "inactive", value: users.inactive },
                { label: "banned", value: users.banned },
              ]}
            />
            <DashboardSectionCard
              title="Course status"
              description="Current publishing state across course catalog."
              items={[
                { label: "published", value: courses.published },
                { label: "draft", value: courses.draft },
                { label: "inactive", value: courses.inactive },
              ]}
            />
            <DashboardSectionCard
              title="Class status"
              description="Operational class lifecycle summary."
              items={[
                { label: "upcoming", value: classes.upcoming },
                { label: "ongoing", value: classes.ongoing },
                { label: "completed", value: classes.completed },
                { label: "cancelled", value: classes.cancelled },
              ]}
            />
            <DashboardSectionCard
              title="Question review health"
              description="Question bank and review workflow status."
              items={[
                { label: "approved_questions", value: questionBanks.approvedQuestions },
                { label: "pending_review_questions", value: questionBanks.pendingReviewQuestions },
                { label: "draft_questions", value: questionBanks.draftQuestions },
                { label: "rejected_questions", value: questionBanks.rejectedQuestions },
                { label: "archived_questions", value: questionBanks.archivedQuestions },
                { label: "ai_generated_questions", value: questionBanks.aiGeneratedQuestions },
                { label: "manual_questions", value: questionBanks.manualQuestions },
              ]}
            />
          </div>
        </>
      )}
    </section>
  );
}
