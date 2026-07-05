import { useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardCheck, GraduationCap, Layers3, RotateCcw, Users } from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { adminDashboardService } from "@/services";
import { DashboardMetricCard } from "../components/DashboardMetricCard";
import { DashboardSectionCard } from "../components/DashboardSectionCard";
import { RecentActivityList } from "../components/RecentActivityList";
import "../../admin-shared.css";
import "../dashboard.css";

const RANGE_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
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
        if (!cancelled) setOverview(data);
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
  }, [rangeParams, toast]);

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
            Operational overview for users, learning content, classes, and system activity.
          </p>
        </div>

        <div className="dashboard-range-controls" aria-label="Dashboard date range">
          {RANGE_PRESETS.map((preset) => (
            <button
              key={preset.days}
              type="button"
              className={selectedDays === preset.days ? "dashboard-range-controls__btn dashboard-range-controls__btn--active" : "dashboard-range-controls__btn"}
              onClick={() => setSelectedDays(preset.days)}
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
            <span>Range: {formatDateTime(overview?.range?.from)} - {formatDateTime(overview?.range?.to)}</span>
            <span>Generated: {formatDateTime(overview?.generatedAt)}</span>
          </div>

          <div className="dashboard-metric-grid">
            <DashboardMetricCard
              title="Users"
              value={formatNumber(users.total)}
              description={`${formatNumber(users.newInRange)} new in range`}
              icon={Users}
              tone="blue"
            />
            <DashboardMetricCard
              title="Courses"
              value={formatNumber(courses.total)}
              description={`${formatNumber(courses.published)} published`}
              icon={GraduationCap}
              tone="green"
            />
            <DashboardMetricCard
              title="Classes"
              value={formatNumber(classes.total)}
              description={`${formatNumber(classes.ongoing)} ongoing`}
              icon={Layers3}
              tone="amber"
            />
            <DashboardMetricCard
              title="Lessons"
              value={formatNumber(content.lessons)}
              description={`${formatNumber(content.publishedLessons)} published lessons`}
              icon={BookOpen}
              tone="purple"
            />
            <DashboardMetricCard
              title="Question Banks"
              value={formatNumber(questionBanks.total)}
              description={`${formatNumber(questionBanks.questions)} questions`}
              icon={ClipboardCheck}
              tone="slate"
            />
          </div>

          <div className="dashboard-section-grid">
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
              ]}
            />
          </div>

          <section className="admin-card dashboard-revenue-placeholder">
            <div>
              <h2>Revenue analytics</h2>
              <p>Payment and revenue reporting will be added after the admin payment contract is finalized.</p>
            </div>
          </section>

          <RecentActivityList items={overview?.recentActivities || []} />
        </>
      )}
    </section>
  );
}
