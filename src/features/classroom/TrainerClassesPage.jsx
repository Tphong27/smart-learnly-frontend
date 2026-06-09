import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ExternalLink,
  Users,
} from "lucide-react";
import { KpiCard } from "@/shared/components/ui/KpiCard";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { ProgressBar } from "@/shared/components/ui/ProgressBar";
import { StatusBadge } from "@/shared/components/ui/StatusBadge";
import { DataState } from "@/shared/components/ui/DataState";
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from "@/shared/components/ui/ListControls";
import { getCurrentUser } from "@/services/api-client";
import { getClassesByTrainer } from "@/data/demo/classFlowRuntime";

const tabs = [
  { key: "running", label: "Running" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

function formatDate(value) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ClassCard({ item }) {
  return (
    <Link
      to={`/trainer/classes/${item.id}/workspace`}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {item.className || item.displayName || item.name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{item.courseTitle || item.course}</p>
          <p className="mt-1 text-sm text-slate-500">Trainer: {item.trainerName || item.trainer}</p>
        </div>

        <StatusBadge status={item.status} />
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <span className="flex items-center gap-2">
          <CalendarDays size={15} />
          {formatDate(item.startDate)} - {formatDate(item.endDate)}
        </span>

        <span className="flex items-center gap-2">
          <ExternalLink size={15} />
          {item.schedule || "Schedule not configured"}
        </span>
      </div>

      <div className="mt-5 space-y-4">
        <ProgressBar value={item.averageProgress} label="Average progress" />

        <div className="grid gap-3 md:grid-cols-3">
          <MiniMetric label="Trainees" value={item.maxTrainees || item.trainees} />
          <MiniMetric label="Avg. score" value={`${item.averageScore}%`} />
          <MiniMetric label="At risk" value={item.atRiskCount} />
        </div>

        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-800">
            Weakest topic: {item.weakestTopic}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function TrainerClassesPage() {
  const [activeTab, setActiveTab] = useState("running");
  const [filters, setFilters] = useState({
    keyword: "",
    course: "all",
    sort: "schedule",
  });

  const user = getCurrentUser();
  const trainerId = user?.id || 'trainer-an';
  const classes = useMemo(() => getClassesByTrainer(trainerId), [trainerId]);
  const isLoading = false;
  const error = null;

  const classGroups = useMemo(() => {
    return {
      running: classes.filter((item) => item.status === "running"),
      upcoming: classes.filter((item) => item.status === "upcoming"),
      completed: classes.filter((item) => item.status === "completed"),
    };
  }, [classes]);

  const runningClasses = classGroups.running;
  const upcomingClasses = classGroups.upcoming;
  const completedClasses = classGroups.completed;

  const courseOptions = useMemo(() => {
    return ["all", ...new Set(classes.map((item) => item.courseTitle || item.course).filter(Boolean))];
  }, [classes]);

  const filteredClasses = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();

    return (classGroups[activeTab] || [])
      .filter((item) => {
        const matchesKeyword = [
          item.className,
          item.displayName,
          item.name,
          item.courseTitle,
          item.course,
          item.schedule,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
        const matchesCourse =
          filters.course === "all" || (item.courseTitle || item.course) === filters.course;

        return matchesKeyword && matchesCourse;
      })
      .sort((a, b) => {
        if (filters.sort === "progress") return Number(b.averageProgress || 0) - Number(a.averageProgress || 0);
        if (filters.sort === "name") {
          return (a.className || a.displayName || a.name || "").localeCompare(
            b.className || b.displayName || b.name || "",
          );
        }
        return new Date(a.startDate || 0) - new Date(b.startDate || 0);
      });
  }, [activeTab, classGroups, filters]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      keyword: "",
      course: "all",
      sort: "schedule",
    });
  };

  const hasActiveFilters =
    filters.keyword || filters.course !== "all" || filters.sort !== "schedule";

  const totalAtRisk = classes.reduce(
    (sum, item) => sum + (item.atRiskCount || 0),
    0,
  );

  const header = (
    <PageHeader
      title="Trainer Classes"
      description="Monitor assigned classes, progress, weak topics, and trainees who need intervention."
    />
  );

  if (isLoading) {
    return (
      <section>
        {header}
        <DataState
          type="loading"
          title="Loading classes"
          description="Fetching assigned class data."
        />
      </section>
    );
  }

  if (error) {
    return (
      <section>
        {header}
        <DataState
          type="error"
          title="Classes unavailable"
          description={error}
        />
      </section>
    );
  }

  if (classes.length === 0) {
    return (
      <section>
        {header}
        <DataState
          type="empty"
          title="No assigned classes"
          description="There are no classes assigned to this trainer yet."
        />
      </section>
    );
  }

  return (
    <section>
      {header}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard title="Assigned Classes" value={classes.length} icon={Users} />
        <KpiCard
          title="Running Classes"
          value={runningClasses.length}
          icon={BarChart3}
        />
        <KpiCard
          title="At-risk Trainees"
          value={totalAtRisk}
          icon={AlertTriangle}
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const count =
            tab.key === "running"
              ? runningClasses.length
              : tab.key === "upcoming"
                ? upcomingClasses.length
                : completedClasses.length;

          return (
            <button
              key={tab.key}
              type="button"
              className={
                activeTab === tab.key
                  ? "demo-primary-action"
                  : "demo-secondary-action"
              }
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      <FilterToolbar>
        <SearchBox
          value={filters.keyword}
          placeholder="Search class or schedule"
          ariaLabel="Search trainer classes"
          onChange={(value) => updateFilter("keyword", value)}
        />

        <SelectFilter
          value={filters.course}
          onChange={(value) => updateFilter("course", value)}
          ariaLabel="Filter trainer classes by course"
          options={courseOptions.map((course) => ({
            value: course,
            label: course === "all" ? "All courses" : course,
          }))}
        />

        <SelectFilter
          value={filters.sort}
          onChange={(value) => updateFilter("sort", value)}
          ariaLabel="Sort trainer classes"
          options={[
            { value: "schedule", label: "Upcoming schedule" },
            { value: "progress", label: "Progress high to low" },
            { value: "name", label: "Name A-Z" },
          ]}
        />

        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      {filteredClasses.length === 0 ? (
        <DataState
          type="empty"
          title={`No ${activeTab} classes`}
          description="Classes will appear here when their status matches this tab and the current filters."
          action={
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredClasses.map((item) => (
            <ClassCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
