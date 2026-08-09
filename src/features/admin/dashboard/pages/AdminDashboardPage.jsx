import { useEffect, useMemo, useState } from "react";
import {
    BookOpen,
    ClipboardCheck,
    GraduationCap,
    Layers3,
    RotateCcw,
    Users,
} from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { adminDashboardService } from "@/services";
import { formatDateTime } from "@/shared/utils/formatters";
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

export function AdminDashboardPage() {
    const toast = useToast();
    const [selectedDays, setSelectedDays] = useState(30);
    const [appliedDays, setAppliedDays] = useState(30);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const rangeParams = useMemo(
        () => toIsoDateRange(selectedDays),
        [selectedDays],
    );

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
                const data =
                    await adminDashboardService.getOverview(rangeParams);
                if (!cancelled) {
                    setOverview(data);
                    setAppliedDays(selectedDays);
                }
            } catch (err) {
                if (!cancelled) {
                    const message =
                        err?.message || "Could not load admin dashboard.";
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
    const questions = overview?.questions || {};

    return (
        <section className="admin-page dashboard-page">
            <header className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">Admin Dashboard</h1>
                </div>

                <div
                    className="dashboard-range-controls"
                    aria-label="Dashboard date range"
                >
                    {RANGE_PRESETS.map((preset) => (
                        <button
                            key={preset.days}
                            type="button"
                            className={
                                selectedDays === preset.days
                                    ? "dashboard-range-controls__btn dashboard-range-controls__btn--active"
                                    : "dashboard-range-controls__btn"
                            }
                            onClick={() => setSelectedDays(preset.days)}
                            disabled={loading && selectedDays !== preset.days}
                        >
                            {preset.label}
                        </button>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<RotateCcw size={14} />}
                        onClick={loadOverview}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                </div>
            </header>

            {loading && !overview ? (
                <div className="admin-card admin-loading">
                    Loading admin dashboard...
                </div>
            ) : error && !overview ? (
                <div className="admin-card admin-error">
                    <p>{error}</p>
                    <Button variant="secondary" onClick={loadOverview}>
                        Try again
                    </Button>
                </div>
            ) : (
                <>
                    <div className="dashboard-meta-row">
                        <span>
                            Showing loaded activity from the last {appliedDays}{" "}
                            days
                        </span>
                        <span>
                            Range: {formatDateTime(overview?.range?.from)} -{" "}
                            {formatDateTime(overview?.range?.to)}
                        </span>
                        <span>
                            Generated: {formatDateTime(overview?.generatedAt)}
                        </span>
                        {loading ? (
                            <span className="dashboard-meta-row__updating">
                                Loading last {selectedDays} days...
                            </span>
                        ) : null}
                    </div>

                    {error && overview ? (
                        <div className="admin-card dashboard-inline-error">
                            <p>{error}</p>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={loadOverview}
                                disabled={loading}
                            >
                                Try again
                            </Button>
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
                            value={formatNumber(
                                questions.newInRange,
                            )}
                            description={`${formatNumber(questions.total)} total questions`}
                            icon={ClipboardCheck}
                            tone="slate"
                        />
                    </div>

                    <div className="dashboard-section-grid">
                        <DashboardSectionCard
                            title="Selected range activity"
                            items={[
                                { label: "new_users", value: users.newInRange },
                                {
                                    label: "new_courses",
                                    value: courses.newInRange,
                                },
                                {
                                    label: "new_classes",
                                    value: classes.newInRange,
                                },
                                {
                                    label: "new_modules",
                                    value: content.newModulesInRange,
                                },
                                {
                                    label: "new_lessons",
                                    value: content.newLessonsInRange,
                                },
                                {
                                    label: "new_questions",
                                    value: questions.newInRange,
                                },
                                {
                                    label: "reviewed_questions",
                                    value: questions.reviewedInRange,
                                },
                            ]}
                        />
                        <DashboardSectionCard
                            title="Operational attention"
                            items={[
                                {
                                    label: "pending_verify_users",
                                    value: users.pendingVerify,
                                },
                                { label: "banned_users", value: users.banned },
                                {
                                    label: "draft_courses",
                                    value: courses.draft,
                                },
                                {
                                    label: "inactive_courses",
                                    value: courses.inactive,
                                },
                                {
                                    label: "cancelled_classes",
                                    value: classes.cancelled,
                                },
                                {
                                    label: "draft_lessons",
                                    value: content.draftLessons,
                                },
                                {
                                    label: "pending_review_questions",
                                    value: questions.pendingReview,
                                },
                                {
                                    label: "rejected_questions",
                                    value: questions.rejected,
                                },
                            ]}
                        />
                        <DashboardSectionCard
                            title="Content health"
                            items={[
                                { label: "modules", value: content.modules },
                                {
                                    label: "published_lessons",
                                    value: content.publishedLessons,
                                },
                                {
                                    label: "draft_lessons",
                                    value: content.draftLessons,
                                },
                                {
                                    label: "inactive_lessons",
                                    value: content.inactiveLessons,
                                },
                            ]}
                        />
                        <DashboardSectionCard
                            title="User status"
                            items={[
                                { label: "active", value: users.active },
                                {
                                    label: "pending_verify",
                                    value: users.pendingVerify,
                                },
                                { label: "inactive", value: users.inactive },
                                { label: "banned", value: users.banned },
                            ]}
                        />
                        <DashboardSectionCard
                            title="Course status"
                            items={[
                                {
                                    label: "published",
                                    value: courses.published,
                                },
                                { label: "draft", value: courses.draft },
                                { label: "inactive", value: courses.inactive },
                            ]}
                        />
                        <DashboardSectionCard
                            title="Class status"
                            items={[
                                { label: "upcoming", value: classes.upcoming },
                                { label: "ongoing", value: classes.ongoing },
                                {
                                    label: "completed",
                                    value: classes.completed,
                                },
                                {
                                    label: "cancelled",
                                    value: classes.cancelled,
                                },
                            ]}
                        />
                        <DashboardSectionCard
                            title="Question review health"
                            items={[
                                {
                                    label: "approved_questions",
                                    value: questions.approved,
                                },
                                {
                                    label: "pending_review_questions",
                                    value: questions.pendingReview,
                                },
                                {
                                    label: "draft_questions",
                                    value: questions.draft,
                                },
                                {
                                    label: "rejected_questions",
                                    value: questions.rejected,
                                },
                                {
                                    label: "archived_questions",
                                    value: questions.archived,
                                },
                                {
                                    label: "ai_generated_questions",
                                    value: questions.aiGenerated,
                                },
                                {
                                    label: "manual_questions",
                                    value: questions.manual,
                                },
                            ]}
                        />
                    </div>
                </>
            )}
        </section>
    );
}
